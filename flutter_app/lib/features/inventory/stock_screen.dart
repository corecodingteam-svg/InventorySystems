import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_data_table.dart';
import '../../shared/widgets/status_badge.dart';
import '../warehouses/warehouses_repository.dart';
import 'stock_model.dart';
import 'stock_controller.dart';

class StockScreen extends ConsumerWidget {
  const StockScreen({super.key});

  SemanticStatus _statusFor(StockBalance s) {
    if (s.isOutOfStock) return SemanticStatus.error;
    if (s.isLowStock) return SemanticStatus.warning;
    return SemanticStatus.success;
  }

  String _labelFor(StockBalance s) {
    if (s.isOutOfStock) return 'OUT OF STOCK';
    if (s.isLowStock) return 'LOW STOCK';
    return 'IN STOCK';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(stockControllerProvider);
    final controller = ref.read(stockControllerProvider.notifier);
    final warehouseOptions = ref.watch(warehouseOptionsProvider).maybeWhen(
          data: (list) => list.map((w) => AppFilterOption(w.id, w.name)).toList(),
          orElse: () => const <AppFilterOption>[],
        );

    return Scaffold(
      appBar: AppBar(title: const Text('Stock')),
      body: AppDataTable<StockBalance>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'stock records',
        filters: [
          if (warehouseOptions.isNotEmpty) AppFilter(key: 'warehouseId', label: 'Warehouse', options: warehouseOptions),
        ],
        columns: [
          AppColumn(label: 'SKU', cellBuilder: (s) => Text(s.sku)),
          AppColumn(label: 'Product', cellBuilder: (s) => Text(s.productName)),
          AppColumn(label: 'Warehouse', cellBuilder: (s) => Text(s.warehouseName)),
          AppColumn(label: 'On Hand', cellBuilder: (s) => Text(s.onHand.toStringAsFixed(2))),
          AppColumn(label: 'Reserved', cellBuilder: (s) => Text(s.reserved.toStringAsFixed(2))),
          AppColumn(label: 'Available', cellBuilder: (s) => Text(s.available.toStringAsFixed(2))),
          AppColumn(
            label: 'Status',
            cellBuilder: (s) => StatusBadge(label: _labelFor(s), status: _statusFor(s)),
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
                    Expanded(child: Text(s.productName, style: Theme.of(context).textTheme.titleSmall)),
                    StatusBadge(label: _labelFor(s), status: _statusFor(s)),
                  ],
                ),
                Text('SKU: ${s.sku}  ·  ${s.warehouseName}', style: Theme.of(context).textTheme.bodySmall),
                Text(
                  'On hand ${s.onHand.toStringAsFixed(0)}  ·  Available ${s.available.toStringAsFixed(0)}',
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
