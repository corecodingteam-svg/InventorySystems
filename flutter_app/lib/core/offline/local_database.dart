import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'local_database.g.dart';

/// One row per offline-queued write, in the order it should be replayed.
/// See docs/flutter.md "Offline sync" for the retry/conflict model.
class SyncQueueEntries extends Table {
  IntColumn get id => integer().autoIncrement()();
  /// Sent as the `Idempotency-Key` header on replay — see backend
  /// docs/testing.md — so a retried replay after a partial network failure
  /// can never apply the same operation twice server-side.
  TextColumn get idempotencyKey => text()();
  TextColumn get method => text()(); // 'POST', 'PATCH', ...
  TextColumn get path => text()(); // e.g. '/inventory/adjustments'
  TextColumn get payloadJson => text()();
  TextColumn get entityType => text()(); // for UI grouping/conflict display
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  // PENDING, SYNCING, SYNCED, FAILED
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  TextColumn get lastError => text().nullable()();
}

@DriftDatabase(tables: [SyncQueueEntries])
class LocalDatabase extends _$LocalDatabase {
  LocalDatabase() : super(_openConnection());
  LocalDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 1;
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'inventory_offline.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
