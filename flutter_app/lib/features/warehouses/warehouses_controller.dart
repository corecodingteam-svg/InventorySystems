import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/paginated_response.dart';
import '../../shared/widgets/app_data_table.dart';
import 'warehouse_model.dart';
import 'warehouses_repository.dart';

class WarehousesListState {
  final ListLoadState loadState;
  final PaginatedResponse<Warehouse>? response;
  final ListQueryState query;
  final String? errorMessage;

  const WarehousesListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  WarehousesListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<Warehouse>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return WarehousesListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class WarehousesController extends StateNotifier<WarehousesListState> {
  final WarehousesRepository _repository;

  WarehousesController(this._repository) : super(const WarehousesListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.list(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load warehouses.');
    }
  }

  void updateQuery(ListQueryState query) {
    state = state.copyWith(query: query);
    load();
  }

  Future<void> create(String name, String code) async {
    await _repository.create(name, code);
    await load();
  }

  Future<void> update(String id, {String? name, String? status}) async {
    await _repository.update(id, name: name, status: status);
    await load();
  }
}

final warehousesControllerProvider =
    StateNotifierProvider.autoDispose<WarehousesController, WarehousesListState>((ref) {
  return WarehousesController(ref.watch(warehousesRepositoryProvider));
});
