import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../features/auth/auth_providers.dart';

class NavItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String route;
  const NavItem(this.label, this.icon, this.route, {IconData? activeIcon}) : activeIcon = activeIcon ?? icon;
}

const navItems = [
  NavItem('Dashboard', Icons.dashboard_outlined, '/dashboard', activeIcon: Icons.dashboard_rounded),
  NavItem('Products', Icons.inventory_2_outlined, '/inventory', activeIcon: Icons.inventory_2_rounded),
  NavItem('Stock', Icons.stacked_line_chart_outlined, '/stock', activeIcon: Icons.stacked_line_chart_rounded),
  NavItem('Stock Ledger', Icons.receipt_long_outlined, '/stock-ledger', activeIcon: Icons.receipt_long_rounded),
  NavItem('Warehouses', Icons.warehouse_outlined, '/warehouses', activeIcon: Icons.warehouse_rounded),
  NavItem('Stock Counts', Icons.fact_check_outlined, '/stock-counts', activeIcon: Icons.fact_check_rounded),
  NavItem('Suppliers', Icons.local_shipping_outlined, '/purchasing', activeIcon: Icons.local_shipping_rounded),
  NavItem('Purchase Orders', Icons.shopping_cart_outlined, '/purchase-orders', activeIcon: Icons.shopping_cart_rounded),
  NavItem('Customers', Icons.people_outline, '/sales', activeIcon: Icons.people_rounded),
  NavItem('Sales Orders', Icons.point_of_sale_outlined, '/sales-orders', activeIcon: Icons.point_of_sale_rounded),
  NavItem('POS', Icons.storefront_outlined, '/pos', activeIcon: Icons.storefront_rounded),
  NavItem('Reports', Icons.bar_chart_outlined, '/reports', activeIcon: Icons.bar_chart_rounded),
  NavItem('Settings', Icons.settings_outlined, '/settings', activeIcon: Icons.settings_rounded),
];

const _bottomNavRoutes = ['/dashboard', '/inventory', '/sales-orders', '/reports'];

bool _isActive(NavItem item, String path) => path.startsWith(item.route);

/// Adaptive shell — sidebar (desktop/wide), navigation rail (tablet), drawer
/// + bottom nav (mobile). Visual language (dark slate sidebar, purple
/// accent bar on the active item, pill bottom-nav highlight) matches the
/// sibling MotiPaper admin apps for a consistent product family look —
/// see D:\motipaper\mobile_admin\lib\core\widgets\shell_scaffold.dart.
class AppShell extends ConsumerWidget {
  final Widget child;
  final String currentRoute;

  const AppShell({super.key, required this.child, required this.currentRoute});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;

    if (AppBreakpoints.isDesktop(width)) {
      return Scaffold(
        body: Row(children: [
          _Sidebar(currentRoute: currentRoute, extended: width >= 1600),
          const VerticalDivider(width: 1, thickness: 1, color: AppColors.border),
          Expanded(child: child),
        ]),
      );
    }

    if (AppBreakpoints.isTablet(width)) {
      return Scaffold(
        body: Row(children: [
          _NavRail(currentRoute: currentRoute),
          const VerticalDivider(width: 1, thickness: 1, color: AppColors.border),
          Expanded(child: child),
        ]),
      );
    }

    // Mobile: dark AppBar + drawer + pill-style bottom nav.
    final activeLabel = navItems.firstWhere((n) => _isActive(n, currentRoute), orElse: () => navItems.first).label;
    final bottomItems = navItems.where((n) => _bottomNavRoutes.contains(n.route)).toList();
    final selectedBottomIndex = bottomItems.indexWhere((n) => _isActive(n, currentRoute));

    return Scaffold(
      appBar: AppBar(title: Text(activeLabel)),
      drawer: _AppDrawer(currentRoute: currentRoute),
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: const Border(top: BorderSide(color: AppColors.border, width: 1)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, -4))],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(children: [
              for (final entry in bottomItems.asMap().entries)
                Expanded(
                  child: _BottomNavButton(
                    item: entry.value,
                    active: entry.key == selectedBottomIndex,
                    onTap: () => context.go(entry.value.route),
                  ),
                ),
            ]),
          ),
        ),
      ),
    );
  }
}

class _BottomNavButton extends StatelessWidget {
  final NavItem item;
  final bool active;
  final VoidCallback onTap;
  const _BottomNavButton({required this.item, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: active ? AppColors.primaryLight : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Icon(active ? item.activeIcon : item.icon, color: active ? AppColors.primary : AppColors.textMuted, size: 22),
        ),
        const SizedBox(height: 2),
        Text(
          item.label,
          style: TextStyle(fontSize: 10, fontWeight: active ? FontWeight.w700 : FontWeight.w500, color: active ? AppColors.primary : AppColors.textMuted),
        ),
      ]),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.inventory_2_rounded, color: Colors.white, size: 22),
        ),
        const SizedBox(width: 12),
        const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Inventory Platform', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15, letterSpacing: -0.3)),
          Text('Admin Panel', style: TextStyle(color: AppColors.sidebarText, fontSize: 11)),
        ]),
      ]),
    );
  }
}

class _LogoutTile extends ConsumerWidget {
  const _LogoutTile();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      dense: true,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      leading: const Icon(Icons.logout_rounded, color: AppColors.sidebarText, size: 20),
      title: const Text('Sign Out', style: TextStyle(color: AppColors.sidebarText, fontSize: 13)),
      onTap: () => ref.read(authControllerProvider.notifier).logout(),
    );
  }
}

class _AppDrawer extends StatelessWidget {
  final String currentRoute;
  const _AppDrawer({required this.currentRoute});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppColors.sidebarBg,
      child: SafeArea(
        child: Column(children: [
          const _BrandHeader(),
          const Divider(color: Colors.white12, height: 1),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: navItems.map((item) => _NavListTile(item: item, active: _isActive(item, currentRoute))).toList(),
            ),
          ),
          const Divider(color: Colors.white12, height: 1),
          const _LogoutTile(),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}

class _NavListTile extends StatelessWidget {
  final NavItem item;
  final bool active;
  const _NavListTile({required this.item, required this.active});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: active ? AppColors.primary.withValues(alpha: 0.25) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        dense: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        leading: Icon(active ? item.activeIcon : item.icon, color: active ? Colors.white : AppColors.sidebarText, size: 20),
        title: Text(item.label, style: TextStyle(color: active ? Colors.white : AppColors.sidebarText, fontWeight: active ? FontWeight.w700 : FontWeight.normal, fontSize: 13)),
        trailing: active ? Container(width: 4, height: 20, decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(2))) : null,
        onTap: () {
          Navigator.of(context).maybePop();
          context.go(item.route);
        },
      ),
    );
  }
}

class _Sidebar extends StatelessWidget {
  final String currentRoute;
  final bool extended;
  const _Sidebar({required this.currentRoute, required this.extended});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: extended ? 260 : 240,
      color: AppColors.sidebarBg,
      child: SafeArea(
        child: Column(children: [
          const _BrandHeader(),
          const Divider(color: Colors.white12, height: 1),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: navItems.map((item) => _NavListTile(item: item, active: _isActive(item, currentRoute))).toList(),
            ),
          ),
          const Divider(color: Colors.white12, height: 1),
          const Padding(padding: EdgeInsets.all(4), child: _LogoutTile()),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}

class _NavRail extends ConsumerWidget {
  final String currentRoute;
  const _NavRail({required this.currentRoute});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final idx = navItems.indexWhere((n) => _isActive(n, currentRoute));
    return Container(
      color: AppColors.sidebarBg,
      child: SafeArea(
        child: NavigationRail(
          backgroundColor: AppColors.sidebarBg,
          selectedIndex: idx < 0 ? 0 : idx,
          onDestinationSelected: (i) => context.go(navItems[i].route),
          labelType: NavigationRailLabelType.all,
          selectedIconTheme: const IconThemeData(color: Colors.white, size: 22),
          unselectedIconTheme: const IconThemeData(color: AppColors.sidebarText, size: 22),
          selectedLabelTextStyle: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
          unselectedLabelTextStyle: const TextStyle(color: AppColors.sidebarText, fontSize: 10),
          leading: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.inventory_2_rounded, color: Colors.white, size: 20),
            ),
          ),
          trailing: Expanded(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: IconButton(
                  icon: const Icon(Icons.logout_rounded, color: AppColors.sidebarText),
                  onPressed: () => ref.read(authControllerProvider.notifier).logout(),
                ),
              ),
            ),
          ),
          destinations: navItems.map((i) => NavigationRailDestination(icon: Icon(i.icon), selectedIcon: Icon(i.activeIcon), label: Text(i.label))).toList(),
        ),
      ),
    );
  }
}
