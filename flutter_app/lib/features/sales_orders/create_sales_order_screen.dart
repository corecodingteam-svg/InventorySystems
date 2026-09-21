import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_toast.dart';
import '../../shared/widgets/product_picker_field.dart';
import '../auth/auth_providers.dart';
import 'sales_orders_repository.dart';

class _DraftLine {
  final ProductOption product;
  double quantity;
  double unitPrice;
  _DraftLine({required this.product, required this.quantity, required this.unitPrice});
}

final _simpleOptionsProvider = FutureProvider.autoDispose.family<List<Map<String, String>>, String>((ref, path) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get(path, queryParameters: {'pageSize': 100});
  final body = response.data;
  final list = body is Map ? (body['data'] as List) : (body as List);
  return list.map((e) => {'id': e['id'] as String, 'label': (e['name'] as String)}).toList();
});

class CreateSalesOrderScreen extends ConsumerStatefulWidget {
  const CreateSalesOrderScreen({super.key});

  @override
  ConsumerState<CreateSalesOrderScreen> createState() => _CreateSalesOrderScreenState();
}

class _CreateSalesOrderScreenState extends ConsumerState<CreateSalesOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  String? _customerId;
  String? _warehouseId;
  final List<_DraftLine> _lines = [];
  bool _submitting = false;
  bool _lineItemsTouched = false;

  void _addLine(ProductOption product) {
    setState(() {
      _lines.add(_DraftLine(product: product, quantity: 1, unitPrice: product.sellingPrice));
      _lineItemsTouched = true;
    });
  }

  Future<void> _submit() async {
    setState(() => _lineItemsTouched = true);
    final formValid = _formKey.currentState!.validate();
    if (!formValid || _lines.isEmpty) {
      if (_lines.isEmpty) AppToast.error(context, 'Add at least one line item.');
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(salesOrdersRepositoryProvider).create(
            customerId: _customerId!,
            warehouseId: _warehouseId!,
            items: _lines
                .map((l) => {'productId': l.product.id, 'quantity': l.quantity, 'unitPrice': l.unitPrice})
                .toList(),
          );
      if (mounted) {
        Navigator.of(context).pop();
        AppToast.success(context, 'Sales order created.');
      }
    } catch (e) {
      if (mounted) AppToast.error(context, describeError(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final customers = ref.watch(_simpleOptionsProvider('/customers'));
    final warehouses = ref.watch(_simpleOptionsProvider('/warehouses'));

    return Scaffold(
      appBar: AppBar(title: const Text('New Sales Order')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            customers.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('Failed to load customers: $e'),
              data: (options) => DropdownButtonFormField<String>(
                initialValue: _customerId,
                decoration: const InputDecoration(labelText: 'Customer'),
                items: options.map((o) => DropdownMenuItem(value: o['id'], child: Text(o['label']!))).toList(),
                onChanged: (v) => setState(() => _customerId = v),
                validator: (v) => v == null ? 'Select a customer' : null,
              ),
            ),
            const SizedBox(height: 12),
            warehouses.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text('Failed to load warehouses: $e'),
              data: (options) => DropdownButtonFormField<String>(
                initialValue: _warehouseId,
                decoration: const InputDecoration(labelText: 'Warehouse'),
                items: options.map((o) => DropdownMenuItem(value: o['id'], child: Text(o['label']!))).toList(),
                onChanged: (v) => setState(() => _warehouseId = v),
                validator: (v) => v == null ? 'Select a warehouse' : null,
              ),
            ),
            const SizedBox(height: 16),
            ProductPickerField(onSelected: _addLine, labelText: 'Add product line'),
            if (_lineItemsTouched && _lines.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6, left: 12),
                child: Text('Add at least one line item.', style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12)),
              ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                itemCount: _lines.length,
                itemBuilder: (context, i) {
                  final line = _lines[i];
                  return Card(
                    child: ListTile(
                      title: Text(line.product.toString()),
                      subtitle: Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: line.quantity.toString(),
                              decoration: const InputDecoration(labelText: 'Qty'),
                              keyboardType: TextInputType.number,
                              onChanged: (v) => line.quantity = double.tryParse(v) ?? line.quantity,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              initialValue: line.unitPrice.toString(),
                              decoration: const InputDecoration(labelText: 'Unit price'),
                              keyboardType: TextInputType.number,
                              onChanged: (v) => line.unitPrice = double.tryParse(v) ?? line.unitPrice,
                            ),
                          ),
                        ],
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => setState(() => _lines.removeAt(i)),
                      ),
                    ),
                  );
                },
              ),
            ),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting ? const CircularProgressIndicator() : const Text('Create Sales Order'),
            ),
          ],
          ),
        ),
      ),
    );
  }
}
