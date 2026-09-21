import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/paginated_response.dart';
import '../auth/auth_providers.dart';
import 'warehouse_model.dart';

class WarehousesRepository {
  final ApiClient _api;
  WarehousesRepository(this._api);

  Future<PaginatedResponse<Warehouse>> list(ListQueryState query) async {
    final response = await _api.dio.get('/warehouses', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, Warehouse.fromJson);
  }

  Future<void> create(String name, String code) {
    return _api.dio.post('/warehouses', data: {'name': name, 'code': code});
  }

  Future<void> update(String id, {String? name, String? status}) {
    return _api.dio.patch('/warehouses/$id', data: {
      if (name != null && name.isNotEmpty) 'name': name,
      if (status != null) 'status': status,
    });
  }
}

final warehousesRepositoryProvider = Provider<WarehousesRepository>((ref) {
  return WarehousesRepository(ref.watch(apiClientProvider));
});

/// Full (unpaginated, up to 250) warehouse id→name list for filter dropdowns
/// elsewhere (Stock, Stock Ledger, Stock Counts) — those screens only need
/// options to filter by, not a paginated browse.
final warehouseOptionsProvider = FutureProvider.autoDispose<List<Warehouse>>((ref) async {
  final repo = ref.watch(warehousesRepositoryProvider);
  final response = await repo.list(const ListQueryState(pageSize: 250));
  return response.data;
});
