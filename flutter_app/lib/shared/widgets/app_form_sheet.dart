import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Shows every create/edit form as a large slide-over sheet — header with
/// a back arrow, title and close button, a light-gray body holding a white
/// "Information" card of fields, and a footer bar with Cancel/Save — in
/// place of the small centered AlertDialogs used previously. Returns
/// whatever the caller pops with (mirrors `showDialog<bool>`'s contract:
/// pop(true) to confirm, pop(false)/null to cancel).
Future<T?> showAppFormSheet<T>(
  BuildContext context, {
  required String title,
  required Widget child,
  String cardTitle = 'Information',
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.5),
    builder: (sheetContext) => _AppFormSheetShell(title: title, cardTitle: cardTitle, child: child),
  );
}

class _AppFormSheetShell extends StatelessWidget {
  final String title;
  final String cardTitle;
  final Widget child;

  const _AppFormSheetShell({required this.title, required this.cardTitle, required this.child});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 600;
    final sheetWidth = isMobile ? size.width : (size.width * 0.7).clamp(480.0, 760.0);
    final sheetHeight = size.height * (isMobile ? 0.94 : 0.9);

    return Align(
      alignment: Alignment.topCenter,
      child: Padding(
        padding: EdgeInsets.only(top: size.height * 0.05),
        child: Material(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          clipBehavior: Clip.antiAlias,
          elevation: 12,
          child: SizedBox(
            width: sheetWidth,
            height: sheetHeight,
            child: Column(
              children: [
                _Header(title: title),
                Expanded(
                  child: Container(
                    color: AppColors.background,
                    padding: const EdgeInsets.all(20),
                    child: SingleChildScrollView(
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(cardTitle, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 16),
                            child,
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String title;
  const _Header({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          _CircleIconButton(icon: Icons.arrow_back, onTap: () => Navigator.of(context).maybePop()),
          const SizedBox(width: 12),
          Expanded(child: Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700))),
          _CircleIconButton(icon: Icons.close, onTap: () => Navigator.of(context).maybePop()),
        ],
      ),
    );
  }
}

class _CircleIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircleIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: AppColors.border)),
        child: Icon(icon, size: 18, color: AppColors.textSecondary),
      ),
    );
  }
}

/// Small bold label placed above a field inside an [showAppFormSheet] form
/// — matches the reference design's "Reference Number" / "Date" / ...
/// labels sitting above each rounded input rather than inside it.
class FieldLabel extends StatelessWidget {
  final String text;
  const FieldLabel(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
    );
  }
}

/// Footer action bar (Cancel / Save) — placed inside the caller's `child`
/// at the bottom of the form, since the form's own height is variable
/// (StatefulBuilder-driven dropdowns, validation errors, ...) and a fixed
/// footer outside the scroll area would either clip long forms or leave
/// dead space on short ones.
class AppFormSheetActions extends StatelessWidget {
  final VoidCallback onCancel;
  final VoidCallback onSave;
  final String saveLabel;
  final bool saving;

  const AppFormSheetActions({
    super.key,
    required this.onCancel,
    required this.onSave,
    this.saveLabel = 'Save',
    this.saving = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          OutlinedButton(onPressed: saving ? null : onCancel, child: const Text('Cancel')),
          const SizedBox(width: 12),
          FilledButton(
            onPressed: saving ? null : onSave,
            child: saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(saveLabel),
          ),
        ],
      ),
    );
  }
}
