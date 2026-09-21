import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/simple_form_dialog.dart';
import '../auth/auth_providers.dart';

const _entityTypes = ['product', 'customer', 'supplier', 'purchase_order', 'sales_order', 'warehouse'];

final _selectedEntityTypeProvider = StateProvider<String>((ref) => _entityTypes.first);

final _definitionsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final entityType = ref.watch(_selectedEntityTypeProvider);
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/custom-fields/definitions', queryParameters: {'entityType': entityType});
  return response.data as List;
});

const _fieldTypes = ['TEXT', 'NUMBER', 'DECIMAL', 'CURRENCY', 'DATE', 'DATETIME', 'BOOLEAN', 'DROPDOWN', 'MULTI_SELECT', 'URL'];

class CustomFieldsScreen extends ConsumerWidget {
  const CustomFieldsScreen({super.key});

  Future<void> _create(BuildContext context, WidgetRef ref, String entityType) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'New Custom Field for "$entityType"',
      fields: [
        SimpleFormField(key: 'fieldKey', label: 'Field key (e.g. drug_class)'),
        SimpleFormField(key: 'label', label: 'Display label'),
        SimpleFormField(key: 'fieldType', label: 'Type (${_fieldTypes.join(", ")})', initialValue: 'TEXT'),
      ],
    );
    if (result == null) return;
    try {
      final api = ref.read(apiClientProvider);
      await api.dio.post('/custom-fields/definitions', data: {
        'entityType': entityType,
        'fieldKey': result['fieldKey'],
        'label': result['label'],
        'fieldType': result['fieldType']!.toUpperCase(),
      });
      ref.invalidate(_definitionsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entityType = ref.watch(_selectedEntityTypeProvider);
    final async = ref.watch(_definitionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Custom Fields')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _create(context, ref, entityType),
        child: const Icon(Icons.add),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: DropdownButton<String>(
              value: entityType,
              items: _entityTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
              onChanged: (v) => ref.read(_selectedEntityTypeProvider.notifier).state = v ?? entityType,
            ),
          ),
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Failed to load: $e')),
              data: (defs) => defs.isEmpty
                  ? Center(child: Text('No custom fields defined for "$entityType" yet.'))
                  : ListView.separated(
                      itemCount: defs.length,
                      separatorBuilder: (_, __) => const Divider(),
                      itemBuilder: (context, i) {
                        final d = defs[i] as Map<String, dynamic>;
                        return ListTile(
                          title: Text(d['label'] as String),
                          subtitle: Text('${d['field_key']} · ${d['field_type']}'),
                          trailing: (d['is_required'] as bool) ? const Text('required') : null,
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
