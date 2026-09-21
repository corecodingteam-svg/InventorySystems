import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final String? errorMessage;
  const AuthState({this.status = AuthStatus.unknown, this.errorMessage});

  AuthState copyWith({AuthStatus? status, String? errorMessage}) =>
      AuthState(status: status ?? this.status, errorMessage: errorMessage);
}

class AuthController extends StateNotifier<AuthState> {
  final ApiClient _api;
  AuthController(this._api) : super(const AuthState()) {
    _restore();
  }

  Future<void> _restore() async {
    final hasSession = await _api.hasSession();
    state = state.copyWith(
      status: hasSession ? AuthStatus.authenticated : AuthStatus.unauthenticated,
    );
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await _api.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      await _api.saveTokens(
        accessToken: response.data['accessToken'],
        refreshToken: response.data['refreshToken'],
      );
      state = state.copyWith(status: AuthStatus.authenticated, errorMessage: null);
      return true;
    } on Object {
      state = state.copyWith(errorMessage: 'Invalid email or password.');
      return false;
    }
  }

  Future<void> logout() async {
    await _api.clearTokens();
    state = state.copyWith(status: AuthStatus.unauthenticated);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(apiClientProvider));
});
