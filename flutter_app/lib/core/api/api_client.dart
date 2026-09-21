import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _kAccessTokenKey = 'access_token';
const _kRefreshTokenKey = 'refresh_token';

/// Centralized HTTP client. Feature repositories must go through this —
/// never call Dio/http directly from widgets or controllers.
class ApiClient {
  final Dio dio;
  final FlutterSecureStorage _storage;

  ApiClient({String baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  )}) : _storage = const FlutterSecureStorage(),
        dio = Dio(BaseOptions(baseUrl: baseUrl, connectTimeout: const Duration(seconds: 15))) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // A secure-storage read failure (e.g. platform channel unavailable)
        // must not abort the request — fall back to sending it
        // unauthenticated and let the server's 401 drive the normal
        // refresh/logout flow below, rather than every request silently
        // failing for an unrelated storage reason.
        String? token;
        try {
          token = await _storage.read(key: _kAccessTokenKey);
        } catch (_) {
          token = null;
        }
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final refreshed = await _tryRefresh();
          if (refreshed) {
            final clone = await _retry(error.requestOptions);
            return handler.resolve(clone);
          }
          await clearTokens();
        }
        handler.next(error);
      },
    ));
  }

  Future<bool> _tryRefresh() async {
    final refreshToken = await _storage.read(key: _kRefreshTokenKey);
    if (refreshToken == null) return false;
    try {
      final response = await Dio(BaseOptions(baseUrl: dio.options.baseUrl))
          .post('/auth/refresh', data: {'refreshToken': refreshToken});
      await saveTokens(
        accessToken: response.data['accessToken'],
        refreshToken: response.data['refreshToken'],
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<Response<dynamic>> _retry(RequestOptions requestOptions) {
    final options = Options(method: requestOptions.method, headers: requestOptions.headers);
    return dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _kAccessTokenKey, value: accessToken);
    await _storage.write(key: _kRefreshTokenKey, value: refreshToken);
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: _kAccessTokenKey);
    await _storage.delete(key: _kRefreshTokenKey);
  }

  Future<bool> hasSession() async {
    try {
      return (await _storage.read(key: _kAccessTokenKey)) != null;
    } catch (_) {
      return false;
    }
  }
}
