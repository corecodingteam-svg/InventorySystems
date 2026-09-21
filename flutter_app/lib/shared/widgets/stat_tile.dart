import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import 'status_badge.dart';

/// Dashboard stat card — icon chip over a big value and a muted label,
/// matching D:\motipaper\mobile_admin's `_StatCard` (see dashboard_screen.dart).
class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final SemanticStatus? status;

  const StatTile({super.key, required this.label, required this.value, required this.icon, this.status});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = isDark ? AppStatusColors.dark : AppStatusColors.light;
    final accent = switch (status) {
      SemanticStatus.success => colors.success,
      SemanticStatus.warning => colors.warning,
      SemanticStatus.error => colors.error,
      SemanticStatus.info => colors.info,
      _ => AppColors.primary,
    };

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2))],
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.border, width: 1),
      ),
      padding: const EdgeInsets.all(14),
      // mainAxisSize.min (not spaceBetween) so this never overflows
      // regardless of the aspect ratio a caller's grid gives it —
      // spaceBetween only distributes leftover space, it doesn't shrink
      // content that's taller than the cell, which is what clipped the
      // label text before this fix.
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(9)),
            child: Icon(icon, color: accent, size: 18),
          ),
          const SizedBox(height: 10),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value, style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: accent)),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
