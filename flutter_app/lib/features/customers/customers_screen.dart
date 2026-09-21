import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_data_table.dart';
import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/simple_form_dialog.dart';
import '../../shared/widgets/status_badge.dart';
import 'customer_model.dart';
import 'customers_controller.dart';

class CustomersScreen extends ConsumerWidget {
  const CustomersScreen({super.key});

  Future<void> _view(BuildContext context, Customer c) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(c.name),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Code: ${c.code}'),
            Text('Email: ${c.email ?? '—'}'),
            Text('Phone: ${c.phone ?? '—'}'),
            Text('Status: ${c.status}'),
          ],
        ),
        actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))],
      ),
    );
  }

  // No hard-delete endpoint for customers (referenced by sales order
  // history) — deactivate instead of fabricating a destructive delete.
  Future<void> _toggleStatus(BuildContext context, WidgetRef ref, Customer c) async {
    final deactivating = c.status == 'active';
    final confirmed = await showConfirmDialog(
      context,
      title: deactivating ? 'Deactivate Customer' : 'Activate Customer',
      message: deactivating ? 'Deactivate "${c.name}"?' : 'Reactivate "${c.name}"?',
      confirmLabel: deactivating ? 'Deactivate' : 'Activate',
      destructive: deactivating,
    );
    if (!confirmed) return;
    try {
      await ref.read(customersControllerProvider.notifier).update(c.id, status: deactivating ? 'inactive' : 'active');
      if (context.mounted) AppToast.success(context, deactivating ? 'Customer deactivated.' : 'Customer activated.');
    } catch (e) {
      if (context.mounted) AppToast.error(context, describeError(e));
    }
  }

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Create Customer',
      fields: [
        SimpleFormField(key: 'name', label: 'Name'),
        SimpleFormField(key: 'code', label: 'Code'),
        SimpleFormField(key: 'email', label: 'Email', required: false),
        SimpleFormField(key: 'phone', label: 'Phone', required: false),
      ],
    );
    if (result != null) {
      try {
        await ref.read(customersControllerProvider.notifier).create(
              name: result['name']!,
              code: result['code']!,
              email: result['email'],
              phone: result['phone'],
            );
        if (context.mounted) AppToast.success(context, 'Customer created.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  Future<void> _edit(BuildContext context, WidgetRef ref, Customer c) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Edit Customer',
      submitLabel: 'Save',
      fields: [
        SimpleFormField(key: 'name', label: 'Name', initialValue: c.name),
        SimpleFormField(key: 'email', label: 'Email', required: false, initialValue: c.email),
        SimpleFormField(key: 'phone', label: 'Phone', required: false, initialValue: c.phone),
      ],
    );
    if (result != null) {
      try {
        await ref
            .read(customersControllerProvider.notifier)
            .update(c.id, name: result['name'], email: result['email'], phone: result['phone']);
        if (context.mounted) AppToast.success(context, 'Customer updated.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customersControllerProvider);
    final controller = ref.read(customersControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Customers')),
      body: AppDataTable<Customer>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'customers',
        createAction: FilledButton.icon(
          onPressed: () => _create(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Create'),
        ),
        onRowTap: (c) => _edit(context, ref, c),
        filters: const [
          AppFilter(key: 'status', label: 'Status', options: [
            AppFilterOption('active', 'Active'),
            AppFilterOption('inactive', 'Inactive'),
          ]),
        ],
        rowActions: (c) => [
          RowAction(icon: Icons.visibility_outlined, tooltip: 'View', onTap: (c) => _view(context, c)),
          RowAction(icon: Icons.edit_outlined, tooltip: 'Edit', color: AppColors.chartBlue, onTap: (c) => _edit(context, ref, c)),
          RowAction(
            icon: c.status == 'active' ? Icons.block_outlined : Icons.check_circle_outline,
            tooltip: c.status == 'active' ? 'Deactivate' : 'Activate',
            color: c.status == 'active' ? Colors.red : Colors.green,
            onTap: (c) => _toggleStatus(context, ref, c),
          ),
        ],
        columns: [
          AppColumn(label: 'Code', sortKey: 'code', cellBuilder: (c) => Text(c.code)),
          AppColumn(label: 'Name', sortKey: 'name', cellBuilder: (c) => Text(c.name)),
          AppColumn(label: 'Email', cellBuilder: (c) => Text(c.email ?? '—')),
          AppColumn(label: 'Phone', cellBuilder: (c) => Text(c.phone ?? '—')),
          AppColumn(
            label: 'Status',
            cellBuilder: (c) => StatusBadge(
              label: c.status.toUpperCase(),
              status: c.status == 'active' ? SemanticStatus.success : SemanticStatus.neutral,
            ),
          ),
        ],
        mobileCardBuilder: (c) => Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text(c.name, style: Theme.of(context).textTheme.titleSmall)),
                    StatusBadge(
                      label: c.status.toUpperCase(),
                      status: c.status == 'active' ? SemanticStatus.success : SemanticStatus.neutral,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('Code: ${c.code}', style: Theme.of(context).textTheme.bodySmall),
                if (c.email != null) Text(c.email!, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
