import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_data_table.dart';
import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/simple_form_dialog.dart';
import '../../shared/widgets/status_badge.dart';
import 'user_model.dart';
import 'users_controller.dart';

class UsersScreen extends ConsumerWidget {
  const UsersScreen({super.key});

  Future<void> _view(BuildContext context, AppUser u) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(u.fullName),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [Text('Email: ${u.email}'), Text('Status: ${u.status}')],
        ),
        actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))],
      ),
    );
  }

  Future<void> _edit(BuildContext context, WidgetRef ref, AppUser u) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Edit User',
      submitLabel: 'Save',
      fields: [SimpleFormField(key: 'fullName', label: 'Full name', initialValue: u.fullName)],
    );
    if (result != null) {
      try {
        await ref.read(usersControllerProvider.notifier).update(u.id, fullName: result['fullName']);
        if (context.mounted) AppToast.success(context, 'User updated.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, AppUser u) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete User',
      message: 'Delete "${u.fullName}" (${u.email})? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      await ref.read(usersControllerProvider.notifier).remove(u.id);
      if (context.mounted) AppToast.success(context, 'User deleted.');
    } catch (e) {
      if (context.mounted) AppToast.error(context, describeError(e));
    }
  }

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Create User',
      fields: [
        SimpleFormField(key: 'fullName', label: 'Full name'),
        SimpleFormField(key: 'email', label: 'Email'),
        SimpleFormField(key: 'password', label: 'Temporary password'),
      ],
    );
    if (result != null) {
      try {
        await ref.read(usersControllerProvider.notifier).create(result['email']!, result['password']!, result['fullName']!);
        if (context.mounted) AppToast.success(context, 'User invited.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(usersControllerProvider);
    final controller = ref.read(usersControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Users')),
      body: AppDataTable<AppUser>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'users',
        createAction: FilledButton.icon(
          onPressed: () => _create(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Invite'),
        ),
        rowActions: (u) => [
          RowAction(icon: Icons.visibility_outlined, tooltip: 'View', onTap: (u) => _view(context, u)),
          RowAction(icon: Icons.edit_outlined, tooltip: 'Edit', color: AppColors.chartBlue, onTap: (u) => _edit(context, ref, u)),
          RowAction(icon: Icons.delete_outline, tooltip: 'Delete', color: AppColors.error, onTap: (u) => _delete(context, ref, u)),
        ],
        columns: [
          AppColumn(label: 'Name', sortKey: 'fullName', cellBuilder: (u) => Text(u.fullName)),
          AppColumn(label: 'Email', sortKey: 'email', cellBuilder: (u) => Text(u.email)),
          AppColumn(
            label: 'Status',
            cellBuilder: (u) => StatusBadge(
              label: u.status.toUpperCase(),
              status: u.status == 'active' ? SemanticStatus.success : SemanticStatus.neutral,
            ),
          ),
        ],
        mobileCardBuilder: (u) => Card(
          child: ListTile(
            title: Text(u.fullName),
            subtitle: Text(u.email),
            trailing: StatusBadge(
              label: u.status.toUpperCase(),
              status: u.status == 'active' ? SemanticStatus.success : SemanticStatus.neutral,
            ),
          ),
        ),
      ),
    );
  }
}
