import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design language adopted from the "StockMind" inventory dashboard CSS
/// tokens: green brand, deep-green sidebar, Inter typography, rounded
/// cards (8-20px radii), pill status badges.
class AppColors {
  AppColors._();

  // Brand green
  static const primary = Color(0xFF00A63E);
  static const primaryDark = Color(0xFF008A34);
  static const primaryLight = Color(0xFFE6F8EE);

  static const secondary = Color(0xFF3B82F6);

  // Chart palette
  static const chartGreen = Color(0xFF00A63E);
  static const chartPurple = Color(0xFF7C5CFC);
  static const chartBlue = Color(0xFF3B82F6);
  static const chartYellow = Color(0xFFFACC15);
  static const chartRed = Color(0xFFF43F5E);

  // Semantic
  static const success = Color(0xFF16A34A);
  static const successLight = Color(0xFFDCFCE7);
  static const warning = Color(0xFFF59E0B);
  static const warningLight = Color(0xFFFEF3C7);
  static const error = Color(0xFFEF4444);
  static const errorLight = Color(0xFFFEE2E2);
  static const info = Color(0xFF0EA5E9);
  static const infoLight = Color(0xFFE0F2FE);

  // Surfaces
  static const surface = Color(0xFFFFFFFF);
  static const background = Color(0xFFF7F8FA);
  static const cardBg = Color(0xFFFFFFFF);
  static const subtle = Color(0xFFF1F5F9);

  // Text
  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF334155);
  static const textMuted = Color(0xFF64748B);
  static const textDisabled = Color(0xFF94A3B8);

  // Borders
  static const border = Color(0xFFE2E8F0);
  static const borderLight = Color(0xFFF1F5F9);
  static const borderStrong = Color(0xFFCBD5E1);

  // Dark green sidebar / drawer / app bar
  static const sidebarBg = Color(0xFF0E1F16);
  static const sidebarSoft = Color(0xFF16291E);
  static const sidebarBorder = Color(0x14FFFFFF); // rgba(255,255,255,0.08)
  static const sidebarText = Color(0xFFCBD5E1);
  static const appBarBg = Color(0xFF0E1F16);

  // Dark-mode surfaces (matches the .dark block of the CSS)
  static const darkBackground = Color(0xFF020617);
  static const darkSurface = Color(0xFF0F172A);
  static const darkBorder = Color(0xFF1E293B);
  static const darkTextPrimary = Color(0xFFF8FAFC);
  static const darkTextMuted = Color(0xFF94A3B8);
  static const darkPrimary = Color(0xFF16A34A);
}

/// Semantic status colors used by StatusBadge/StatTile/row coloring — see
/// the global listing standard. Light values match AppColors' semantic
/// pairs; dark values keep the same hues, adjusted for a dark background.
class AppStatusColors {
  final Color success;
  final Color successBg;
  final Color warning;
  final Color warningBg;
  final Color error;
  final Color errorBg;
  final Color info;
  final Color infoBg;
  final Color neutral;
  final Color neutralBg;

  const AppStatusColors({
    required this.success,
    required this.successBg,
    required this.warning,
    required this.warningBg,
    required this.error,
    required this.errorBg,
    required this.info,
    required this.infoBg,
    required this.neutral,
    required this.neutralBg,
  });

  static const light = AppStatusColors(
    success: Color(0xFF166534),
    successBg: AppColors.successLight,
    warning: Color(0xFF92400E),
    warningBg: AppColors.warningLight,
    error: Color(0xFF991B1B),
    errorBg: AppColors.errorLight,
    info: Color(0xFF1D4ED8),
    infoBg: AppColors.infoLight,
    neutral: Color(0xFF475569),
    neutralBg: Color(0xFFF1F5F9),
  );

  static const dark = AppStatusColors(
    success: Color(0xFF4ADE80),
    successBg: Color(0x5914532D), // rgb(20 83 45 / 0.35)
    warning: Color(0xFFFBBF24),
    warningBg: Color(0x59783C0F), // rgb(120 53 15 / 0.35)
    error: Color(0xFFF87171),
    errorBg: Color(0x597F1D1D), // rgb(127 29 29 / 0.35)
    info: Color(0xFF38BDF8),
    infoBg: Color(0x590C4A6E), // rgb(12 74 110 / 0.35)
    neutral: Color(0xFFCBD5E1),
    neutralBg: Color(0xFF1E293B),
  );
}

class AppTheme {
  AppTheme._();

  static ThemeData get light {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: Brightness.light,
        surface: AppColors.surface,
        primary: AppColors.primary,
      ),
      scaffoldBackgroundColor: AppColors.background,
      textTheme: _textTheme(base.textTheme, AppColors.textPrimary, AppColors.textSecondary, AppColors.textMuted),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.appBarBg,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white),
        iconTheme: const IconThemeData(color: Colors.white),
        actionsIconTheme: const IconThemeData(color: Colors.white),
        systemOverlayStyle: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.cardBg,
        elevation: 0,
        shadowColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: AppColors.border, width: 1)),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.borderLight,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border, width: 1)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border, width: 1)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.error)),
        focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.error, width: 1.5)),
        hintStyle: GoogleFonts.inter(fontSize: 13, color: AppColors.textDisabled),
        labelStyle: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted),
        errorStyle: GoogleFonts.inter(fontSize: 11, color: AppColors.error),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
          minimumSize: const Size(0, 48),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
          minimumSize: const Size(0, 44),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
          minimumSize: const Size(0, 44),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: CircleBorder(),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primaryLight,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return const IconThemeData(color: AppColors.primary, size: 22);
          return const IconThemeData(color: AppColors.textMuted, size: 22);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary);
          return GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textMuted);
        }),
        elevation: 0,
        shadowColor: AppColors.border,
        surfaceTintColor: Colors.transparent,
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        elevation: 8,
        surfaceTintColor: Colors.transparent,
      ),
      dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1, space: 1),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
        side: const BorderSide(color: AppColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      ),
      listTileTheme: const ListTileThemeData(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4), minLeadingWidth: 0),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: AppColors.textPrimary,
        contentTextStyle: GoogleFonts.inter(fontSize: 13, color: Colors.white),
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        elevation: 8,
        backgroundColor: AppColors.surface,
      ),
      dataTableTheme: DataTableThemeData(
        headingRowColor: WidgetStateProperty.all(AppColors.borderLight),
        headingTextStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted, letterSpacing: 0.3),
        dataRowColor: WidgetStateProperty.all(AppColors.surface),
        dataTextStyle: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
        dividerThickness: 1,
      ),
    );
  }

  static ThemeData get dark {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.darkPrimary,
        brightness: Brightness.dark,
        surface: AppColors.darkSurface,
        primary: AppColors.darkPrimary,
      ),
      scaffoldBackgroundColor: AppColors.darkBackground,
      textTheme: _textTheme(base.textTheme, AppColors.darkTextPrimary, AppColors.darkTextPrimary, AppColors.darkTextMuted),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.sidebarBg,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white),
      ),
      cardTheme: CardThemeData(
        color: AppColors.darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: AppColors.darkBorder, width: 1)),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.darkSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.darkBorder)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.darkBorder)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.darkPrimary, width: 1.5)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.darkPrimary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
          minimumSize: const Size(0, 48),
        ),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.darkBorder, thickness: 1, space: 1),
    );
  }

  static TextTheme _textTheme(TextTheme base, Color primaryText, Color secondaryText, Color mutedText) {
    return GoogleFonts.interTextTheme(base).copyWith(
      displayLarge: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: primaryText, letterSpacing: -0.5),
      headlineLarge: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w700, color: primaryText, letterSpacing: -0.3),
      headlineMedium: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: primaryText, letterSpacing: -0.3),
      headlineSmall: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600, color: primaryText),
      titleLarge: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: primaryText),
      titleMedium: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: secondaryText),
      titleSmall: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: secondaryText),
      bodyLarge: GoogleFonts.inter(fontSize: 15, color: primaryText, height: 1.5),
      bodyMedium: GoogleFonts.inter(fontSize: 13, color: secondaryText, height: 1.5),
      bodySmall: GoogleFonts.inter(fontSize: 12, color: mutedText, height: 1.4),
      labelLarge: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: primaryText),
      labelMedium: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: secondaryText),
      labelSmall: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.4, color: mutedText),
    );
  }
}

/// Responsive breakpoints shared by every listing/shell layout.
class AppBreakpoints {
  static const mobile = 600.0;
  static const tablet = 1024.0;
  static const desktop = 1440.0;

  static bool isMobile(double width) => width < mobile;
  static bool isTablet(double width) => width >= mobile && width < tablet;
  static bool isDesktop(double width) => width >= tablet;
}
