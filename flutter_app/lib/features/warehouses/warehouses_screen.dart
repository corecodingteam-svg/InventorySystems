import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_data_table.dart';
import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/simple_form_dialog.dart';
import '../../shared/widgets/status_badge.dart';
import 'warehouse_model.dart';
import 'warehouses_controller.dart';

class WarehousesScreen extends ConsumerWidget {
  const WarehousesScreen({super.key});

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Create Warehouse',
      fields: [
        SimpleFormField(key: 'name', label: 'Name'),
        SimpleFormField(key: 'code', label: 'Code'),
      ],
    );
    if (result != null) {
      try {
        await ref.read(warehousesControllerProvider.notifier).create(result['name']!, result['code']!);
        if (context.mounted) AppToast.success(context, 'Warehouse created.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  Future<void> _view(BuildContext context, Warehouse w) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(w.name),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [Text('Code: ${w.code}'), Text('Status: ${w.status}')],
        ),
        actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))],
      ),
    );
  }

  // Warehouses have no hard-delete endpoint on the backend (they're
  // referenced by stock history), so "Delete" here toggles status between
  // active/inactive instead of fabricating a destructive action that
  // doesn't exist.
  Future<void> _toggleStatus(BuildContext context, WidgetRef ref, Warehouse w) async {
    final deactivating = w.status == 'active';
    final confirmed = await showConfirmDialog(
      context,
      title: deactivating ? 'Deactivate Warehouse' : 'Activate Warehouse',
      message: deactivating
          ? 'Deactivate "${w.name}"? It will be hidden from pickers but its stock history is preserved.'
          : 'Reactivate "${w.name}"?',
      confirmLabel: deactivating ? 'Deactivate' : 'Activate',
      destructive: deactivating,
    );
    if (!confirmed) return;
    try {
      await ref.read(warehousesControllerProvider.notifier).update(w.id, status: deactivating ? 'inactive' : 'active');
      if (context.mounted) AppToast.success(context, deactivating ? 'Warehouse deactivated.' : 'Warehouse activated.');
    } catch (e) {
      if (context.mounted) AppToast.error(context, describeError(e));
    }
  }

  Future<void> _edit(BuildContext context, WidgetRef ref, Warehouse w) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Edit Warehouse',
      submitLabel: 'Save',
      fields: [
        SimpleFormField(key: 'name', label: 'Name', initialValue: w.name),
        SimpleFormField(key: 'status', label: 'Status (active/inactive)', initialValue: w.status),
      ],
    );
    if (result != null) {
      try {
        await ref.read(warehousesControllerProvider.notifier).update(w.id, name: result['name'], status: result['status']);
        if (context.mounted) AppToast.success(context, 'Warehouse updated.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(warehousesControllerProvider);
    final controller = ref.read(warehousesControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Warehouses')),
      body: AppDataTable<Warehouse>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'warehouses',
        createAction: FilledButton.icon(
          onPressed: () => _create(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Create'),
        ),
        onRowTap: (w) => _edit(context, ref, w),
        rowActions: (w) => [
          RowAction(icon: Icons.visibility_outlined, tooltip: 'View', onTap: (w) => _view(context, w)),
          RowAction(icon: Icons.edit_outlined, tooltip: 'Edit', color: AppColors.chartBlue, onTap: (w) => _edit(context, ref, w)),
          RowAction(
            icon: w.status == 'active' ? Icons.block_outlined : Icons.check_circle_outline,
            tooltip: w.status == 'active' ? 'Deactivate' : 'Activate',
            color: w.status == 'active' ? Colors.red : Colors.green,
            onTap: (w) => _toggleStatus(context, ref, w),
          ),
        ],
        columns: [
          AppColumn(label: 'Code', sortKey: 'code', cellBuilder: (w) => Text(w.code)),
          AppColumn(label: 'Name', sortKey: 'name', cellBuilder: (w) => Text(w.name)),
          AppColumn(
            label: 'Status',
            cellBuilder: (w) => StatusBadge(
              label: w.status.toUpperCase(),
              status: w.status == 'active' ? SemanticStatus.success : SemanticStatus.neutral,
            ),
          ),
        ],
        mobileCardBuilder: (w) => Card(
          child: ListTile(
            title: Text(w.name),
            subtitle: Text('Code: ${w.code}'),
            trailing: StatusBadge(
              label: w.status.toUpperCase(),
              status: w.status == 'active' ? SemanticStatus.success : SemanticStatus.neutral,
            ),
          ),
        ),
      ),
    );
  }
}
