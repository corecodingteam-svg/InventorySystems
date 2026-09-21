import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/widgets/list_states.dart';

/// Generic renderer for a report endpoint's row list — report shapes vary
/// (sales-by-product vs. warehouse-activity have completely different
/// columns), so rather than a bespoke typed screen per report this renders
/// each row's fields as a small key/value card. Good enough for an admin
/// to read the numbers; a dedicated chart/table per report is a follow-up
/// once specific reports need it.
class RawRowsScreen extends ConsumerWidget {
  final String title;
  final AutoDisposeFutureProvider<List<dynamic>> provider;

  const RawRowsScreen({super.key, required this.title, required this.provider});

  /// Builds a CSV from the loaded rows and copies it to the clipboard —
  /// the backend already supports `?format=csv` for a real file download,
  /// but that requires an Authorization header a plain browser navigation
  /// can't send; copy-to-clipboard works everywhere (desktop/web/mobile)
  /// without needing platform-specific file-save code.
  void _copyAsCsv(BuildContext context, List<dynamic> rows) {
    if (rows.isEmpty) return;
    final headers = (rows.first as Map<String, dynamic>).keys.toList();
    final lines = [headers.join(',')];
    for (final row in rows) {
      final map = row as Map<String, dynamic>;
      lines.add(headers.map((h) {
        final value = map[h]?.toString() ?? '';
        return value.contains(',') ? '"${value.replaceAll('"', '""')}"' : value;
      }).join(','));
    }
    Clipboard.setData(ClipboardData(text: lines.join('\n')));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${rows.length} rows copied as CSV — paste into a spreadsheet.')),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(provider);

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy_all_outlined),
            tooltip: 'Copy as CSV',
            onPressed: () => async.whenData((rows) => _copyAsCsv(context, rows)),
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(provider)),
        ],
      ),
      body: async.when(
        loading: () => const AppLoadingSkeleton(),
        error: (e, _) => AppErrorState(message: 'Failed to load report.', onRetry: () => ref.invalidate(provider)),
        data: (rows) {
          if (rows.isEmpty) {
            return const AppEmptyState(title: 'No data', message: 'Nothing to report for the current criteria.');
          }
          return ListView.separated(
            padding: const EdgeInsets.all(10),
            itemCount: rows.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final row = rows[i] as Map<String, dynamic>;
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Wrap(
                    spacing: 16,
                    runSpacing: 4,
                    children: row.entries
                        .map((e) => Text('${e.key}: ${e.value}', style: Theme.of(context).textTheme.bodySmall))
                        .toList(),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
