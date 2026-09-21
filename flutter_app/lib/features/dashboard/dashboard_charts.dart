import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// "Stock Health" donut — in-stock vs. low-stock vs. out-of-stock product
/// counts, derived from the dashboard summary. Hand-drawn with
/// CustomPainter rather than fl_chart: fl_chart's PieChart repeatedly
/// produced a "TransformLayer constructed with an invalid matrix" paint
/// error on this screen (even at a fixed 120x120 size, and even after
/// removing the other fl_chart usages that first triggered it), silently
/// breaking every widget painted after it in the tree. A plain Canvas arc
/// has no such failure mode.
class StockHealthDonutChart extends StatelessWidget {
  final int inStock;
  final int lowStock;
  final int outOfStock;

  const StockHealthDonutChart({super.key, required this.inStock, required this.lowStock, required this.outOfStock});

  @override
  Widget build(BuildContext context) {
    final total = inStock + lowStock + outOfStock;
    final segments = [
      (label: 'In Stock', count: inStock, color: AppColors.success),
      (label: 'Low Stock', count: lowStock, color: AppColors.warning),
      (label: 'Out of Stock', count: outOfStock, color: AppColors.error),
    ].where((s) => s.count > 0).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Stock Health', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (total == 0)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: Text('No stock data yet.')),
              )
            else
              Row(
                children: [
                  SizedBox(
                    height: 120,
                    width: 120,
                    child: CustomPaint(painter: _DonutPainter(segments: segments, total: total)),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: segments
                          .map((s) => Row(mainAxisSize: MainAxisSize.min, children: [
                                Container(width: 10, height: 10, decoration: BoxDecoration(color: s.color, borderRadius: BorderRadius.circular(2))),
                                const SizedBox(width: 4),
                                Text('${s.label} (${s.count})', style: Theme.of(context).textTheme.bodySmall),
                              ]))
                          .toList(),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  final List<({String label, int count, Color color})> segments;
  final int total;

  _DonutPainter({required this.segments, required this.total});

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2;
    const strokeWidth = 18.0;
    const gapRadians = 0.03;

    var startAngle = -3.14159265 / 2;
    for (final s in segments) {
      final sweep = (s.count / total) * 2 * 3.14159265;
      final paint = Paint()
        ..color = s.color
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.butt;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius - strokeWidth / 2),
        startAngle + gapRadians / 2,
        (sweep - gapRadians).clamp(0, sweep),
        false,
        paint,
      );
      startAngle += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) =>
      oldDelegate.segments != segments || oldDelegate.total != total;
}

/// Top products by revenue (from actual dispatches — see
/// backend docs/reports.md), rendered as a horizontal bar list.
class TopProductsBarChart extends StatelessWidget {
  final List<dynamic> rows;

  const TopProductsBarChart({super.key, required this.rows});

  @override
  Widget build(BuildContext context) {
    final top = rows.take(5).toList();
    final maxRevenue = top.isEmpty
        ? 1.0
        : top.map((r) => (r['total_revenue'] as num?)?.toDouble() ?? 0).reduce((a, b) => a > b ? a : b).clamp(1, double.infinity);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Top Products by Revenue', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (top.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: Text('No sales dispatched yet.')),
              )
            else
              ...top.map((r) {
                final name = (r['product_name'] as String?) ?? (r['sku'] as String?) ?? '—';
                final revenue = (r['total_revenue'] as num?)?.toDouble() ?? 0;
                final fraction = (revenue / maxRevenue).clamp(0.0, 1.0);
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text(name, style: Theme.of(context).textTheme.bodySmall, overflow: TextOverflow.ellipsis)),
                          Text(revenue.toStringAsFixed(2), style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: fraction,
                          minHeight: 8,
                          backgroundColor: AppColors.borderLight,
                          valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                        ),
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

/// Low-stock products list — reuses the same report data the Reports hub
/// shows, surfaced here so the dashboard itself is actionable.
class LowStockList extends StatelessWidget {
  final List<dynamic> rows;

  const LowStockList({super.key, required this.rows});

  @override
  Widget build(BuildContext context) {
    final top = rows.take(5).toList();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Products Needing Reorder', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (top.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('Nothing below its reorder point right now.'),
              )
            else
              ...top.map((r) {
                final sku = (r['sku'] as String?) ?? '';
                final name = (r['name'] as String?) ?? '';
                final onHand = (r['onHand'] as num?) ?? 0;
                final reorderPoint = (r['reorderPoint'] as num?) ?? 0;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.warning, shape: BoxShape.circle)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text('$sku — $name', style: Theme.of(context).textTheme.bodyMedium, overflow: TextOverflow.ellipsis),
                      ),
                      Text('$onHand / $reorderPoint', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.warning, fontWeight: FontWeight.w700)),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
