import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/status_badge.dart';
import '../auth/permissions_provider.dart';
import 'sales_orders_controller.dart';
import 'sales_orders_repository.dart';
import 'sales_orders_screen.dart' show soStatusSemantic;

class SalesOrderDetailScreen extends ConsumerWidget {
  final String id;
  const SalesOrderDetailScreen({super.key, required this.id});

  Future<void> _run(BuildContext context, WidgetRef ref, Future<void> Function() action) async {
    try {
      await action();
      ref.invalidate(salesOrderDetailProvider(id));
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(salesOrderDetailProvider(id));
    final repo = ref.read(salesOrdersRepositoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Sales Order')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed to load: $e')),
        data: (so) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(so.soNumber, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(width: 12),
                  StatusBadge(label: so.status, status: soStatusSemantic(so.status)),
                ],
              ),
              const SizedBox(height: 4),
              Text('Customer: ${so.customerName}'),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  if (so.status == 'DRAFT' && ref.hasPermission('sales.approve'))
                    FilledButton(
                      onPressed: () => _run(context, ref, () => repo.confirm(so.id)),
                      child: const Text('Confirm (reserve stock)'),
                    ),
                  if ((so.status == 'CONFIRMED' || so.status == 'PARTIALLY_DISPATCHED') &&
                      ref.hasPermission('sales.dispatch'))
                    FilledButton(
                      onPressed: () => _run(context, ref, () => repo.dispatchAllReserved(so)),
                      child: const Text('Dispatch Reserved'),
                    ),
                  if (!['DISPATCHED', 'CANCELLED'].contains(so.status) && ref.hasPermission('sales.approve'))
                    OutlinedButton(
                      onPressed: () => _run(context, ref, () => repo.cancel(so.id)),
                      child: const Text('Cancel'),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Text('Line Items', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.separated(
                  itemCount: so.items.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (context, i) {
                    final item = so.items[i];
                    return ListTile(
                      title: Text(item.productLabel),
                      subtitle: Text('Ordered ${item.quantityOrdered.toStringAsFixed(0)} @ ${item.unitPrice.toStringAsFixed(2)}'),
                      trailing: Text('Dispatched ${item.quantityDispatched.toStringAsFixed(0)}'),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
