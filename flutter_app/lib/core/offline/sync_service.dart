import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../api/api_client.dart';
import 'local_database.dart';

/// Replays queued offline writes against the API in the order they were
/// created. Never blind-overwrites: a request that comes back 409 (a real
/// conflict, e.g. INSUFFICIENT_STOCK from the inventory engine racing
/// against something that happened online) is left FAILED for a human to
/// resolve, not silently retried or discarded. See docs/flutter.md.
class SyncService {
  final LocalDatabase _db;
  final ApiClient _api;
  final _uuid = const Uuid();

  SyncService(this._db, this._api);

  /// Queues a write to be sent when online. Call this instead of hitting
  /// the API directly from a mobile warehouse-operation screen when
  /// connectivity is uncertain.
  Future<void> enqueue({
    required String method,
    required String path,
    required Map<String, dynamic> payload,
    required String entityType,
  }) async {
    await _db.into(_db.syncQueueEntries).insert(
          SyncQueueEntriesCompanion.insert(
            idempotencyKey: _uuid.v4(),
            method: method,
            path: path,
            payloadJson: jsonEncode(payload),
            entityType: entityType,
          ),
        );
  }

  /// Processes every PENDING (and previously-FAILED, so a fixed connectivity
  /// issue doesn't leave entries stuck forever) entry in creation order.
  /// Stops at the first entry still failing after this pass so ordering is
  /// preserved — later entries for the same entity should not apply ahead
  /// of an earlier one that hasn't succeeded yet.
  Future<SyncResult> syncPending() async {
    final entries = await (_db.select(_db.syncQueueEntries)
          ..where((t) => t.status.isNotValue('SYNCED'))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();

    var succeeded = 0;
    var failed = 0;

    for (final entry in entries) {
      await (_db.update(_db.syncQueueEntries)..where((t) => t.id.equals(entry.id)))
          .write(const SyncQueueEntriesCompanion(status: Value('SYNCING')));

      try {
        final payload = jsonDecode(entry.payloadJson) as Map<String, dynamic>;
        await _api.dio.request(
          entry.path,
          data: payload,
          options: Options(method: entry.method, headers: {'Idempotency-Key': entry.idempotencyKey}),
        );
        await (_db.update(_db.syncQueueEntries)..where((t) => t.id.equals(entry.id)))
            .write(const SyncQueueEntriesCompanion(status: Value('SYNCED')));
        succeeded++;
      } on DioException catch (e) {
        final isConflict = e.response?.statusCode == 409;
        await (_db.update(_db.syncQueueEntries)..where((t) => t.id.equals(entry.id))).write(
          SyncQueueEntriesCompanion(
            status: const Value('FAILED'),
            retryCount: Value(entry.retryCount + 1),
            lastError: Value(e.response?.data?.toString() ?? e.message ?? 'Unknown error'),
          ),
        );
        failed++;
        // A genuine business conflict (stock no longer available, etc.)
        // stops the batch here rather than reordering around it.
        if (isConflict) break;
      }
    }

    return SyncResult(succeeded: succeeded, failed: failed, remaining: entries.length - succeeded - failed);
  }

  Stream<int> watchPendingCount() {
    final query = _db.select(_db.syncQueueEntries)..where((t) => t.status.isNotValue('SYNCED'));
    return query.watch().map((rows) => rows.length);
  }
}

class SyncResult {
  final int succeeded;
  final int failed;
  final int remaining;
  const SyncResult({required this.succeeded, required this.failed, required this.remaining});
}
