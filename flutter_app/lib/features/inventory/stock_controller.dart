import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/paginated_response.dart';
import '../../shared/widgets/app_data_table.dart';
import 'stock_model.dart';
import 'stock_repository.dart';

class StockListState {
  final ListLoadState loadState;
  final PaginatedResponse<StockBalance>? response;
  final ListQueryState query;
  final String? errorMessage;

  const StockListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  StockListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<StockBalance>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return StockListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class StockController extends StateNotifier<StockListState> {
  final StockRepository _repository;

  StockController(this._repository) : super(const StockListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.listStock(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load stock.');
    }
  }

  void updateQuery(ListQueryState query) {
    state = state.copyWith(query: query);
    load();
  }
}

final stockControllerProvider = StateNotifierProvider.autoDispose<StockController, StockListState>((ref) {
  return StockController(ref.watch(stockRepositoryProvider));
});

class StockLedgerListState {
  final ListLoadState loadState;
  final PaginatedResponse<StockLedgerEntry>? response;
  final ListQueryState query;
  final String? errorMessage;

  const StockLedgerListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  StockLedgerListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<StockLedgerEntry>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return StockLedgerListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class StockLedgerController extends StateNotifier<StockLedgerListState> {
  final StockRepository _repository;

  StockLedgerController(this._repository) : super(const StockLedgerListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.listLedger(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load stock ledger.');
    }
  }

  void updateQuery(ListQueryState query) {
    state = state.copyWith(query: query);
    load();
  }
}

final stockLedgerControllerProvider =
    StateNotifierProvider.autoDispose<StockLedgerController, StockLedgerListState>((ref) {
  return StockLedgerController(ref.watch(stockRepositoryProvider));
});
