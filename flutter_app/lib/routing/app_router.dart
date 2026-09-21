import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_providers.dart';
import '../features/auth/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/products/products_screen.dart';
import '../features/suppliers/suppliers_screen.dart';
import '../features/customers/customers_screen.dart';
import '../features/warehouses/warehouses_screen.dart';
import '../features/inventory/stock_screen.dart';
import '../features/inventory/stock_ledger_screen.dart';
import '../features/stock_counts/stock_counts_screen.dart';
import '../features/purchasing/purchase_orders_screen.dart';
import '../features/sales_orders/sales_orders_screen.dart';
import '../features/pos/pos_registers_screen.dart';
import '../features/reports/reports_hub_screen.dart';
import '../features/settings/settings_hub_screen.dart';
import '../shared/widgets/app_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);

  return GoRouter(
    // Start on /login rather than a protected route: auth status is
    // AuthStatus.unknown until the secure-storage check resolves, and
    // defaulting to a protected shell would briefly render it before that
    // check completes. Once restore() resolves to authenticated, the
    // refreshListenable below re-evaluates this redirect and moves on.
    initialLocation: '/login',
    redirect: (context, state) {
      final loggingIn = state.matchedLocation == '/login';
      if (auth.status == AuthStatus.unknown) return loggingIn ? null : '/login';
      if (auth.status == AuthStatus.unauthenticated && !loggingIn) return '/login';
      if (auth.status == AuthStatus.authenticated && loggingIn) return '/dashboard';
      return null;
    },
    refreshListenable: _AuthListenable(ref),
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(currentRoute: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
          GoRoute(path: '/inventory', builder: (context, state) => const ProductsScreen()),
          GoRoute(path: '/stock', builder: (context, state) => const StockScreen()),
          GoRoute(path: '/stock-ledger', builder: (context, state) => const StockLedgerScreen()),
          GoRoute(path: '/warehouses', builder: (context, state) => const WarehousesScreen()),
          GoRoute(path: '/stock-counts', builder: (context, state) => const StockCountsScreen()),
          GoRoute(path: '/purchasing', builder: (context, state) => const SuppliersScreen()),
          GoRoute(path: '/purchase-orders', builder: (context, state) => const PurchaseOrdersScreen()),
          GoRoute(path: '/sales', builder: (context, state) => const CustomersScreen()),
          GoRoute(path: '/sales-orders', builder: (context, state) => const SalesOrdersScreen()),
          GoRoute(path: '/pos', builder: (context, state) => const PosRegistersScreen()),
          GoRoute(path: '/reports', builder: (context, state) => const ReportsHubScreen()),
          GoRoute(path: '/settings', builder: (context, state) => const SettingsHubScreen()),
        ],
      ),
    ],
  );
});

class _AuthListenable extends ChangeNotifierLike {
  _AuthListenable(Ref ref) {
    ref.listen(authControllerProvider, (_, __) => notifyListeners());
  }
}

// Minimal Listenable adapter so GoRouter can react to Riverpod auth changes
// without pulling in an extra package.
// ignore: prefer_mixin
class ChangeNotifierLike extends Listenable {
  final List<VoidCallback> _listeners = [];
  @override
  void addListener(VoidCallback listener) => _listeners.add(listener);
  @override
  void removeListener(VoidCallback listener) => _listeners.remove(listener);
  void notifyListeners() {
    for (final l in List<VoidCallback>.from(_listeners)) {
      l();
    }
  }
}
