import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_providers.dart';
import 'dashboard_summary_model.dart';

final dashboardSummaryProvider = FutureProvider.autoDispose<DashboardSummary>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/reports/dashboard');
  return DashboardSummary.fromJson(response.data as Map<String, dynamic>);
});
