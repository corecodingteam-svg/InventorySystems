import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/simple_form_dialog.dart';
import '../../shared/widgets/simple_list_screen.dart';
import '../../shared/widgets/status_badge.dart';
import 'pos_models.dart';
import 'pos_repository.dart';
import 'pos_session_screen.dart';

class PosRegistersScreen extends ConsumerWidget {
  const PosRegistersScreen({super.key});

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Create Register',
      fields: [
        SimpleFormField(key: 'warehouseId', label: 'Warehouse ID (UUID)'),
        SimpleFormField(key: 'name', label: 'Name'),
        SimpleFormField(key: 'code', label: 'Code'),
      ],
    );
    if (result != null) {
      try {
        await ref
            .read(posRepositoryProvider)
            .createRegister(warehouseId: result['warehouseId']!, name: result['name']!, code: result['code']!);
        ref.invalidate(posRegistersProvider);
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
        }
      }
    }
  }

  Future<void> _openSession(BuildContext context, WidgetRef ref, PosRegister register) async {
    final result = await showSimpleFormDialog(
      context,
      title: 'Open Session — ${register.name}',
      fields: [SimpleFormField(key: 'openingCash', label: 'Opening cash', keyboardType: TextInputType.number)],
      submitLabel: 'Open',
    );
    if (result == null) return;
    try {
      final session = await ref
          .read(posRepositoryProvider)
          .openSession(registerId: register.id, openingCash: double.tryParse(result['openingCash']!) ?? 0);
      if (context.mounted) {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => PosSessionScreen(sessionId: session.id)));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to open session: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SimpleListScreen<PosRegister>(
      title: 'POS Registers',
      provider: posRegistersProvider,
      emptyMessage: 'Create a register to start taking POS sales.',
      createAction: FloatingActionButton.extended(
        onPressed: () => _create(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New Register'),
      ),
      itemBuilder: (context, register) => Card(
        child: ListTile(
          title: Text(register.name),
          subtitle: Text('Code: ${register.code}'),
          trailing: Wrap(
            spacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              StatusBadge(
                label: register.status.toUpperCase(),
                status: register.status == 'active' ? SemanticStatus.success : SemanticStatus.neutral,
              ),
              FilledButton(
                onPressed: () => _openSession(context, ref, register),
                child: const Text('Open Session'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
