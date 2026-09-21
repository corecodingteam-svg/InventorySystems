import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_providers.dart';

/// The current user's granted permission codes — fetched once per session
/// and used to hide/disable actions the user can't perform (e.g. the
/// Approve button on a purchase order), mirroring the server-side
/// PermissionsGuard checks rather than relying on a 403 after the fact.
final currentUserPermissionsProvider = FutureProvider<Set<String>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/auth/me/permissions');
  final list = (response.data as Map<String, dynamic>)['permissions'] as List;
  return list.cast<String>().toSet();
});

extension PermissionCheck on WidgetRef {
  /// Best-effort synchronous check: true only once permissions have loaded
  /// and include [code]. While loading or on error, returns false — an
  /// action button stays hidden rather than briefly flashing visible and
  /// then failing server-side; the server remains the actual authority.
  /// Uses `watch` (not `read`) so the caller rebuilds once permissions
  /// finish loading instead of staying stuck on the "hidden" state.
  bool hasPermission(String code) {
    final async = watch(currentUserPermissionsProvider);
    return async.maybeWhen(data: (perms) => perms.contains(code), orElse: () => false);
  }
}
