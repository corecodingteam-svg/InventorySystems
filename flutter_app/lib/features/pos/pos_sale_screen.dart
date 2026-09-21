import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/product_picker_field.dart';
import 'pos_repository.dart';

class _CartLine {
  final ProductOption product;
  double quantity;
  double unitPrice;
  _CartLine({required this.product, required this.quantity, required this.unitPrice});
  double get total => quantity * unitPrice;
}

class PosSaleScreen extends ConsumerStatefulWidget {
  final String sessionId;
  const PosSaleScreen({super.key, required this.sessionId});

  @override
  ConsumerState<PosSaleScreen> createState() => _PosSaleScreenState();
}

class _PosSaleScreenState extends ConsumerState<PosSaleScreen> {
  final List<_CartLine> _cart = [];
  String _paymentMethod = 'CASH';
  bool _submitting = false;

  double get _total => _cart.fold(0, (sum, l) => sum + l.total);

  void _addLine(ProductOption product) {
    setState(() => _cart.add(_CartLine(product: product, quantity: 1, unitPrice: product.sellingPrice)));
  }

  Future<void> _checkout() async {
    if (_cart.isEmpty) return;
    setState(() => _submitting = true);
    try {
      final sale = await ref.read(posRepositoryProvider).createSale(
            sessionId: widget.sessionId,
            items: _cart
                .map((l) => {'productId': l.product.id, 'quantity': l.quantity, 'unitPrice': l.unitPrice})
                .toList(),
            payments: [
              {'method': _paymentMethod, 'amount': _total},
            ],
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sale ${sale.saleNumber} completed: ${sale.totalAmount.toStringAsFixed(2)}')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Sale failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New POS Sale')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ProductPickerField(onSelected: _addLine, labelText: 'Scan or search product'),
            const SizedBox(height: 12),
            Expanded(
              child: _cart.isEmpty
                  ? const Center(child: Text('Cart is empty — add a product above.'))
                  : ListView.builder(
                      itemCount: _cart.length,
                      itemBuilder: (context, i) {
                        final line = _cart[i];
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
                                    onChanged: (v) => setState(() => line.quantity = double.tryParse(v) ?? line.quantity),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextFormField(
                                    initialValue: line.unitPrice.toString(),
                                    decoration: const InputDecoration(labelText: 'Price'),
                                    keyboardType: TextInputType.number,
                                    onChanged: (v) =>
                                        setState(() => line.unitPrice = double.tryParse(v) ?? line.unitPrice),
                                  ),
                                ),
                              ],
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () => setState(() => _cart.removeAt(i)),
                            ),
                          ),
                        );
                      },
                    ),
            ),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total: ${_total.toStringAsFixed(2)}', style: Theme.of(context).textTheme.titleLarge),
                DropdownButton<String>(
                  value: _paymentMethod,
                  items: const [
                    DropdownMenuItem(value: 'CASH', child: Text('Cash')),
                    DropdownMenuItem(value: 'CARD', child: Text('Card')),
                    DropdownMenuItem(value: 'UPI', child: Text('UPI')),
                    DropdownMenuItem(value: 'OTHER', child: Text('Other')),
                  ],
                  onChanged: (v) => setState(() => _paymentMethod = v ?? 'CASH'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: (_cart.isEmpty || _submitting) ? null : _checkout,
              child: _submitting ? const CircularProgressIndicator() : const Text('Complete Sale'),
            ),
          ],
        ),
      ),
    );
  }
}
