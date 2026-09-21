import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_data_table.dart';
import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/status_badge.dart';
import 'purchase_order_model.dart';
import 'purchase_orders_controller.dart';
import 'purchase_order_detail_screen.dart';
import 'create_purchase_order_screen.dart';

const _cancellablePoStatuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED'];

SemanticStatus poStatusSemantic(String status) => switch (status) {
      'DRAFT' => SemanticStatus.neutral,
      'PENDING_APPROVAL' => SemanticStatus.warning,
      'APPROVED' => SemanticStatus.info,
      'PARTIALLY_RECEIVED' => SemanticStatus.warning,
      'RECEIVED' => SemanticStatus.success,
      'CANCELLED' => SemanticStatus.error,
      _ => SemanticStatus.neutral,
    };

class PurchaseOrdersScreen extends ConsumerWidget {
  const PurchaseOrdersScreen({super.key});

  // Purchase orders are an audit trail, not freely-deletable records — a
  // true delete would break goods-receipt history. Cancel is the
  // equivalent destructive action, only available while the order hasn't
  // been fully received.
  Future<void> _cancel(BuildContext context, WidgetRef ref, PurchaseOrderSummary p) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Cancel Purchase Order',
      message: 'Cancel ${p.poNumber}? This cannot be undone.',
      confirmLabel: 'Cancel Order',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      await ref.read(purchaseOrdersControllerProvider.notifier).cancel(p.id);
      if (context.mounted) AppToast.success(context, 'Purchase order cancelled.');
    } catch (e) {
      if (context.mounted) AppToast.error(context, describeError(e));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(purchaseOrdersControllerProvider);
    final controller = ref.read(purchaseOrdersControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Purchase Orders')),
      body: AppDataTable<PurchaseOrderSummary>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'purchase orders',
        createAction: FilledButton.icon(
          onPressed: () async {
            await Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CreatePurchaseOrderScreen()),
            );
            controller.load();
          },
          icon: const Icon(Icons.add),
          label: const Text('Create'),
        ),
        onRowTap: (po) async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => PurchaseOrderDetailScreen(id: po.id)),
          );
          controller.load();
        },
        filters: const [
          AppFilter(key: 'status', label: 'Status', options: [
            AppFilterOption('DRAFT', 'Draft'),
            AppFilterOption('PENDING_APPROVAL', 'Pending Approval'),
            AppFilterOption('APPROVED', 'Approved'),
            AppFilterOption('PARTIALLY_RECEIVED', 'Partially Received'),
            AppFilterOption('RECEIVED', 'Received'),
            AppFilterOption('CANCELLED', 'Cancelled'),
          ]),
        ],
        rowActions: (p) => [
          RowAction(
            icon: Icons.visibility_outlined,
            tooltip: 'View',
            onTap: (p) async {
              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => PurchaseOrderDetailScreen(id: p.id)));
              ref.read(purchaseOrdersControllerProvider.notifier).load();
            },
          ),
          RowAction(
            icon: Icons.cancel_outlined,
            tooltip: 'Cancel Order',
            color: AppColors.error,
            enabledWhen: (p) => _cancellablePoStatuses.contains(p.status),
            onTap: (p) => _cancel(context, ref, p),
          ),
        ],
        columns: [
          AppColumn(label: 'PO Number', cellBuilder: (p) => Text(p.poNumber)),
          AppColumn(label: 'Supplier', cellBuilder: (p) => Text(p.supplierName)),
          AppColumn(
            label: 'Status',
            cellBuilder: (p) => StatusBadge(label: p.status, status: poStatusSemantic(p.status)),
          ),
          AppColumn(label: 'Created', cellBuilder: (p) => Text(p.createdAt.split('T').first)),
        ],
        mobileCardBuilder: (p) => Card(
          child: ListTile(
            title: Text(p.poNumber),
            subtitle: Text(p.supplierName),
            trailing: StatusBadge(label: p.status, status: poStatusSemantic(p.status)),
            onTap: () async {
              await Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => PurchaseOrderDetailScreen(id: p.id)),
              );
              controller.load();
            },
          ),
        ),
      ),
    );
  }
}
