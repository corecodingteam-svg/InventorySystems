import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/paginated_response.dart';
import '../../shared/widgets/app_data_table.dart';
import 'customer_model.dart';
import 'customers_repository.dart';

class CustomersListState {
  final ListLoadState loadState;
  final PaginatedResponse<Customer>? response;
  final ListQueryState query;
  final String? errorMessage;

  const CustomersListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  CustomersListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<Customer>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return CustomersListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class CustomersController extends StateNotifier<CustomersListState> {
  final CustomersRepository _repository;

  CustomersController(this._repository) : super(const CustomersListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.list(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load customers.');
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

final customersControllerProvider =
    StateNotifierProvider.autoDispose<CustomersController, CustomersListState>((ref) {
  return CustomersController(ref.watch(customersRepositoryProvider));
});
