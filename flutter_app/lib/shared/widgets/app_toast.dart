import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Consistent success/error toasts for every mutating action (create,
/// update, delete, cancel, ...) across the app, instead of each screen
/// rolling its own ad-hoc SnackBar (or, in most places before this, no
/// feedback on success at all).
class AppToast {
  AppToast._();

  static void success(BuildContext context, String message) => _show(context, message, isError: false);

  static void error(BuildContext context, String message) => _show(context, message, isError: true);

  static void _show(BuildContext context, String message, {required bool isError}) {
    if (!context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isError ? AppColors.error : AppColors.success,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        content: Row(
          children: [
            Icon(isError ? Icons.error_outline : Icons.check_circle_outline, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(child: Text(message, style: const TextStyle(color: Colors.white))),
          ],
        ),
        duration: Duration(seconds: isError ? 4 : 3),
      ),
    );
  }
}

/// Strips Dio's "Exception: " / DioException noise so toasts read as a
/// plain sentence instead of a stack-trace fragment.
String describeError(Object error) {
  final text = error.toString();
  final match = RegExp(r'"message":"([^"]+)"').firstMatch(text);
  if (match != null) return match.group(1)!;
  return text.replaceFirst(RegExp(r'^(DioException|Exception):\s*'), '');
}
