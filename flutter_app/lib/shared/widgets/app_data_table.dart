import 'package:flutter/material.dart';

import '../../core/models/paginated_response.dart';
import '../../core/theme/app_theme.dart';
import 'list_states.dart';

class AppColumn<T> {
  final String label;
  final String? sortKey;
  final Widget Function(T row) cellBuilder;
  const AppColumn({required this.label, this.sortKey, required this.cellBuilder});
}

class AppFilterOption {
  final String value;
  final String label;
  const AppFilterOption(this.value, this.label);
}

/// A server-side filter exposed in the toolbar as a dropdown chip. `key`
/// matches a query-parameter name the backend list endpoint already
/// understands (e.g. `status`, `warehouseId`) — selecting an option sets
/// `ListQueryState.filters[key]`, cleared by picking "All".
class AppFilter {
  final String key;
  final String label;
  final List<AppFilterOption> options;
  const AppFilter({required this.key, required this.label, required this.options});
}

enum ListLoadState { loading, loaded, error }

/// One icon-button action rendered per row (View/Edit/Delete, or entity-
/// specific equivalents like Cancel). `enabled` lets a screen grey out e.g.
/// Delete for a row whose current state doesn't allow it.
class RowAction<T> {
  final IconData icon;
  final String tooltip;
  final void Function(T row) onTap;
  final Color? color;
  final bool Function(T row)? enabledWhen;

  const RowAction({required this.icon, required this.tooltip, required this.onTap, this.color, this.enabledWhen});

  bool isEnabled(T row) => enabledWhen == null || enabledWhen!(row);
}

/// The single reusable listing component used by every entity screen
/// (Products, Warehouses, Stock, ...) per the global listing standard:
/// server-side pagination/search/sort, a desktop table, and a mobile card
/// list, sharing one query state and one set of empty/loading/error states.
class AppDataTable<T> extends StatelessWidget {
  final ListLoadState state;
  final String? errorMessage;
  final PaginatedResponse<T>? response;
  final List<AppColumn<T>> columns;
  final Widget Function(T row) mobileCardBuilder;
  final ListQueryState query;
  final void Function(ListQueryState) onQueryChanged;
  final VoidCallback onRetry;
  final String entityNamePlural;
  final Widget? createAction;
  final void Function(T row)? onRowTap;
  final List<AppFilter> filters;
  final List<RowAction<T>> Function(T row)? rowActions;

  const AppDataTable({
    super.key,
    required this.state,
    this.errorMessage,
    this.response,
    required this.columns,
    required this.mobileCardBuilder,
    required this.query,
    required this.onQueryChanged,
    required this.onRetry,
    required this.entityNamePlural,
    this.createAction,
    this.onRowTap,
    this.filters = const [],
    this.rowActions,
  });

  Widget _actionsRow(BuildContext context, T row) {
    final actions = rowActions!(row);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: actions
          .map((a) => IconButton(
                icon: Icon(a.icon, size: 20),
                tooltip: a.tooltip,
                color: a.color,
                onPressed: a.isEnabled(row) ? () => a.onTap(row) : null,
                visualDensity: VisualDensity.compact,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ))
          .toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _Toolbar(
          query: query,
          onQueryChanged: onQueryChanged,
          onRetry: onRetry,
          createAction: createAction,
          sortableColumns: columns.where((c) => c.sortKey != null).toList(),
          filters: filters,
        ),
        Expanded(child: _buildBody(context)),
        if (response != null) _Pager(response: response!, query: query, onQueryChanged: onQueryChanged),
      ],
    );
  }

  Widget _buildBody(BuildContext context) {
    if (state == ListLoadState.loading && response == null) {
      return const AppLoadingSkeleton();
    }
    if (state == ListLoadState.error) {
      return AppErrorState(message: errorMessage ?? 'Something went wrong.', onRetry: onRetry);
    }
    final rows = response?.data ?? [];
    if (rows.isEmpty) {
      return AppEmptyState(
        title: 'No $entityNamePlural found.',
        message: (query.search?.isNotEmpty ?? false) || query.filters.isNotEmpty
            ? 'Try changing your search or filters.'
            : 'Get started by creating your first entry.',
      );
    }

    final width = MediaQuery.of(context).size.width;
    if (AppBreakpoints.isMobile(width)) {
      return ListView.separated(
        padding: const EdgeInsets.all(10),
        itemCount: rows.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            InkWell(
              onTap: onRowTap == null ? null : () => onRowTap!(rows[i]),
              child: mobileCardBuilder(rows[i]),
            ),
            if (rowActions != null)
              Align(alignment: Alignment.centerRight, child: _actionsRow(context, rows[i])),
          ],
        ),
      );
    }

    // DataTable sizes each column to its content by default, which on a wide
    // screen leaves columns bunched on the left with a large dead gap on the
    // right (or, with few columns, stretched unevenly) — neither reads as a
    // properly "sized" table. LayoutBuilder gives us the available width so
    // we can force the table to fill it: each column gets an even share,
    // with a floor so narrow columns (icons, short codes) don't get crushed
    // and a horizontal scroll still kicks in only if the floor pushes the
    // total past the viewport.
    return Padding(
      padding: const EdgeInsets.all(10),
      child: LayoutBuilder(
        builder: (context, constraints) {
        const minColumnWidth = 120.0;
        const actionsColumnWidth = 140.0;
        final hasActions = rowActions != null;
        final availableWidth = constraints.maxWidth;
        final dataColumnBudget = availableWidth - (hasActions ? actionsColumnWidth : 0);
        final evenWidth = dataColumnBudget / columns.length;
        final columnWidth = evenWidth < minColumnWidth ? minColumnWidth : evenWidth;
        final tableWidth = columnWidth * columns.length + (hasActions ? actionsColumnWidth : 0);

        final table = Theme(
          // Borderless, spacious row styling (no cell/divider lines,
          // generous row height, muted uppercase-free header) — overrides
          // the app-wide DataTableTheme just for this table rather than
          // changing every DataTable in the app globally.
          data: Theme.of(context).copyWith(
            dataTableTheme: DataTableThemeData(
              headingRowColor: WidgetStateProperty.all(Colors.transparent),
              headingTextStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted),
              dataRowColor: WidgetStateProperty.all(Colors.transparent),
              dataTextStyle: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
              dividerThickness: 0,
              dataRowMinHeight: 56,
              dataRowMaxHeight: 64,
              headingRowHeight: 44,
            ),
          ),
          child: DataTable(
            sortColumnIndex: query.sortBy == null
                ? null
                : columns.indexWhere((c) => c.sortKey == query.sortBy).let((i) => i == -1 ? null : i),
            sortAscending: query.sortOrder == 'asc',
            columnSpacing: 24,
            dividerThickness: 0,
            columns: [
              ...columns.map((c) => DataColumn(
                    label: SizedBox(width: columnWidth - 24, child: Text(c.label, overflow: TextOverflow.ellipsis)),
                    onSort: c.sortKey == null
                        ? null
                        : (_, __) {
                            final ascending = query.sortBy == c.sortKey ? query.sortOrder != 'asc' : true;
                            onQueryChanged(query.copyWith(sortBy: c.sortKey, sortOrder: ascending ? 'asc' : 'desc'));
                          },
                  )),
              if (hasActions) const DataColumn(label: Text('Action')),
            ],
            rows: rows
                .map((row) => DataRow(
                      color: WidgetStateProperty.resolveWith((states) {
                        if (states.contains(WidgetState.hovered)) return AppColors.subtle;
                        return Colors.transparent;
                      }),
                      onSelectChanged: onRowTap == null ? null : (_) => onRowTap!(row),
                      cells: [
                        ...columns.map((c) => DataCell(SizedBox(width: columnWidth - 24, child: c.cellBuilder(row)))),
                        if (hasActions) DataCell(_actionsRow(context, row)),
                      ],
                    ))
                .toList(),
          ),
        );

        if (tableWidth <= availableWidth) {
          return SizedBox(width: availableWidth, child: table);
        }
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SizedBox(width: tableWidth, child: table),
        );
        },
      ),
    );
  }
}

extension _Let<T> on T {
  R let<R>(R Function(T) f) => f(this);
}

class _Toolbar extends StatefulWidget {
  final ListQueryState query;
  final void Function(ListQueryState) onQueryChanged;
  final VoidCallback onRetry;
  final Widget? createAction;
  final List<AppColumn> sortableColumns;
  final List<AppFilter> filters;

  const _Toolbar({
    required this.query,
    required this.onQueryChanged,
    required this.onRetry,
    this.createAction,
    this.sortableColumns = const [],
    this.filters = const [],
  });

  @override
  State<_Toolbar> createState() => _ToolbarState();
}

class _ToolbarState extends State<_Toolbar> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.query.search ?? '');
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  DateTime? _lastKeystroke;

  void _onSearchChanged(String value) {
    final now = DateTime.now();
    _lastKeystroke = now;
    // Debounce: only fire the query update if no keystroke arrives within 400ms.
    Future.delayed(const Duration(milliseconds: 400), () {
      if (_lastKeystroke == now) {
        widget.onQueryChanged(widget.query.copyWith(search: value, page: 1));
      }
    });
  }

  Widget _searchField() {
    return TextField(
      controller: _searchController,
      decoration: const InputDecoration(
        prefixIcon: Icon(Icons.search),
        hintText: 'Search...',
        isDense: true,
        border: OutlineInputBorder(),
      ),
      onChanged: _onSearchChanged,
    );
  }

  Widget _sortButton() {
    if (widget.sortableColumns.isEmpty) return const SizedBox.shrink();
    final activeLabel = widget.sortableColumns
        .where((c) => c.sortKey == widget.query.sortBy)
        .map((c) => c.label)
        .firstOrNull;

    return PopupMenuButton<String>(
      tooltip: 'Sort',
      // Column-header tap-to-sort only exists on the desktop DataTable
      // layout, so the mobile card view had no way to sort at all —
      // this button makes sorting reachable at every breakpoint.
      // A plain decorated Container (not a button) as the child: a real
      // button here would swallow the tap in its own InkWell before it
      // reaches PopupMenuButton's GestureDetector, so the menu would never
      // open.
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Theme.of(context).colorScheme.outline),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.swap_vert, size: 18),
            const SizedBox(width: 6),
            Text(activeLabel == null ? 'Sort' : '$activeLabel ${widget.query.sortOrder == 'asc' ? '↑' : '↓'}'),
          ],
        ),
      ),
      itemBuilder: (context) => widget.sortableColumns.expand((c) => [
            PopupMenuItem(value: '${c.sortKey}:asc', child: Text('${c.label} (A–Z)')),
            PopupMenuItem(value: '${c.sortKey}:desc', child: Text('${c.label} (Z–A)')),
          ]).toList(),
      onSelected: (value) {
        final parts = value.split(':');
        widget.onQueryChanged(widget.query.copyWith(sortBy: parts[0], sortOrder: parts[1], page: 1));
      },
    );
  }

  Widget _filterChip(AppFilter filter) {
    final activeValue = widget.query.filters[filter.key];
    final activeLabel = activeValue == null
        ? null
        : filter.options.where((o) => o.value == activeValue).map((o) => o.label).firstOrNull;

    return PopupMenuButton<String?>(
      tooltip: filter.label,
      // Same reasoning as _sortButton: a plain Container, not a real
      // button, so PopupMenuButton's own tap handler is the one that fires.
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: activeLabel == null ? Theme.of(context).colorScheme.outline : AppColors.primary),
          color: activeLabel == null ? null : AppColors.primaryLight,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.filter_alt_outlined, size: 18, color: activeLabel == null ? null : AppColors.primary),
            const SizedBox(width: 6),
            Text(
              activeLabel == null ? filter.label : '${filter.label}: $activeLabel',
              style: activeLabel == null ? null : const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
      itemBuilder: (context) => [
        PopupMenuItem<String?>(value: null, child: Text('All ${filter.label}')),
        ...filter.options.map((o) => PopupMenuItem<String?>(value: o.value, child: Text(o.label))),
      ],
      onSelected: (value) {
        final next = Map<String, String>.from(widget.query.filters);
        if (value == null) {
          next.remove(filter.key);
        } else {
          next[filter.key] = value;
        }
        widget.onQueryChanged(widget.query.copyWith(filters: next, page: 1));
      },
    );
  }

  Widget _filterRow() {
    if (widget.filters.isEmpty) return const SizedBox.shrink();
    final hasActive = widget.query.filters.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          ...widget.filters.map(_filterChip),
          if (hasActive)
            TextButton.icon(
              onPressed: () => widget.onQueryChanged(widget.query.copyWith(filters: const {}, page: 1)),
              icon: const Icon(Icons.close, size: 16),
              label: const Text('Clear filters'),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Below ~560px a Row with [search | refresh | Create] can squeeze the
    // create button (or the whole toolbar) into overflow — this is why it
    // could look "missing" on some pages at narrow widths. Below that
    // threshold the search field gets its own full-width row and the
    // actions move to a second row, so Create is never at risk of being
    // clipped regardless of screen size.
    final narrow = MediaQuery.of(context).size.width < 560;

    if (narrow) {
      return Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _searchField(),
            const SizedBox(height: 8),
            Row(
              children: [
                if (widget.sortableColumns.isNotEmpty) ...[_sortButton(), const SizedBox(width: 8)],
                IconButton(icon: const Icon(Icons.refresh), tooltip: 'Refresh', onPressed: widget.onRetry),
                const Spacer(),
                if (widget.createAction != null) widget.createAction!,
              ],
            ),
            _filterRow(),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: _searchField()),
              if (widget.sortableColumns.isNotEmpty) ...[const SizedBox(width: 8), _sortButton()],
              const SizedBox(width: 8),
              IconButton(icon: const Icon(Icons.refresh), tooltip: 'Refresh', onPressed: widget.onRetry),
              if (widget.createAction != null) ...[const SizedBox(width: 8), widget.createAction!],
            ],
          ),
          _filterRow(),
        ],
      ),
    );
  }
}

class _Pager extends StatelessWidget {
  final PaginatedResponse response;
  final ListQueryState query;
  final void Function(ListQueryState) onQueryChanged;

  const _Pager({required this.response, required this.query, required this.onQueryChanged});

  @override
  Widget build(BuildContext context) {
    final p = response.pagination;
    final start = p.total == 0 ? 0 : (p.page - 1) * p.pageSize + 1;
    final end = (p.page * p.pageSize).clamp(0, p.total);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('Showing $start–$end of ${p.total}', style: Theme.of(context).textTheme.bodySmall),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: p.page > 1 ? () => onQueryChanged(query.copyWith(page: p.page - 1)) : null,
              ),
              Text('${p.page} / ${p.totalPages}'),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: p.page < p.totalPages ? () => onQueryChanged(query.copyWith(page: p.page + 1)) : null,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
