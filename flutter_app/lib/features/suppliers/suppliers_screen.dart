import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_data_table.dart';
import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/simple_form_dialog.dart';
import '../../shared/widgets/status_badge.dart';
import 'supplier_model.dart';
import 'suppliers_controller.dart';

class SuppliersScreen extends ConsumerWidget {
  const SuppliersScreen({super.key});

  Future<void> _view(BuildContext context, Supplier s) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(s.name),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Code: ${s.code}'),
            Text('Email: ${s.email ?? '—'}'),
            Text('Phone: ${s.phone ?? '—'}'),
            Text('Status: ${s.status}'),
          ],
        ),
        actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))],
      ),
    );
  }

  // No hard-delete endpoint for suppliers (referenced by purchase order
  // history) — deactivate instead of fabricating a destructive delete.
  Future<void> _toggleStatus(BuildContext context, WidgetRef ref, Supplier s) async {
    final deactivating = s.status == 'active';
    final confirmed = await showConfirmDialog(
      context,
      title: deactivating ? 'Deactivate Supplier' : 'Activate Supplier',
      message: deactivating ? 'Deactivate "${s.name}"?' : 'Reactivate "${s.name}"?',
      confirmLabel: deactivating ? 'Deactivate' : 'Activate',
      destructive: deactivating,
    );
    if (!confirmed) return;
    try {
      await ref.read(suppliersControllerProvider.notifier).update(s.id, status: deactivating ? 'inactive' : 'active');
      if (context.mounted) AppToast.success(context, deactivating ? 'Supplier deactivated.' : 'Supplier activated.');
    } catch (e) {
      if (context.mounted) AppToast.error(context, describeError(e));
    }
  }

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Create Supplier',
      fields: [
        SimpleFormField(key: 'name', label: 'Name'),
        SimpleFormField(key: 'code', label: 'Code'),
        SimpleFormField(key: 'email', label: 'Email', required: false),
        SimpleFormField(key: 'phone', label: 'Phone', required: false),
      ],
    );
    if (result != null) {
      try {
        await ref.read(suppliersControllerProvider.notifier).create(
              name: result['name']!,
              code: result['code']!,
              email: result['email'],
              phone: result['phone'],
            );
        if (context.mounted) AppToast.success(context, 'Supplier created.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  Future<void> _edit(BuildContext context, WidgetRef ref, Supplier s) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Edit Supplier',
      submitLabel: 'Save',
      fields: [
        SimpleFormField(key: 'name', label: 'Name', initialValue: s.name),
        SimpleFormField(key: 'email', label: 'Email', required: false, initialValue: s.email),
        SimpleFormField(key: 'phone', label: 'Phone', required: false, initialValue: s.phone),
      ],
    );
    if (result != null) {
      try {
        await ref
            .read(suppliersControllerProvider.notifier)
            .update(s.id, name: result['name'], email: result['email'], phone: result['phone']);
        if (context.mounted) AppToast.success(context, 'Supplier updated.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(suppliersControllerProvider);
    final controller = ref.read(suppliersControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Suppliers')),
      body: AppDataTable<Supplier>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'suppliers',
        createAction: FilledButton.icon(
          onPressed: () => _create(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Create'),
        ),
        onRowTap: (s) => _edit(context, ref, s),
        filters: const [
          AppFilter(key: 'status', label: 'Status', options: [
            AppFilterOption('active', 'Active'),
            AppFilterOption('inactive', 'Inactive'),
          ]),
        ],
        rowActions: (s) => [
          RowAction(icon: Icons.visibility_outlined, tooltip: 'View', onTap: (s) => _view(context, s)),
          RowAction(icon: Icons.edit_outlined, tooltip: 'Edit', color: AppColors.chartBlue, onTap: (s) => _edit(context, ref, s)),
          RowAction(
            icon: s.status == 'active' ? Icons.block_outlined : Icons.check_circle_outline,
            tooltip: s.status == 'active' ? 'Deactivate' : 'Activate',
            color: s.status == 'active' ? Colors.red : Colors.green,
            onTap: (s) => _toggleStatus(context, ref, s),
          ),
        ],
        columns: [
          AppColumn(label: 'Code', sortKey: 'code', cellBuilder: (s) => Text(s.code)),
          AppColumn(label: 'Name', sortKey: 'name', cellBuilder: (s) => Text(s.name)),
          AppColumn(label: 'Email', cellBuilder: (s) => Text(s.email ?? '—')),
          AppColumn(label: 'Phone', cellBuilder: (s) => Text(s.phone ?? '—')),
          AppColumn(
            label: 'Status',
            cellBuilder: (s) => StatusBadge(
              label: s.status.toUpperCase(),
              status: s.status == 'active' ? SemanticStatus.success : SemanticStatus.neutral,
            ),
          ),
        ],
        mobileCardBuilder: (s) => Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text(s.name, style: Theme.of(context).textTheme.titleSmall)),
                    StatusBadge(
                      label: s.status.toUpperCase(),
                      status: s.status == 'active' ? SemanticStatus.success : SemanticStatus.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Code: ${s.code}', style: Theme.of(context).textTheme.bodySmall),
                if (s.email != null) Text(s.email!, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
