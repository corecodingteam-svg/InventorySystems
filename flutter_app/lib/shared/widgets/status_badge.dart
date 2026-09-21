import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

enum SemanticStatus { success, warning, error, info, neutral }

/// Centralized status -> color mapping. Feature screens map their own
/// business statuses (StockStatus, OrderStatus, ...) to a SemanticStatus
/// here rather than hard-coding colors inline — see the global listing
/// standard ("Row Color System") in the master spec.
class StatusBadge extends StatelessWidget {
  final String label;
  final SemanticStatus status;

  const StatusBadge({super.key, required this.label, required this.status});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = isDark ? AppStatusColors.dark : AppStatusColors.light;

    final (fg, bg) = switch (status) {
      SemanticStatus.success => (colors.success, colors.successBg),
      SemanticStatus.warning => (colors.warning, colors.warningBg),
      SemanticStatus.error => (colors.error, colors.errorBg),
      SemanticStatus.info => (colors.info, colors.infoBg),
      SemanticStatus.neutral => (colors.neutral, colors.neutralBg),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(
        label,
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.2),
      ),
    );
  }
}
