import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:inventory_app/core/api/api_client.dart';
import 'package:inventory_app/core/offline/local_database.dart';
import 'package:inventory_app/core/offline/sync_service.dart';

void main() {
  late LocalDatabase db;

  setUp(() {
    db = LocalDatabase.forTesting(NativeDatabase.memory());
  });

  tearDown(() async {
    await db.close();
  });

  test('enqueue adds a PENDING entry with a unique idempotency key', () async {
    final api = ApiClient(baseUrl: 'http://localhost:1');
    final sync = SyncService(db, api);

    await sync.enqueue(
      method: 'POST',
      path: '/inventory/adjustments',
      payload: {'productId': 'p1', 'quantity': 5},
      entityType: 'inventory_adjustment',
    );
    await sync.enqueue(
      method: 'POST',
      path: '/inventory/adjustments',
      payload: {'productId': 'p2', 'quantity': 3},
      entityType: 'inventory_adjustment',
    );

    final rows = await db.select(db.syncQueueEntries).get();
    expect(rows, hasLength(2));
    expect(rows.every((r) => r.status == 'PENDING'), isTrue);
    expect(rows[0].idempotencyKey, isNot(equals(rows[1].idempotencyKey)));
  });

  test('syncPending marks entries SYNCED on success and stops the batch on the first 409 conflict', () async {
    final dio = Dio(BaseOptions(baseUrl: 'http://localhost'));
    var callCount = 0;
    dio.httpClientAdapter = _FakeAdapter((options) {
      callCount++;
      if (callCount == 2) {
        return _FakeAdapter.response(409, {'error': 'INSUFFICIENT_STOCK'});
      }
      return _FakeAdapter.response(200, {'ok': true});
    });

    final api = ApiClient(baseUrl: 'http://localhost');
    api.dio.httpClientAdapter = dio.httpClientAdapter;
    final sync = SyncService(db, api);

    await sync.enqueue(method: 'POST', path: '/a', payload: {}, entityType: 'x');
    await sync.enqueue(method: 'POST', path: '/b', payload: {}, entityType: 'x');
    await sync.enqueue(method: 'POST', path: '/c', payload: {}, entityType: 'x');

    final result = await sync.syncPending();

    expect(result.succeeded, 1);
    expect(result.failed, 1);
    // The third entry is never attempted because the batch stops at the conflict.
    expect(result.remaining, 1);

    final rows = await db.select(db.syncQueueEntries).get();
    expect(rows[0].status, 'SYNCED');
    expect(rows[1].status, 'FAILED');
    expect(rows[2].status, 'PENDING');
  });
}

class _FakeAdapter implements HttpClientAdapter {
  final ResponseBody Function(RequestOptions) _handler;
  _FakeAdapter(this._handler);

  static ResponseBody response(int statusCode, Map<String, dynamic> data) {
    return ResponseBody.fromString(
      jsonEncode(data),
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final body = _handler(options);
    if (body.statusCode >= 400) {
      throw DioException(
        requestOptions: options,
        response: Response(requestOptions: options, statusCode: body.statusCode, data: {'error': 'CONFLICT'}),
        type: DioExceptionType.badResponse,
      );
    }
    return body;
  }
}
