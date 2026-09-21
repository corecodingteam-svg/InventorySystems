import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_providers.dart';
import 'app_toast.dart';
import 'list_states.dart';
import 'simple_form_dialog.dart';

/// Covers the many Settings entities that are just "a small list of records
/// with a name/code, creatable via a short form, backed by a plain-array
/// GET endpoint" (roles, units, categories, brands, tax categories, price
/// lists, webhook subscriptions, integration connections, workflow rules).
/// A bespoke screen is only worth writing when the entity needs more than
/// this — see stock counts, purchase/sales orders, POS for those.
class GenericAdminListScreen extends ConsumerWidget {
  final String title;
  final String path;
  final List<SimpleFormField>? createFields;
  final Map<String, dynamic> Function(Map<String, String> formValues)? buildCreatePayload;
  final String Function(Map<String, dynamic> row) titleOf;
  final String Function(Map<String, dynamic> row)? subtitleOf;
  final String emptyMessage;
  /// Builds the delete URL path for a row (relative to [path], e.g. `${path}/${row['id']}`).
  /// Omit to hide the delete action for entities without a delete endpoint.
  final String Function(Map<String, dynamic> row)? deletePathOf;

  const GenericAdminListScreen({
    super.key,
    required this.title,
    required this.path,
    required this.titleOf,
    this.subtitleOf,
    this.createFields,
    this.buildCreatePayload,
    this.emptyMessage = 'Nothing here yet.',
    this.deletePathOf,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get(path);
      final body = response.data;
      return body is Map ? (body['data'] as List? ?? []) : (body as List);
    });
    final async = ref.watch(provider);

    Future<void> create() async {
      final result = await showSimpleFormDialog(context, title: 'Create', fields: createFields!);
      if (result == null) return;
      try {
        final api = ref.read(apiClientProvider);
        await api.dio.post(path, data: buildCreatePayload != null ? buildCreatePayload!(result) : result);
        ref.invalidate(provider);
        if (context.mounted) AppToast.success(context, 'Created successfully.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }

    Future<void> deleteRow(Map<String, dynamic> row) async {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Delete?'),
          content: Text('Delete "${titleOf(row)}"? This cannot be undone.'),
          actions: [
            TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Delete')),
          ],
        ),
      );
      if (confirmed != true) return;
      try {
        final api = ref.read(apiClientProvider);
        await api.dio.delete(deletePathOf!(row));
        ref.invalidate(provider);
        if (context.mounted) AppToast.success(context, 'Deleted successfully.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(provider))],
      ),
      floatingActionButton: createFields == null
          ? null
          : FloatingActionButton(onPressed: create, child: const Icon(Icons.add)),
      body: async.when(
        loading: () => const AppLoadingSkeleton(),
        error: (e, _) => AppErrorState(message: 'Failed to load.', onRetry: () => ref.invalidate(provider)),
        data: (rows) {
          if (rows.isEmpty) {
            return AppEmptyState(title: 'Nothing here yet.', message: emptyMessage);
          }
          return ListView.separated(
            padding: const EdgeInsets.all(10),
            itemCount: rows.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final row = rows[i] as Map<String, dynamic>;
              return Card(
                child: ListTile(
                  title: Text(titleOf(row)),
                  subtitle: subtitleOf != null ? Text(subtitleOf!(row)) : null,
                  trailing: deletePathOf == null
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.delete_outline),
                          tooltip: 'Delete',
                          onPressed: () => deleteRow(row),
                        ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
