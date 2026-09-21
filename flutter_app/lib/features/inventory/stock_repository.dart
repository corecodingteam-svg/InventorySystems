import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/paginated_response.dart';
import '../auth/auth_providers.dart';
import 'stock_model.dart';

class StockRepository {
  final ApiClient _api;
  StockRepository(this._api);

  Future<PaginatedResponse<StockBalance>> listStock(ListQueryState query) async {
    final response = await _api.dio.get('/inventory/stock', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, StockBalance.fromJson);
  }

  Future<PaginatedResponse<StockLedgerEntry>> listLedger(ListQueryState query) async {
    final response = await _api.dio.get('/inventory/ledger', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, StockLedgerEntry.fromJson);
  }

  Future<void> adjust({
    required String productId,
    required String warehouseId,
    required String direction,
    required double quantity,
    String? notes,
  }) {
    return _api.dio.post('/inventory/adjustments', data: {
      'productId': productId,
      'warehouseId': warehouseId,
      'direction': direction,
      'quantity': quantity,
      if (notes != null) 'notes': notes,
    });
  }

  Future<void> transfer({
    required String productId,
    required String fromWarehouseId,
    required String toWarehouseId,
    required double quantity,
  }) {
    return _api.dio.post('/inventory/transfers', data: {
      'productId': productId,
      'fromWarehouseId': fromWarehouseId,
      'toWarehouseId': toWarehouseId,
      'quantity': quantity,
    });
  }
}

final stockRepositoryProvider = Provider<StockRepository>((ref) {
  return StockRepository(ref.watch(apiClientProvider));
});
