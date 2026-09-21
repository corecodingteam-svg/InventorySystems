import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_data_table.dart';
import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/simple_form_dialog.dart';
import '../../shared/widgets/status_badge.dart';
import 'stock_count_model.dart';
import 'stock_counts_controller.dart';
import 'stock_counts_repository.dart';
import 'stock_count_detail_screen.dart';

const _cancellableStockCountStatuses = ['DRAFT', 'IN_PROGRESS', 'SUBMITTED'];

class StockCountsScreen extends ConsumerWidget {
  const StockCountsScreen({super.key});

  // Stock counts are an audit trail like PO/SO — Cancel stands in for
  // Delete and is only enabled before a count has been approved.
  Future<void> _cancel(BuildContext context, WidgetRef ref, StockCountSummary c) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Cancel Stock Count',
      message: 'Cancel ${c.countNumber}? This cannot be undone.',
      confirmLabel: 'Cancel Count',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      await ref.read(stockCountsControllerProvider.notifier).cancel(c.id);
      if (context.mounted) AppToast.success(context, 'Stock count cancelled.');
    } catch (e) {
      if (context.mounted) AppToast.error(context, describeError(e));
    }
  }

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'New Stock Count',
      fields: [SimpleFormField(key: 'warehouseId', label: 'Warehouse ID (UUID)')],
      submitLabel: 'Create',
    );
    if (result != null) {
      try {
        await ref.read(stockCountsRepositoryProvider).create(result['warehouseId']!);
        ref.invalidate(stockCountsControllerProvider);
        if (context.mounted) AppToast.success(context, 'Stock count created.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(stockCountsControllerProvider);
    final controller = ref.read(stockCountsControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Stock Counts')),
      body: AppDataTable<StockCountSummary>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'stock counts',
        createAction: FilledButton.icon(
          onPressed: () => _create(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Create'),
        ),
        onRowTap: (c) async {
          await Navigator.of(context).push(MaterialPageRoute(builder: (_) => StockCountDetailScreen(id: c.id)));
          controller.load();
        },
        filters: const [
          AppFilter(key: 'status', label: 'Status', options: [
            AppFilterOption('DRAFT', 'Draft'),
            AppFilterOption('IN_PROGRESS', 'In Progress'),
            AppFilterOption('SUBMITTED', 'Submitted'),
            AppFilterOption('APPROVED', 'Approved'),
            AppFilterOption('CANCELLED', 'Cancelled'),
          ]),
        ],
        rowActions: (c) => [
          RowAction(
            icon: Icons.visibility_outlined,
            tooltip: 'View',
            onTap: (c) async {
              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => StockCountDetailScreen(id: c.id)));
              ref.read(stockCountsControllerProvider.notifier).load();
            },
          ),
          RowAction(
            icon: Icons.cancel_outlined,
            tooltip: 'Cancel Count',
            color: AppColors.error,
            enabledWhen: (c) => _cancellableStockCountStatuses.contains(c.status),
            onTap: (c) => _cancel(context, ref, c),
          ),
        ],
        columns: [
          AppColumn(label: 'Number', cellBuilder: (c) => Text(c.countNumber)),
          AppColumn(label: 'Warehouse', cellBuilder: (c) => Text(c.warehouseName)),
          AppColumn(label: 'Type', cellBuilder: (c) => Text(c.countType)),
          AppColumn(
            label: 'Status',
            cellBuilder: (c) => StatusBadge(label: c.status, status: stockCountStatusSemantic(c.status)),
          ),
        ],
        mobileCardBuilder: (c) => Card(
          child: ListTile(
            title: Text(c.countNumber),
            subtitle: Text('${c.warehouseName} · ${c.countType}'),
            trailing: StatusBadge(label: c.status, status: stockCountStatusSemantic(c.status)),
            onTap: () async {
              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => StockCountDetailScreen(id: c.id)));
              controller.load();
            },
          ),
        ),
      ),
    );
  }
}
