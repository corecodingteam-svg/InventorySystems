import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/paginated_response.dart';
import '../auth/auth_providers.dart';
import 'supplier_model.dart';

class SuppliersRepository {
  final ApiClient _api;
  SuppliersRepository(this._api);

  Future<PaginatedResponse<Supplier>> list(ListQueryState query) async {
    final response = await _api.dio.get('/suppliers', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, Supplier.fromJson);
  }

  Future<void> create({required String name, required String code, String? email, String? phone}) {
    return _api.dio.post('/suppliers', data: {
      'name': name,
      'code': code,
      if (email != null && email.isNotEmpty) 'email': email,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
    });
  }

  Future<void> update(String id, {String? name, String? email, String? phone, String? status}) {
    return _api.dio.patch('/suppliers/$id', data: {
      if (name != null && name.isNotEmpty) 'name': name,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
      if (status != null) 'status': status,
    });
  }
}

final suppliersRepositoryProvider = Provider<SuppliersRepository>((ref) {
  return SuppliersRepository(ref.watch(apiClientProvider));
});
