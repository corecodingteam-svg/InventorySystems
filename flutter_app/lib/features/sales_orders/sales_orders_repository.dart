import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/paginated_response.dart';
import '../auth/auth_providers.dart';
import 'sales_order_model.dart';

class SalesOrdersRepository {
  final ApiClient _api;
  SalesOrdersRepository(this._api);

  Future<PaginatedResponse<SalesOrderSummary>> list(ListQueryState query) async {
    final response = await _api.dio.get('/sales-orders', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, SalesOrderSummary.fromJson);
  }

  Future<SalesOrderDetail> findOne(String id) async {
    final response = await _api.dio.get('/sales-orders/$id');
    return SalesOrderDetail.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> create({
    required String customerId,
    required String warehouseId,
    required List<Map<String, dynamic>> items,
  }) {
    return _api.dio.post('/sales-orders', data: {
      'customerId': customerId,
      'warehouseId': warehouseId,
      'items': items,
    });
  }

  Future<void> confirm(String id) => _api.dio.post('/sales-orders/$id/confirm');
  Future<void> cancel(String id) => _api.dio.post('/sales-orders/$id/cancel');

  Future<void> dispatchAllReserved(SalesOrderDetail so) {
    final items = so.items
        .where((i) => i.quantityDispatched < i.quantityReserved)
        .map((i) => {
              'salesOrderItemId': i.id,
              'quantity': i.quantityReserved - i.quantityDispatched,
            })
        .toList();
    return _api.dio.post('/sales-orders/${so.id}/dispatches', data: {'items': items});
  }
}

final salesOrdersRepositoryProvider = Provider<SalesOrdersRepository>((ref) {
  return SalesOrdersRepository(ref.watch(apiClientProvider));
});

/// Most recent sales orders for the dashboard's "Sales Order" table —
/// newest first, capped small since it's a preview, not the full list.
final recentSalesOrdersProvider = FutureProvider.autoDispose<List<SalesOrderSummary>>((ref) async {
  final repo = ref.watch(salesOrdersRepositoryProvider);
  final response = await repo.list(const ListQueryState(pageSize: 5));
  return response.data;
});
