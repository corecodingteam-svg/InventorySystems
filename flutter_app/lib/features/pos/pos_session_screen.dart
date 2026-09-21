import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/simple_form_dialog.dart';
import 'pos_models.dart';
import 'pos_repository.dart';
import 'pos_sale_screen.dart';

final _sessionProvider = FutureProvider.autoDispose.family<PosSession, String>((ref, id) {
  return ref.watch(posRepositoryProvider).findSession(id);
});

final _sessionSalesProvider = FutureProvider.autoDispose.family<List<PosSale>, String>((ref, id) {
  return ref.watch(posRepositoryProvider).listSales(id);
});

class PosSessionScreen extends ConsumerWidget {
  final String sessionId;
  const PosSessionScreen({super.key, required this.sessionId});

  Future<void> _close(BuildContext context, WidgetRef ref) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Close Session',
      fields: [SimpleFormField(key: 'closingCash', label: 'Counted closing cash', keyboardType: TextInputType.number)],
      submitLabel: 'Close',
    );
    if (result == null) return;
    try {
      final closed = await ref
          .read(posRepositoryProvider)
          .closeSession(sessionId, double.tryParse(result['closingCash']!) ?? 0);
      ref.invalidate(_sessionProvider(sessionId));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Closed. Expected cash: ${closed.expectedCash?.toStringAsFixed(2) ?? '-'}')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to close: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(_sessionProvider(sessionId));
    final sales = ref.watch(_sessionSalesProvider(sessionId));

    return Scaffold(
      appBar: AppBar(title: const Text('POS Session')),
      floatingActionButton: session.value?.status == 'OPEN'
          ? FloatingActionButton.extended(
              onPressed: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => PosSaleScreen(sessionId: sessionId)),
                );
                ref.invalidate(_sessionSalesProvider(sessionId));
              },
              icon: const Icon(Icons.point_of_sale),
              label: const Text('New Sale'),
            )
          : null,
      body: session.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed to load: $e')),
        data: (s) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Status: ${s.status}  ·  Opening cash: ${s.openingCash.toStringAsFixed(2)}'),
                  if (s.status == 'OPEN')
                    OutlinedButton(onPressed: () => _close(context, ref), child: const Text('Close Session')),
                ],
              ),
            ),
            Expanded(
              child: sales.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text('Failed to load sales: $e')),
                data: (list) => list.isEmpty
                    ? const Center(child: Text('No sales yet in this session.'))
                    : ListView.separated(
                        itemCount: list.length,
                        separatorBuilder: (_, __) => const Divider(),
                        itemBuilder: (context, i) => ListTile(
                          title: Text(list[i].saleNumber),
                          trailing: Text(list[i].totalAmount.toStringAsFixed(2)),
                          subtitle: Text(list[i].status),
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
