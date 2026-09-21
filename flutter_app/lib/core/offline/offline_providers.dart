import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_providers.dart';
import 'local_database.dart';
import 'sync_service.dart';

final localDatabaseProvider = Provider<LocalDatabase>((ref) {
  final db = LocalDatabase();
  ref.onDispose(db.close);
  return db;
});

final syncServiceProvider = Provider<SyncService>((ref) {
  return SyncService(ref.watch(localDatabaseProvider), ref.watch(apiClientProvider));
});

final pendingSyncCountProvider = StreamProvider.autoDispose<int>((ref) {
  return ref.watch(syncServiceProvider).watchPendingCount();
});
