import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Hero KPI row at the top of the dashboard — three large cards, each with
/// a big number and a compact visual (bar/donut). Numbers are all real
/// (from the dashboard summary), not fabricated trend data: unlike some
/// reference dashboards, we don't have historical snapshots to compute a
/// day-over-day "+3.4%" change from, so that's deliberately left out
/// rather than invented.
class SalesActivityRow extends StatelessWidget {
  final int pendingSalesOrders;
  final int pendingPurchaseOrders;
  final int inStock;
  final int totalProducts;

  const SalesActivityRow({
    super.key,
    required this.pendingSalesOrders,
    required this.pendingPurchaseOrders,
    required this.inStock,
    required this.totalProducts,
  });

  @override
  Widget build(BuildContext context) {
    final stockHealthPct = totalProducts == 0 ? 0.0 : (inStock / totalProducts * 100).clamp(0.0, 100.0);

    return LayoutBuilder(
      builder: (context, constraints) {
        final narrow = constraints.maxWidth < 720;
        final cards = [
          _KpiCard(
            label: 'Pending Sales Orders',
            value: '$pendingSalesOrders',
            icon: Icons.local_shipping_outlined,
            accent: AppColors.primary,
          ),
          _KpiCard(
            label: 'Pending Purchase Orders',
            value: '$pendingPurchaseOrders',
            icon: Icons.inventory_outlined,
            accent: AppColors.secondary,
          ),
          _KpiCard(
            label: 'Stock Health',
            value: '${stockHealthPct.toStringAsFixed(0)}%',
            icon: Icons.donut_large_outlined,
            accent: AppColors.warning,
            // A plain CircularProgressIndicator rather than an fl_chart
            // PieChart here: fl_chart's arc geometry at very small sizes
            // (this ring is 44px) produced a degenerate paint transform
            // that silently broke rendering for this widget and everything
            // painted after it in the tree.
            trailing: SizedBox(
              width: 44,
              height: 44,
              child: CircularProgressIndicator(
                value: stockHealthPct / 100,
                strokeWidth: 6,
                backgroundColor: AppColors.borderLight,
                valueColor: const AlwaysStoppedAnimation(AppColors.success),
              ),
            ),
          ),
        ];

        if (narrow) {
          return Column(children: [
            for (final c in cards) Padding(padding: const EdgeInsets.only(bottom: 12), child: c),
          ]);
        }
        // Not CrossAxisAlignment.stretch: this Row sits inside a Column
        // inside a SingleChildScrollView, so it receives an unbounded
        // (Infinity) height constraint — stretch then tries to force each
        // Expanded card to Infinity height, throwing "BoxConstraints
        // forces an infinite height" and leaving the whole subtree
        // unlaid-out (which is what actually produced the broken/garbled
        // dashboard render, not the chart widgets themselves). The cards
        // already size themselves via their internal Column's
        // mainAxisSize.min, so no stretch is needed for them to match.
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < cards.length; i++) ...[
              if (i > 0) const SizedBox(width: 12),
              Expanded(child: cards[i]),
            ],
          ],
        );
      },
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color accent;
  final Widget? trailing;

  const _KpiCard({required this.label, required this.value, required this.icon, required this.accent, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Expanded(
              // mainAxisSize.min: this card sits in an unbounded-height
              // context (Card > Row > Expanded, inside a Column inside a
              // SingleChildScrollView). Without .min, Column defaults to
              // .max and tries to fill unbounded height, which in release
              // mode silently produces a NaN/garbage size instead of the
              // debug-mode assertion — that NaN then corrupts every
              // sibling's layout offset later in the parent Column.
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                      child: Icon(icon, color: accent, size: 18),
                    ),
                  ]),
                  const SizedBox(height: 14),
                  Text(value, style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: accent)),
                  const SizedBox(height: 2),
                  Text(label, style: Theme.of(context).textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
      ),
    );
  }
}
