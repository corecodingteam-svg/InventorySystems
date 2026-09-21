import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Colored initials bubble used as a stand-in for a photo/thumbnail in
/// table rows (Products, Customers, ...) — we have no image field for
/// these entities, so an initials avatar is the honest equivalent of the
/// reference design's product/customer photos.
class EntityAvatar extends StatelessWidget {
  final String label;
  final double radius;

  const EntityAvatar({super.key, required this.label, this.radius = 14});

  static const _palette = [
    AppColors.primary,
    AppColors.chartBlue,
    AppColors.chartPurple,
    AppColors.warning,
    AppColors.chartRed,
  ];

  @override
  Widget build(BuildContext context) {
    final trimmed = label.trim();
    final initial = trimmed.isNotEmpty ? trimmed[0].toUpperCase() : '?';
    final color = _palette[trimmed.codeUnits.fold<int>(0, (a, b) => a + b) % _palette.length];
    return CircleAvatar(
      radius: radius,
      backgroundColor: color.withValues(alpha: 0.15),
      child: Text(initial, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: radius * 0.85)),
    );
  }
}
