import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_providers.dart';

final _subscriptionProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/subscription');
  return response.data as Map<String, dynamic>;
});

const _plans = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_subscriptionProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Failed to load: $e')),
        data: (sub) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Current plan: ${sub['plan']}', style: Theme.of(context).textTheme.titleLarge),
              Text('Status: ${sub['status']}'),
              Text('Seats: ${sub['seats']}'),
              const SizedBox(height: 16),
              Text('Change plan', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _plans
                    .map((p) => ChoiceChip(
                          label: Text(p),
                          selected: sub['plan'] == p,
                          onSelected: (_) async {
                            final api = ref.read(apiClientProvider);
                            await api.dio.patch('/subscription', data: {'plan': p});
                            ref.invalidate(_subscriptionProvider);
                          },
                        ))
                    .toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
