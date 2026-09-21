import 'package:flutter/material.dart';

import 'app_form_sheet.dart';

class SimpleFormField {
  final String key;
  final String label;
  final bool required;
  final TextInputType keyboardType;
  final String? initialValue;
  SimpleFormField({
    required this.key,
    required this.label,
    this.required = true,
    this.keyboardType = TextInputType.text,
    this.initialValue,
  });
}

/// A minimal, reusable "create/edit entity" form sheet for the many
/// Settings screens that just need a handful of text fields (name, code,
/// ...) rather than a bespoke form each time. For anything with line items
/// (purchase orders, sales orders) a dedicated screen is used instead.
Future<Map<String, String>?> showSimpleFormDialog(
  BuildContext context, {
  required String title,
  required List<SimpleFormField> fields,
  String submitLabel = 'Create',
}) {
  final controllers = {for (final f in fields) f.key: TextEditingController(text: f.initialValue)};
  final formKey = GlobalKey<FormState>();

  return showAppFormSheet<Map<String, String>>(
    context,
    title: title,
    cardTitle: '$title Information',
    child: Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final f in fields)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(f.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: controllers[f.key],
                    keyboardType: f.keyboardType,
                    decoration: InputDecoration(hintText: 'Enter ${f.label.toLowerCase()}'),
                    validator: f.required ? (v) => (v == null || v.isEmpty) ? '${f.label} is required' : null : null,
                  ),
                ],
              ),
            ),
          Builder(
            builder: (context) => AppFormSheetActions(
              saveLabel: submitLabel,
              onCancel: () => Navigator.of(context).pop(),
              onSave: () {
                if (formKey.currentState!.validate()) {
                  Navigator.of(context).pop({for (final f in fields) f.key: controllers[f.key]!.text});
                }
              },
            ),
          ),
        ],
      ),
    ),
  );
}
