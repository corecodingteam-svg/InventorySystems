import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/paginated_response.dart';
import '../../shared/widgets/app_data_table.dart';
import 'sales_order_model.dart';
import 'sales_orders_repository.dart';

class SalesOrdersListState {
  final ListLoadState loadState;
  final PaginatedResponse<SalesOrderSummary>? response;
  final ListQueryState query;
  final String? errorMessage;

  const SalesOrdersListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  SalesOrdersListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<SalesOrderSummary>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return SalesOrdersListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class SalesOrdersController extends StateNotifier<SalesOrdersListState> {
  final SalesOrdersRepository _repository;

  SalesOrdersController(this._repository) : super(const SalesOrdersListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.list(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load sales orders.');
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

final salesOrdersControllerProvider =
    StateNotifierProvider.autoDispose<SalesOrdersController, SalesOrdersListState>((ref) {
  return SalesOrdersController(ref.watch(salesOrdersRepositoryProvider));
});

final salesOrderDetailProvider = FutureProvider.autoDispose.family<SalesOrderDetail, String>((ref, id) {
  return ref.watch(salesOrdersRepositoryProvider).findOne(id);
});
