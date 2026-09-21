import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/paginated_response.dart';
import '../auth/auth_providers.dart';
import 'user_model.dart';

class UsersRepository {
  final ApiClient _api;
  UsersRepository(this._api);

  Future<PaginatedResponse<AppUser>> list(ListQueryState query) async {
    final response = await _api.dio.get('/users', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, AppUser.fromJson);
  }

  Future<void> create({required String email, required String password, required String fullName}) {
    return _api.dio.post('/users', data: {'email': email, 'password': password, 'fullName': fullName});
  }

  Future<void> update(String id, {String? fullName, String? status}) {
    return _api.dio.patch('/users/$id', data: {
      if (fullName != null && fullName.isNotEmpty) 'fullName': fullName,
      if (status != null) 'status': status,
    });
  }

  Future<void> remove(String id) => _api.dio.delete('/users/$id');
}

final usersRepositoryProvider = Provider<UsersRepository>((ref) {
  return UsersRepository(ref.watch(apiClientProvider));
});
