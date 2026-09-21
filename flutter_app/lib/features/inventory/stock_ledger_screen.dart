import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/app_data_table.dart';
import '../warehouses/warehouses_repository.dart';
import 'stock_model.dart';
import 'stock_controller.dart';

const _transactionTypeOptions = [
  AppFilterOption('OPENING_STOCK', 'Opening Stock'),
  AppFilterOption('PURCHASE_RECEIPT', 'Purchase Receipt'),
  AppFilterOption('SALES_ISSUE', 'Sales Issue'),
  AppFilterOption('TRANSFER_OUT', 'Transfer Out'),
  AppFilterOption('TRANSFER_IN', 'Transfer In'),
  AppFilterOption('RETURN_IN', 'Return In'),
  AppFilterOption('RETURN_OUT', 'Return Out'),
  AppFilterOption('ADJUSTMENT_IN', 'Adjustment In'),
  AppFilterOption('ADJUSTMENT_OUT', 'Adjustment Out'),
  AppFilterOption('PRODUCTION_IN', 'Production In'),
  AppFilterOption('PRODUCTION_CONSUMPTION', 'Production Consumption'),
  AppFilterOption('DAMAGE', 'Damage'),
  AppFilterOption('EXPIRY', 'Expiry'),
  AppFilterOption('STOCK_RESERVATION', 'Stock Reservation'),
  AppFilterOption('STOCK_RELEASE', 'Stock Release'),
];

class StockLedgerScreen extends ConsumerWidget {
  const StockLedgerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(stockLedgerControllerProvider);
    final controller = ref.read(stockLedgerControllerProvider.notifier);
    final warehouseOptions = ref.watch(warehouseOptionsProvider).maybeWhen(
          data: (list) => list.map((w) => AppFilterOption(w.id, w.name)).toList(),
          orElse: () => const <AppFilterOption>[],
        );

    return Scaffold(
      appBar: AppBar(title: const Text('Stock Ledger')),
      body: AppDataTable<StockLedgerEntry>(
        state: state.loadState,
        errorMessage: state.errorMessage,
        response: state.response,
        query: state.query,
        onQueryChanged: controller.updateQuery,
        onRetry: controller.load,
        entityNamePlural: 'ledger entries',
        filters: [
          if (warehouseOptions.isNotEmpty) AppFilter(key: 'warehouseId', label: 'Warehouse', options: warehouseOptions),
          const AppFilter(key: 'transactionType', label: 'Type', options: _transactionTypeOptions),
        ],
        columns: [
          AppColumn(label: 'Type', cellBuilder: (e) => Text(e.transactionType)),
          AppColumn(label: 'In', cellBuilder: (e) => Text(e.quantityIn.toStringAsFixed(2))),
          AppColumn(label: 'Out', cellBuilder: (e) => Text(e.quantityOut.toStringAsFixed(2))),
          AppColumn(label: 'Balance', cellBuilder: (e) => Text(e.balanceQuantity.toStringAsFixed(2))),
          AppColumn(label: 'Date', cellBuilder: (e) => Text(e.createdAt.split('T').first)),
        ],
        mobileCardBuilder: (e) => Card(
          child: ListTile(
            title: Text(e.transactionType),
            subtitle: Text('In ${e.quantityIn.toStringAsFixed(0)}  ·  Out ${e.quantityOut.toStringAsFixed(0)}  ·  Balance ${e.balanceQuantity.toStringAsFixed(0)}'),
            trailing: Text(e.createdAt.split('T').first, style: Theme.of(context).textTheme.bodySmall),
          ),
        ),
      ),
    );
  }
}
