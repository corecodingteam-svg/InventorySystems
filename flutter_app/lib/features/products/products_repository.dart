import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/paginated_response.dart';
import '../auth/auth_providers.dart';
import 'product_model.dart';

class ProductsRepository {
  final ApiClient _api;
  ProductsRepository(this._api);

  Future<PaginatedResponse<Product>> list(ListQueryState query) async {
    final response = await _api.dio.get('/products', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, Product.fromJson);
  }

  Future<void> create({
    required String sku,
    required String name,
    required String baseUnitId,
    double costPrice = 0,
    double sellingPrice = 0,
  }) {
    return _api.dio.post('/products', data: {
      'sku': sku,
      'name': name,
      'baseUnitId': baseUnitId,
      'costPrice': costPrice,
      'sellingPrice': sellingPrice,
    });
  }

  Future<void> update(String id, {String? name, double? costPrice, double? sellingPrice, String? status}) {
    return _api.dio.patch('/products/$id', data: {
      if (name != null && name.isNotEmpty) 'name': name,
      if (costPrice != null) 'costPrice': costPrice,
      if (sellingPrice != null) 'sellingPrice': sellingPrice,
      if (status != null) 'status': status,
    });
  }

  Future<void> remove(String id) => _api.dio.delete('/products/$id');
}

final productsRepositoryProvider = Provider<ProductsRepository>((ref) {
  return ProductsRepository(ref.watch(apiClientProvider));
});
