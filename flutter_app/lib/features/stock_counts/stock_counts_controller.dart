import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/paginated_response.dart';
import '../../shared/widgets/app_data_table.dart';
import 'stock_count_model.dart';
import 'stock_counts_repository.dart';

class StockCountsListState {
  final ListLoadState loadState;
  final PaginatedResponse<StockCountSummary>? response;
  final ListQueryState query;
  final String? errorMessage;

  const StockCountsListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  StockCountsListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<StockCountSummary>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return StockCountsListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class StockCountsController extends StateNotifier<StockCountsListState> {
  final StockCountsRepository _repository;

  StockCountsController(this._repository) : super(const StockCountsListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.list(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load stock counts.');
    }
  }

  void updateQuery(ListQueryState query) {
    state = state.copyWith(query: query);
    load();
  }

  Future<void> cancel(String id) async {
    await _repository.cancel(id);
    await load();
  }
}

final stockCountsControllerProvider =
    StateNotifierProvider.autoDispose<StockCountsController, StockCountsListState>((ref) {
  return StockCountsController(ref.watch(stockCountsRepositoryProvider));
});

final stockCountDetailProvider = FutureProvider.autoDispose.family<StockCountDetail, String>((ref, id) {
  return ref.watch(stockCountsRepositoryProvider).findOne(id);
});
