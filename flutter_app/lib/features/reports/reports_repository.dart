import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_providers.dart';

final lowStockReportProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/reports/inventory/low-stock');
  return response.data as List;
});

final stockValuationReportProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/reports/inventory/stock-valuation', queryParameters: {'pageSize': 100});
  return (response.data as Map<String, dynamic>)['data'] as List;
});

final salesByProductReportProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/reports/sales/by-product');
  return response.data as List;
});

final salesByCustomerReportProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/reports/sales/by-customer');
  return response.data as List;
});

final purchasesBySupplierReportProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/reports/purchases/by-supplier');
  return response.data as List;
});

final reorderForecastReportProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/reports/inventory/reorder-forecast');
  return response.data as List;
});

final warehouseActivityReportProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/reports/warehouse/activity');
  return response.data as List;
});
