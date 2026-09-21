import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/status_badge.dart';
import '../auth/permissions_provider.dart';
import 'purchase_orders_controller.dart';
import 'purchase_orders_repository.dart';
import 'purchase_orders_screen.dart' show poStatusSemantic;

class PurchaseOrderDetailScreen extends ConsumerWidget {
  final String id;
  const PurchaseOrderDetailScreen({super.key, required this.id});

  Future<void> _run(BuildContext context, WidgetRef ref, Future<void> Function() action) async {
    try {
      await action();
      ref.invalidate(purchaseOrderDetailProvider(id));
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(purchaseOrderDetailProvider(id));
    final repo = ref.read(purchaseOrdersRepositoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Purchase Order')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed to load: $e')),
        data: (po) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(po.poNumber, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(width: 12),
                  StatusBadge(label: po.status, status: poStatusSemantic(po.status)),
                ],
              ),
              const SizedBox(height: 4),
              Text('Supplier: ${po.supplierName}'),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  if ((po.status == 'DRAFT' || po.status == 'PENDING_APPROVAL') &&
                      ref.hasPermission('purchase.approve'))
                    FilledButton(
                      onPressed: () => _run(context, ref, () => repo.approve(po.id)),
                      child: const Text('Approve'),
                    ),
                  if ((po.status == 'APPROVED' || po.status == 'PARTIALLY_RECEIVED') &&
                      ref.hasPermission('purchase.receive'))
                    FilledButton(
                      onPressed: () => _run(context, ref, () => repo.receiveAllOutstanding(po)),
                      child: const Text('Receive Outstanding'),
                    ),
                  if (!['RECEIVED', 'CANCELLED'].contains(po.status) && ref.hasPermission('purchase.approve'))
                    OutlinedButton(
                      onPressed: () => _run(context, ref, () => repo.cancel(po.id)),
                      child: const Text('Cancel'),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Text('Line Items', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.separated(
                  itemCount: po.items.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (context, i) {
                    final item = po.items[i];
                    return ListTile(
                      title: Text(item.productLabel),
                      subtitle: Text('Ordered ${item.quantityOrdered.toStringAsFixed(0)} @ ${item.unitCost.toStringAsFixed(2)}'),
                      trailing: Text('Received ${item.quantityReceived.toStringAsFixed(0)}'),
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
