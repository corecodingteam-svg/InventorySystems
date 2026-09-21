import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/list_states.dart';
import '../../shared/widgets/stat_tile.dart';
import '../../shared/widgets/status_badge.dart';
import '../auth/auth_providers.dart';
import '../reports/reports_repository.dart';
import 'dashboard_charts.dart';
import 'dashboard_providers.dart';
import 'dashboard_sales_activity.dart';
import 'dashboard_sales_orders_table.dart';
import 'dashboard_summary_model.dart';

/// Main dashboard — real data only, no fabricated trends/history. Every
/// section is a plain Column entry inside one SingleChildScrollView; no
/// nested viewports (GridView/Wrap-of-fixed-size-tiles) and no
/// IntrinsicHeight around chart widgets, both of which previously produced
/// broken/garbled layout on this screen.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(dashboardSummaryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(dashboardSummaryProvider),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: summary.when(
        loading: () => const AppLoadingSkeleton(rows: 4),
        error: (err, _) => AppErrorState(
          message: 'Failed to load dashboard summary.',
          onRetry: () => ref.invalidate(dashboardSummaryProvider),
        ),
        data: (s) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardSummaryProvider),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SectionHeader('Sales Activity'),
                const SizedBox(height: 12),
                SalesActivityRow(
                  pendingSalesOrders: s.pendingSalesOrders,
                  pendingPurchaseOrders: s.pendingPurchaseOrders,
                  inStock: s.totalProducts - s.lowStockCount - s.outOfStockCount,
                  totalProducts: s.totalProducts,
                ),
                const SizedBox(height: 24),
                const _SectionHeader('Total Product Details'),
                const SizedBox(height: 12),
                _StatGrid(summary: s),
                const SizedBox(height: 24),
                const _SectionHeader('Analytics'),
                const SizedBox(height: 12),
                _AnalyticsSection(summary: s),
                const SizedBox(height: 24),
                const RecentSalesOrdersTable(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700));
  }
}

/// Fixed-count responsive grid of KPI tiles. Deliberately not GridView (a
/// shrink-wrapped sliver viewport nested inside this screen's own scroll
/// view previously corrupted sibling paint offsets) — a plain Wrap of
/// explicitly-sized boxes has no viewport-in-viewport interaction.
class _StatGrid extends StatelessWidget {
  final DashboardSummary summary;
  const _StatGrid({required this.summary});

  @override
  Widget build(BuildContext context) {
    final tiles = [
      StatTile(label: 'Total Products', value: '${summary.totalProducts}', icon: Icons.inventory_2_outlined),
      StatTile(label: 'Warehouses', value: '${summary.totalWarehouses}', icon: Icons.warehouse_outlined),
      StatTile(
        label: 'Inventory Value',
        value: summary.inventoryValue.toStringAsFixed(2),
        icon: Icons.payments_outlined,
        status: SemanticStatus.info,
      ),
      StatTile(
        label: 'Low Stock Products',
        value: '${summary.lowStockCount}',
        icon: Icons.trending_down,
        status: summary.lowStockCount > 0 ? SemanticStatus.warning : SemanticStatus.success,
      ),
      StatTile(
        label: 'Out of Stock Slots',
        value: '${summary.outOfStockCount}',
        icon: Icons.remove_shopping_cart_outlined,
        status: summary.outOfStockCount > 0 ? SemanticStatus.error : SemanticStatus.success,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final columns = width >= AppBreakpoints.tablet
            ? 4
            : width >= AppBreakpoints.mobile
                ? 2
                : 1;
        const spacing = 12.0;
        final tileWidth = (width - spacing * (columns - 1)) / columns;
        final tileHeight = tileWidth / (columns == 1 ? 2.4 : 1.5);

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final tile in tiles) SizedBox(width: tileWidth, height: tileHeight, child: tile),
          ],
        );
      },
    );
  }
}

/// Stock health + top-products-by-revenue + low-stock alerts. Fixed-height
/// boxes throughout (no IntrinsicHeight) — see StockHealthDonutChart's own
/// docs for why that matters here.
class _AnalyticsSection extends ConsumerWidget {
  final DashboardSummary summary;
  const _AnalyticsSection({required this.summary});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final salesByProduct = ref.watch(salesByProductReportProvider);
    final lowStock = ref.watch(lowStockReportProvider);
    final isDesktop = MediaQuery.of(context).size.width >= AppBreakpoints.tablet;

    final donut = StockHealthDonutChart(
      inStock: summary.totalProducts - summary.lowStockCount - summary.outOfStockCount,
      lowStock: summary.lowStockCount,
      outOfStock: summary.outOfStockCount,
    );

    final barChart = salesByProduct.when(
      loading: () => const _AnalyticsCardPlaceholder(),
      error: (_, __) => const _AnalyticsCardError('Failed to load sales data.'),
      data: (rows) => TopProductsBarChart(rows: rows),
    );

    final lowStockList = lowStock.when(
      loading: () => const _AnalyticsCardPlaceholder(),
      error: (_, __) => const _AnalyticsCardError('Failed to load low-stock data.'),
      data: (rows) => LowStockList(rows: rows),
    );

    if (!isDesktop) {
      return Column(
        children: [
          donut,
          const SizedBox(height: 12),
          barChart,
          const SizedBox(height: 12),
          lowStockList,
        ],
      );
    }

    return Column(
      children: [
        SizedBox(
          height: 260,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: donut),
              const SizedBox(width: 12),
              Expanded(child: barChart),
            ],
          ),
        ),
        const SizedBox(height: 12),
        lowStockList,
      ],
    );
  }
}

class _AnalyticsCardPlaceholder extends StatelessWidget {
  const _AnalyticsCardPlaceholder();

  @override
  Widget build(BuildContext context) {
    return const Card(child: Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())));
  }
}

class _AnalyticsCardError extends StatelessWidget {
  final String message;
  const _AnalyticsCardError(this.message);

  @override
  Widget build(BuildContext context) {
    return Card(child: Padding(padding: const EdgeInsets.all(24), child: Text(message)));
  }
}
