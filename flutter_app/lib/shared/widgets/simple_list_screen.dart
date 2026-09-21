import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'list_states.dart';

/// A lighter-weight sibling to AppDataTable for endpoints that return a
/// plain array (no server-side pagination) — most Settings/reference-data
/// lists (roles, tax categories, price lists, webhooks, ...). Backed by a
/// Riverpod FutureProvider.autoDispose<List<T>> so pull-to-refresh /
/// ref.invalidate just work.
class SimpleListScreen<T> extends ConsumerWidget {
  final String title;
  final AutoDisposeFutureProvider<List<T>> provider;
  final Widget Function(BuildContext, T) itemBuilder;
  final String emptyMessage;
  final Widget? createAction;

  const SimpleListScreen({
    super.key,
    required this.title,
    required this.provider,
    required this.itemBuilder,
    this.emptyMessage = 'Nothing here yet.',
    this.createAction,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncItems = ref.watch(provider);

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(provider)),
        ],
      ),
      floatingActionButton: createAction,
      body: asyncItems.when(
        loading: () => const AppLoadingSkeleton(),
        error: (err, _) => AppErrorState(
          message: 'Failed to load.',
          onRetry: () => ref.invalidate(provider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return AppEmptyState(title: 'Nothing here yet.', message: emptyMessage);
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(provider),
            child: ListView.separated(
              padding: const EdgeInsets.all(10),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) => itemBuilder(context, items[i]),
            ),
          );
        },
      ),
    );
  }
}
