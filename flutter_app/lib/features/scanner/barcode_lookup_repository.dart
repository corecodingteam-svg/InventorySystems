import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_providers.dart';
import 'barcode_scan_result.dart';

class BarcodeLookupRepository {
  final Dio _dio;
  BarcodeLookupRepository(this._dio);

  Future<BarcodeScanResult?> lookup(String code) async {
    try {
      final response = await _dio.get('/products/barcode/$code');
      return BarcodeScanResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }
}

final barcodeLookupRepositoryProvider = Provider<BarcodeLookupRepository>((ref) {
  return BarcodeLookupRepository(ref.watch(apiClientProvider).dio);
});
