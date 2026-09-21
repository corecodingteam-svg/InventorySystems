import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_providers.dart';

class ProductOption {
  final String id;
  final String sku;
  final String name;
  final double sellingPrice;
  final double costPrice;
  ProductOption({required this.id, required this.sku, required this.name, required this.sellingPrice, required this.costPrice});

  @override
  String toString() => '$sku — $name';
}

/// Type-ahead product search used by PO/SO/POS line-item entry — queries
/// GET /products?search= rather than requiring the whole catalog loaded
/// client-side, consistent with the server-side-everything listing standard
/// used across the rest of the app.
class ProductPickerField extends ConsumerStatefulWidget {
  final void Function(ProductOption) onSelected;
  final String labelText;

  const ProductPickerField({super.key, required this.onSelected, this.labelText = 'Product (SKU or name)'});

  @override
  ConsumerState<ProductPickerField> createState() => _ProductPickerFieldState();
}

class _ProductPickerFieldState extends ConsumerState<ProductPickerField> {
  Future<List<ProductOption>> _search(String query) async {
    if (query.isEmpty) return [];
    final api = ref.read(apiClientProvider);
    final response = await api.dio.get('/products', queryParameters: {'search': query, 'pageSize': 10});
    final data = (response.data as Map<String, dynamic>)['data'] as List;
    return data
        .map((e) => ProductOption(
              id: e['id'] as String,
              sku: e['sku'] as String,
              name: e['name'] as String,
              sellingPrice: double.tryParse(e['selling_price']?.toString() ?? '0') ?? 0,
              costPrice: double.tryParse(e['cost_price']?.toString() ?? '0') ?? 0,
            ))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Autocomplete<ProductOption>(
      displayStringForOption: (p) => p.toString(),
      optionsBuilder: (textValue) => _search(textValue.text),
      onSelected: widget.onSelected,
      fieldViewBuilder: (context, controller, focusNode, onSubmitted) {
        return TextField(
          controller: controller,
          focusNode: focusNode,
          decoration: InputDecoration(labelText: widget.labelText, border: const OutlineInputBorder()),
        );
      },
    );
  }
}
