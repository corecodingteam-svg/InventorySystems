import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../auth/auth_providers.dart';
import 'pos_models.dart';

class PosRepository {
  final ApiClient _api;
  PosRepository(this._api);

  Future<List<PosRegister>> listRegisters() async {
    final response = await _api.dio.get('/pos/registers');
    return (response.data as List).map((e) => PosRegister.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createRegister({required String warehouseId, required String name, required String code}) {
    return _api.dio.post('/pos/registers', data: {'warehouseId': warehouseId, 'name': name, 'code': code});
  }

  Future<PosSession> openSession({required String registerId, required double openingCash}) async {
    final response = await _api.dio
        .post('/pos/sessions/open', data: {'registerId': registerId, 'openingCash': openingCash});
    return PosSession.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PosSession> findSession(String id) async {
    final response = await _api.dio.get('/pos/sessions/$id');
    return PosSession.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PosSession> closeSession(String id, double closingCash) async {
    final response = await _api.dio.post('/pos/sessions/$id/close', data: {'closingCash': closingCash});
    return PosSession.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<PosSale>> listSales(String sessionId) async {
    final response = await _api.dio.get('/pos/sessions/$sessionId/sales');
    return (response.data as List).map((e) => PosSale.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<PosSale> createSale({
    required String sessionId,
    required List<Map<String, dynamic>> items,
    required List<Map<String, dynamic>> payments,
  }) async {
    final response = await _api.dio.post('/pos/sessions/$sessionId/sales', data: {
      'items': items,
      'payments': payments,
    });
    return PosSale.fromJson(response.data as Map<String, dynamic>);
  }
}

final posRepositoryProvider = Provider<PosRepository>((ref) {
  return PosRepository(ref.watch(apiClientProvider));
});

final posRegistersProvider = FutureProvider.autoDispose<List<PosRegister>>((ref) {
  return ref.watch(posRepositoryProvider).listRegisters();
});
