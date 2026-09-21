import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/entity_avatar.dart';
import '../../shared/widgets/status_badge.dart';
import '../sales_orders/sales_order_detail_screen.dart';
import '../sales_orders/sales_order_model.dart';
import '../sales_orders/sales_orders_controller.dart';
import '../sales_orders/sales_orders_repository.dart';
import '../sales_orders/sales_orders_screen.dart' show soStatusSemantic;

const _cancellableSoStatuses = ['DRAFT', 'CONFIRMED', 'PARTIALLY_DISPATCHED'];

/// Compact preview of the most recent sales orders, styled like the
/// StockMind reference dashboard's "Sales Order" table — but only columns
/// backed by real data (Order, Customer, Date, Status, Action). The
/// reference design also shows Packed/Shipped/Invoiced counts and a
/// dollar Amount; this app's sales-order list endpoint doesn't return that
/// data, so rather than invent numbers those columns are left out.
class RecentSalesOrdersTable extends ConsumerWidget {
  const RecentSalesOrdersTable({super.key});

  static Future<void> _cancel(BuildContext context, WidgetRef ref, SalesOrderSummary s) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Cancel Sales Order',
      message: 'Cancel ${s.soNumber}? This cannot be undone.',
      confirmLabel: 'Cancel Order',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      await ref.read(salesOrdersControllerProvider.notifier).cancel(s.id);
      ref.invalidate(recentSalesOrdersProvider);
      if (context.mounted) AppToast.success(context, 'Sales order cancelled.');
    } catch (e) {
      if (context.mounted) AppToast.error(context, describeError(e));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(recentSalesOrdersProvider);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Sales Orders', style: Theme.of(context).textTheme.titleMedium),
                TextButton(onPressed: () => context.go('/sales-orders'), child: const Text('View all')),
              ],
            ),
            const SizedBox(height: 8),
            async.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (_, __) => const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('Failed to load recent sales orders.'),
              ),
              data: (orders) {
                if (orders.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text('No sales orders yet.'),
                  );
                }
                return LayoutBuilder(
                  builder: (context, constraints) {
                    if (constraints.maxWidth < 560) {
                      return Column(children: orders.map((o) => _MobileRow(order: o)).toList());
                    }
                    return _DesktopTable(orders: orders);
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _DesktopTable extends ConsumerWidget {
  final List<SalesOrderSummary> orders;
  const _DesktopTable({required this.orders});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Table(
      columnWidths: const {
        0: FlexColumnWidth(1.3),
        1: FlexColumnWidth(1.8),
        2: FlexColumnWidth(1.1),
        3: FlexColumnWidth(1.1),
        4: FixedColumnWidth(80),
      },
      children: [
        TableRow(children: [
          headerCell('Order'),
          headerCell('Customer'),
          headerCell('Date'),
          headerCell('Status'),
          headerCell('Action'),
        ]),
        for (final o in orders)
          TableRow(children: [
            cell(Text(o.soNumber, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.primary))),
            cell(Row(mainAxisSize: MainAxisSize.min, children: [
              EntityAvatar(label: o.customerName),
              const SizedBox(width: 8),
              Expanded(child: Text(o.customerName, overflow: TextOverflow.ellipsis)),
            ])),
            cell(Text(o.createdAt.split('T').first)),
            cell(StatusBadge(label: o.status, status: soStatusSemantic(o.status))),
            cell(Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(
                icon: const Icon(Icons.visibility_outlined, size: 18),
                tooltip: 'View',
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => SalesOrderDetailScreen(id: o.id))),
              ),
              IconButton(
                icon: const Icon(Icons.cancel_outlined, size: 18),
                tooltip: 'Cancel Order',
                color: AppColors.error,
                onPressed: _cancellableSoStatuses.contains(o.status)
                    ? () => RecentSalesOrdersTable._cancel(context, ref, o)
                    : null,
              ),
            ])),
          ]),
      ],
    );
  }
}

Widget headerCell(String label) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted)),
    );

Widget cell(Widget child) => Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: child);

class _MobileRow extends ConsumerWidget {
  final SalesOrderSummary order;
  const _MobileRow({required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return InkWell(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => SalesOrderDetailScreen(id: order.id))),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            EntityAvatar(label: order.customerName),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(order.soNumber, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.primary)),
                  Text('${order.customerName} · ${order.createdAt.split('T').first}', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            StatusBadge(label: order.status, status: soStatusSemantic(order.status)),
            IconButton(
              icon: const Icon(Icons.cancel_outlined, size: 18),
              tooltip: 'Cancel Order',
              color: AppColors.error,
              onPressed: _cancellableSoStatuses.contains(order.status)
                  ? () => RecentSalesOrdersTable._cancel(context, ref, order)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
