import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/paginated_response.dart';
import '../auth/auth_providers.dart';
import 'purchase_order_model.dart';

class PurchaseOrdersRepository {
  final ApiClient _api;
  PurchaseOrdersRepository(this._api);

  Future<PaginatedResponse<PurchaseOrderSummary>> list(ListQueryState query) async {
    final response = await _api.dio.get('/purchase-orders', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, PurchaseOrderSummary.fromJson);
  }

  Future<PurchaseOrderDetail> findOne(String id) async {
    final response = await _api.dio.get('/purchase-orders/$id');
    return PurchaseOrderDetail.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> create({
    required String supplierId,
    required String warehouseId,
    required List<Map<String, dynamic>> items,
  }) {
    return _api.dio.post('/purchase-orders', data: {
      'supplierId': supplierId,
      'warehouseId': warehouseId,
      'items': items,
    });
  }

  Future<void> approve(String id) => _api.dio.post('/purchase-orders/$id/approve');
  Future<void> cancel(String id) => _api.dio.post('/purchase-orders/$id/cancel');

  Future<void> receiveAllOutstanding(PurchaseOrderDetail po) {
    final items = po.items
        .where((i) => i.quantityReceived < i.quantityOrdered)
        .map((i) => {
              'purchaseOrderItemId': i.id,
              'quantity': i.quantityOrdered - i.quantityReceived,
            })
        .toList();
    return _api.dio.post('/purchase-orders/${po.id}/goods-receipts', data: {'items': items});
  }
}

final purchaseOrdersRepositoryProvider = Provider<PurchaseOrdersRepository>((ref) {
  return PurchaseOrdersRepository(ref.watch(apiClientProvider));
});
