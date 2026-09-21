import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/paginated_response.dart';
import '../auth/auth_providers.dart';
import 'customer_model.dart';

class CustomersRepository {
  final ApiClient _api;
  CustomersRepository(this._api);

  Future<PaginatedResponse<Customer>> list(ListQueryState query) async {
    final response = await _api.dio.get('/customers', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, Customer.fromJson);
  }

  Future<void> create({required String name, required String code, String? email, String? phone}) {
    return _api.dio.post('/customers', data: {
      'name': name,
      'code': code,
      if (email != null && email.isNotEmpty) 'email': email,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
    });
  }

  Future<void> update(String id, {String? name, String? email, String? phone, String? status}) {
    return _api.dio.patch('/customers/$id', data: {
      if (name != null && name.isNotEmpty) 'name': name,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
      if (status != null) 'status': status,
    });
  }
}

final customersRepositoryProvider = Provider<CustomersRepository>((ref) {
  return CustomersRepository(ref.watch(apiClientProvider));
});
