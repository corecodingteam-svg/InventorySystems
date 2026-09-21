import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/paginated_response.dart';
import '../auth/auth_providers.dart';
import 'stock_count_model.dart';

class StockCountsRepository {
  final ApiClient _api;
  StockCountsRepository(this._api);

  Future<PaginatedResponse<StockCountSummary>> list(ListQueryState query) async {
    final response = await _api.dio.get('/stock-counts', queryParameters: query.toQueryParameters());
    return PaginatedResponse.fromJson(response.data as Map<String, dynamic>, StockCountSummary.fromJson);
  }

  Future<StockCountDetail> findOne(String id) async {
    final response = await _api.dio.get('/stock-counts/$id');
    return StockCountDetail.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> create(String warehouseId, {String countType = 'CYCLE'}) {
    return _api.dio.post('/stock-counts', data: {'warehouseId': warehouseId, 'countType': countType});
  }

  Future<void> start(String id) => _api.dio.post('/stock-counts/$id/start');

  Future<void> submit(String id, List<StockCountLine> lines) {
    return _api.dio.post('/stock-counts/$id/submit', data: {
      'lines': lines
          .where((l) => l.countedQuantity != null)
          .map((l) => {'lineId': l.id, 'countedQuantity': l.countedQuantity})
          .toList(),
    });
  }

  Future<void> approve(String id) => _api.dio.post('/stock-counts/$id/approve');
  Future<void> cancel(String id) => _api.dio.post('/stock-counts/$id/cancel');
}

final stockCountsRepositoryProvider = Provider<StockCountsRepository>((ref) {
  return StockCountsRepository(ref.watch(apiClientProvider));
});
