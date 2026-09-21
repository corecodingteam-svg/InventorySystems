import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/paginated_response.dart';
import '../../shared/widgets/app_data_table.dart';
import 'purchase_order_model.dart';
import 'purchase_orders_repository.dart';

class PurchaseOrdersListState {
  final ListLoadState loadState;
  final PaginatedResponse<PurchaseOrderSummary>? response;
  final ListQueryState query;
  final String? errorMessage;

  const PurchaseOrdersListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  PurchaseOrdersListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<PurchaseOrderSummary>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return PurchaseOrdersListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class PurchaseOrdersController extends StateNotifier<PurchaseOrdersListState> {
  final PurchaseOrdersRepository _repository;

  PurchaseOrdersController(this._repository) : super(const PurchaseOrdersListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.list(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load purchase orders.');
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

final purchaseOrdersControllerProvider =
    StateNotifierProvider.autoDispose<PurchaseOrdersController, PurchaseOrdersListState>((ref) {
  return PurchaseOrdersController(ref.watch(purchaseOrdersRepositoryProvider));
});

final purchaseOrderDetailProvider =
    FutureProvider.autoDispose.family<PurchaseOrderDetail, String>((ref, id) {
  return ref.watch(purchaseOrdersRepositoryProvider).findOne(id);
});
