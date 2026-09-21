import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_data_table.dart';
import '../../shared/widgets/app_form_sheet.dart';
import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/entity_avatar.dart';
import '../../shared/widgets/status_badge.dart';
import '../auth/auth_providers.dart';
import '../scanner/barcode_scanner_screen.dart';
import 'product_model.dart';
import 'products_controller.dart';

final _unitsOptionsProvider = FutureProvider.autoDispose<List<Map<String, String>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/units');
  return (response.data as List)
      .map((e) => {'id': e['id'] as String, 'label': '${e['name']} (${e['code']})'})
      .toList();
});

class ProductsScreen extends ConsumerWidget {
  const ProductsScreen({super.key});

  SemanticStatus _statusFor(Product p) => switch (p.status) {
        'active' => SemanticStatus.success,
        'discontinued' => SemanticStatus.error,
        _ => SemanticStatus.neutral,
      };

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final units = await ref.read(_unitsOptionsProvider.future).catchError((_) => <Map<String, String>>[]);
    if (units.isEmpty) {
      if (context.mounted) {
        AppToast.error(context, 'Create a unit of measure first (Settings > Units) before adding products.');
      }
      return;
    }
    if (!context.mounted) return;

    final skuController = TextEditingController();
    final nameController = TextEditingController();
    final costController = TextEditingController(text: '0');
    final priceController = TextEditingController(text: '0');
    String selectedUnitId = units.first['id']!;
    final formKey = GlobalKey<FormState>();

    final confirmed = await showAppFormSheet<bool>(
      context,
      title: 'Add New Product',
      cardTitle: 'Product Information',
      child: StatefulBuilder(
        builder: (context, setState) => Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const FieldLabel('SKU'),
              TextFormField(
                controller: skuController,
                decoration: const InputDecoration(hintText: 'Enter SKU'),
                validator: (v) => (v == null || v.isEmpty) ? 'SKU is required' : null,
              ),
              const SizedBox(height: 16),
              const FieldLabel('Name'),
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(hintText: 'Enter product name'),
                validator: (v) => (v == null || v.isEmpty) ? 'Name is required' : null,
              ),
              const SizedBox(height: 16),
              const FieldLabel('Base unit'),
              DropdownButtonFormField<String>(
                initialValue: selectedUnitId,
                decoration: const InputDecoration(),
                items: units.map((u) => DropdownMenuItem(value: u['id'], child: Text(u['label']!))).toList(),
                onChanged: (v) => setState(() => selectedUnitId = v ?? selectedUnitId),
              ),
              const SizedBox(height: 16),
              const FieldLabel('Cost price'),
              TextFormField(
                controller: costController,
                decoration: const InputDecoration(hintText: '0.00'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              const FieldLabel('Selling price'),
              TextFormField(
                controller: priceController,
                decoration: const InputDecoration(hintText: '0.00'),
                keyboardType: TextInputType.number,
              ),
              AppFormSheetActions(
                saveLabel: 'Save',
                onCancel: () => Navigator.of(context).pop(false),
                onSave: () {
                  if (formKey.currentState!.validate()) Navigator.of(context).pop(true);
                },
              ),
            ],
          ),
        ),
      ),
    );

    if (confirmed == true) {
      try {
        await ref.read(productsControllerProvider.notifier).create(
              sku: skuController.text,
              name: nameController.text,
              baseUnitId: selectedUnitId,
              costPrice: double.tryParse(costController.text) ?? 0,
              sellingPrice: double.tryParse(priceController.text) ?? 0,
            );
        if (context.mounted) AppToast.success(context, 'Product created.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  Future<void> _edit(BuildContext context, WidgetRef ref, Product p) async {
    final nameController = TextEditingController(text: p.name);
    final costController = TextEditingController(text: p.costPrice.toString());
    final priceController = TextEditingController(text: p.sellingPrice.toString());
    String status = p.status;
    final formKey = GlobalKey<FormState>();

    final confirmed = await showAppFormSheet<bool>(
      context,
      title: 'Edit Product',
      cardTitle: 'Product Information',
      child: StatefulBuilder(
        builder: (context, setState) => Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const FieldLabel('Name'),
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(hintText: 'Enter product name'),
                validator: (v) => (v == null || v.isEmpty) ? 'Name is required' : null,
              ),
              const SizedBox(height: 16),
              const FieldLabel('Cost price'),
              TextFormField(
                controller: costController,
                decoration: const InputDecoration(hintText: '0.00'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              const FieldLabel('Selling price'),
              TextFormField(
                controller: priceController,
                decoration: const InputDecoration(hintText: '0.00'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              const FieldLabel('Status'),
              DropdownButtonFormField<String>(
                initialValue: status,
                decoration: const InputDecoration(),
                items: const [
                  DropdownMenuItem(value: 'active', child: Text('Active')),
                  DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
                  DropdownMenuItem(value: 'discontinued', child: Text('Discontinued')),
                ],
                onChanged: (v) => setState(() => status = v ?? status),
              ),
              AppFormSheetActions(
                onCancel: () => Navigator.of(context).pop(false),
                onSave: () {
                  if (formKey.currentState!.validate()) Navigator.of(context).pop(true);
                },
              ),
            ],
          ),
        ),
      ),
    );

    if (confirmed == true) {
      try {
        await ref.read(productsControllerProvider.notifier).update(
              p.id,
              name: nameController.text,
              costPrice: double.tryParse(costController.text),
              sellingPrice: double.tryParse(priceController.text),
              status: status,
            );
        if (context.mounted) AppToast.success(context, 'Product updated.');
      } catch (e) {
        if (context.mounted) AppToast.error(context, describeError(e));
      }
    }
  }

  Future<void> _view(BuildContext context, Product p) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(p.name),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('SKU: ${p.sku}'),
            Text('Cost price: ${p.costPrice.toStringAsFixed(2)}'),
            Text('Selling price: ${p.sellingPrice.toStringAsFixed(2)}'),
            Text('Reorder point: ${p.reorderPoint.toStringAsFixed(2)}'),
            Text('Status: ${p.status}'),
          ],
        ),
        actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))],
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Product p) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'Delete Product',
      message: 'Delete "${p.name}" (${p.sku})? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      await ref.read(productsControllerProvider.notifier).remove(p.id);
      if (context.mounted) AppToast.success(context, 'Product deleted.');
    } catch (e) {
      if (context.mounted) AppToast.error(context, describeError(e));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(productsControllerProvider);
    final controller = ref.read(productsControllerProvider.notifier);
    final isMobile = AppBreakpoints.isMobile(MediaQuery.of(context).size.width);

    return Scaffold(
      appBar: AppBar(title: const Text('Products')),
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
              ),
              tooltip: 'Scan barcode',
              child: const Icon(Icons.qr_code_scanner),
            )
          : null,
      body: AppDataTable<Product>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'products',
        createAction: FilledButton.icon(
          onPressed: () => _create(context, ref),
          icon: const Icon(Icons.add),
          label: const Text('Create'),
        ),
        filters: const [
          AppFilter(key: 'status', label: 'Status', options: [
            AppFilterOption('active', 'Active'),
            AppFilterOption('inactive', 'Inactive'),
            AppFilterOption('discontinued', 'Discontinued'),
          ]),
        ],
        rowActions: (p) => [
          RowAction(icon: Icons.visibility_outlined, tooltip: 'View', onTap: (p) => _view(context, p)),
          RowAction(icon: Icons.edit_outlined, tooltip: 'Edit', color: AppColors.chartBlue, onTap: (p) => _edit(context, ref, p)),
          RowAction(icon: Icons.delete_outline, tooltip: 'Delete', color: AppColors.error, onTap: (p) => _delete(context, ref, p)),
        ],
        columns: [
          AppColumn(
            label: 'Item Name',
            sortKey: 'name',
            cellBuilder: (p) => Row(mainAxisSize: MainAxisSize.min, children: [
              EntityAvatar(label: p.name),
              const SizedBox(width: 10),
              Flexible(child: Text(p.name, overflow: TextOverflow.ellipsis)),
            ]),
          ),
          AppColumn(
            label: 'SKU',
            sortKey: 'sku',
            cellBuilder: (p) => Text(p.sku, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
          ),
          AppColumn(
            label: 'Reorder Point',
            sortKey: 'reorderPoint',
            cellBuilder: (p) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: AppColors.subtle, borderRadius: BorderRadius.circular(20)),
              child: Text(p.reorderPoint.toStringAsFixed(0), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
            ),
          ),
          AppColumn(
            label: 'Cost',
            sortKey: 'costPrice',
            cellBuilder: (p) => Text(p.costPrice.toStringAsFixed(2), style: const TextStyle(color: AppColors.chartBlue, fontWeight: FontWeight.w600)),
          ),
          AppColumn(
            label: 'Selling Price',
            sortKey: 'sellingPrice',
            cellBuilder: (p) => Text(p.sellingPrice.toStringAsFixed(2), style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.w600)),
          ),
          AppColumn(
            label: 'Status',
            cellBuilder: (p) => StatusBadge(label: p.status.toUpperCase(), status: _statusFor(p)),
          ),
        ],
        mobileCardBuilder: (p) => Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    EntityAvatar(label: p.name),
                    const SizedBox(width: 10),
                    Expanded(child: Text(p.name, style: Theme.of(context).textTheme.titleSmall)),
                    StatusBadge(label: p.status.toUpperCase(), status: _statusFor(p)),
                  ],
                ),
                const SizedBox(height: 4),
                Text('SKU: ${p.sku}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
                Text(
                  'Cost ${p.costPrice.toStringAsFixed(2)}  ·  Sell ${p.sellingPrice.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
