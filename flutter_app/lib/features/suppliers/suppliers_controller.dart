import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/paginated_response.dart';
import '../../shared/widgets/app_data_table.dart';
import 'supplier_model.dart';
import 'suppliers_repository.dart';

class SuppliersListState {
  final ListLoadState loadState;
  final PaginatedResponse<Supplier>? response;
  final ListQueryState query;
  final String? errorMessage;

  const SuppliersListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  SuppliersListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<Supplier>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return SuppliersListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class SuppliersController extends StateNotifier<SuppliersListState> {
  final SuppliersRepository _repository;

  SuppliersController(this._repository) : super(const SuppliersListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.list(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load suppliers.');
    }
  }

  void updateQuery(ListQueryState query) {
    state = state.copyWith(query: query);
    load();
  }

  Future<void> create({required String name, required String code, String? email, String? phone}) async {
    await _repository.create(name: name, code: code, email: email, phone: phone);
    await load();
  }

  Future<void> update(String id, {String? name, String? email, String? phone, String? status}) async {
    await _repository.update(id, name: name, email: email, phone: phone, status: status);
    await load();
  }
}

final suppliersControllerProvider =
    StateNotifierProvider.autoDispose<SuppliersController, SuppliersListState>((ref) {
  return SuppliersController(ref.watch(suppliersRepositoryProvider));
});
