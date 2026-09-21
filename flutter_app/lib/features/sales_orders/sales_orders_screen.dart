import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_data_table.dart';
import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/status_badge.dart';
import 'sales_order_model.dart';
import 'sales_orders_controller.dart';
import 'sales_order_detail_screen.dart';
import 'create_sales_order_screen.dart';

const _cancellableSoStatuses = ['DRAFT', 'CONFIRMED', 'PARTIALLY_DISPATCHED'];

SemanticStatus soStatusSemantic(String status) => switch (status) {
      'DRAFT' => SemanticStatus.neutral,
      'CONFIRMED' => SemanticStatus.info,
      'PARTIALLY_DISPATCHED' => SemanticStatus.warning,
      'DISPATCHED' => SemanticStatus.success,
      'CANCELLED' => SemanticStatus.error,
      _ => SemanticStatus.neutral,
    };

class SalesOrdersScreen extends ConsumerWidget {
  const SalesOrdersScreen({super.key});

  // Same reasoning as purchase orders: sales orders are an audit trail, so
  // Cancel stands in for Delete and is only enabled pre-dispatch.
  Future<void> _cancel(BuildContext context, WidgetRef ref, SalesOrderSummary s) async {
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
      if (context.mounted) AppToast.success(context, 'Sales order cancelled.');
    } catch (e) {
      if (context.mounted) AppToast.error(context, describeError(e));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(salesOrdersControllerProvider);
    final controller = ref.read(salesOrdersControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Sales Orders')),
      body: AppDataTable<SalesOrderSummary>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'sales orders',
        createAction: FilledButton.icon(
          onPressed: () async {
            await Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CreateSalesOrderScreen()),
            );
            controller.load();
          },
          icon: const Icon(Icons.add),
          label: const Text('Create'),
        ),
        onRowTap: (so) async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => SalesOrderDetailScreen(id: so.id)),
          );
          controller.load();
        },
        filters: const [
          AppFilter(key: 'status', label: 'Status', options: [
            AppFilterOption('DRAFT', 'Draft'),
            AppFilterOption('CONFIRMED', 'Confirmed'),
            AppFilterOption('PARTIALLY_DISPATCHED', 'Partially Dispatched'),
            AppFilterOption('DISPATCHED', 'Dispatched'),
            AppFilterOption('CANCELLED', 'Cancelled'),
          ]),
        ],
        rowActions: (s) => [
          RowAction(
            icon: Icons.visibility_outlined,
            tooltip: 'View',
            onTap: (s) async {
              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => SalesOrderDetailScreen(id: s.id)));
              ref.read(salesOrdersControllerProvider.notifier).load();
            },
          ),
          RowAction(
            icon: Icons.cancel_outlined,
            tooltip: 'Cancel Order',
            color: AppColors.error,
            enabledWhen: (s) => _cancellableSoStatuses.contains(s.status),
            onTap: (s) => _cancel(context, ref, s),
          ),
        ],
        columns: [
          AppColumn(label: 'SO Number', cellBuilder: (s) => Text(s.soNumber)),
          AppColumn(label: 'Customer', cellBuilder: (s) => Text(s.customerName)),
          AppColumn(
            label: 'Status',
            cellBuilder: (s) => StatusBadge(label: s.status, status: soStatusSemantic(s.status)),
          ),
          AppColumn(label: 'Created', cellBuilder: (s) => Text(s.createdAt.split('T').first)),
        ],
        mobileCardBuilder: (s) => Card(
          child: ListTile(
            title: Text(s.soNumber),
            subtitle: Text(s.customerName),
            trailing: StatusBadge(label: s.status, status: soStatusSemantic(s.status)),
            onTap: () async {
              await Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => SalesOrderDetailScreen(id: s.id)),
              );
              controller.load();
            },
          ),
        ),
      ),
    );
  }
}
