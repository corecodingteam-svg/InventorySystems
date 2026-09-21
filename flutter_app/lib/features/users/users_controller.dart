import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/paginated_response.dart';
import '../../shared/widgets/app_data_table.dart';
import 'user_model.dart';
import 'users_repository.dart';

class UsersListState {
  final ListLoadState loadState;
  final PaginatedResponse<AppUser>? response;
  final ListQueryState query;
  final String? errorMessage;

  const UsersListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  UsersListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<AppUser>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return UsersListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class UsersController extends StateNotifier<UsersListState> {
  final UsersRepository _repository;

  UsersController(this._repository) : super(const UsersListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.list(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load users.');
    }
  }

  void updateQuery(ListQueryState query) {
    state = state.copyWith(query: query);
    load();
  }

  Future<void> create(String email, String password, String fullName) async {
    await _repository.create(email: email, password: password, fullName: fullName);
    await load();
  }

  Future<void> update(String id, {String? fullName, String? status}) async {
    await _repository.update(id, fullName: fullName, status: status);
    await load();
  }

  Future<void> remove(String id) async {
    await _repository.remove(id);
    await load();
  }
}

final usersControllerProvider = StateNotifierProvider.autoDispose<UsersController, UsersListState>((ref) {
  return UsersController(ref.watch(usersRepositoryProvider));
});
