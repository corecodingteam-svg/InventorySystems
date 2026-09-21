import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/status_badge.dart';
import 'stock_count_model.dart';
import 'stock_counts_controller.dart';
import 'stock_counts_repository.dart';

SemanticStatus stockCountStatusSemantic(String status) => switch (status) {
      'DRAFT' => SemanticStatus.neutral,
      'IN_PROGRESS' => SemanticStatus.info,
      'SUBMITTED' => SemanticStatus.warning,
      'APPROVED' => SemanticStatus.success,
      'CANCELLED' => SemanticStatus.error,
      _ => SemanticStatus.neutral,
    };

class StockCountDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const StockCountDetailScreen({super.key, required this.id});

  @override
  ConsumerState<StockCountDetailScreen> createState() => _StockCountDetailScreenState();
}

class _StockCountDetailScreenState extends ConsumerState<StockCountDetailScreen> {
  final Map<String, TextEditingController> _controllers = {};

  TextEditingController _controllerFor(StockCountLine line) {
    return _controllers.putIfAbsent(
      line.id,
      () => TextEditingController(text: line.countedQuantity?.toString() ?? ''),
    );
  }

  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
      ref.invalidate(stockCountDetailProvider(widget.id));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(stockCountDetailProvider(widget.id));
    final repo = ref.read(stockCountsRepositoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Stock Count')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed to load: $e')),
        data: (count) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(count.countNumber, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(width: 12),
                  StatusBadge(label: count.status, status: stockCountStatusSemantic(count.status)),
                ],
              ),
              Text('Warehouse: ${count.warehouseName}  ·  Type: ${count.countType}'),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  if (count.status == 'DRAFT')
                    FilledButton(onPressed: () => _run(() => repo.start(count.id)), child: const Text('Start')),
                  if (count.status == 'DRAFT' || count.status == 'IN_PROGRESS')
                    FilledButton(
                      onPressed: () => _run(() => repo.submit(
                            count.id,
                            count.lines
                                .map((l) => StockCountLine(
                                      id: l.id,
                                      productId: l.productId,
                                      sku: l.sku,
                                      productName: l.productName,
                                      systemQuantity: l.systemQuantity,
                                      countedQuantity: double.tryParse(_controllerFor(l).text),
                                    ))
                                .toList(),
                          )),
                      child: const Text('Submit Counted Quantities'),
                    ),
                  if (count.status == 'SUBMITTED')
                    FilledButton(
                      onPressed: () => _run(() => repo.approve(count.id)),
                      child: const Text('Approve (post variance)'),
                    ),
                  if (!['APPROVED', 'CANCELLED'].contains(count.status))
                    OutlinedButton(onPressed: () => _run(() => repo.cancel(count.id)), child: const Text('Cancel')),
                ],
              ),
              const SizedBox(height: 16),
              Text('Lines', style: Theme.of(context).textTheme.titleMedium),
              Expanded(
                child: ListView.separated(
                  itemCount: count.lines.length,
                  separatorBuilder: (_, __) => const Divider(),
                  itemBuilder: (context, i) {
                    final line = count.lines[i];
                    final editable = count.status == 'DRAFT' || count.status == 'IN_PROGRESS';
                    return ListTile(
                      title: Text('${line.sku} — ${line.productName}'),
                      subtitle: Text('System qty: ${line.systemQuantity.toStringAsFixed(2)}'),
                      trailing: SizedBox(
                        width: 100,
                        child: TextField(
                          controller: _controllerFor(line),
                          enabled: editable,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Counted'),
                        ),
                      ),
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
