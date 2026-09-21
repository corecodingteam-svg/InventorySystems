import 'package:flutter/material.dart';

import '../../shared/widgets/generic_admin_list_screen.dart';
import '../../shared/widgets/simple_form_dialog.dart';
import '../units_categories_brands/units_categories_brands_screen.dart';
import '../users/users_screen.dart';
import 'custom_fields_screen.dart';
import 'subscription_screen.dart';

class _SettingsLink {
  final String title;
  final IconData icon;
  final WidgetBuilder builder;
  const _SettingsLink(this.title, this.icon, this.builder);
}

class SettingsHubScreen extends StatelessWidget {
  const SettingsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final links = <_SettingsLink>[
      _SettingsLink('Users', Icons.people_outline, (_) => const UsersScreen()),
      _SettingsLink(
        'Roles',
        Icons.admin_panel_settings_outlined,
        (_) => GenericAdminListScreen(
          title: 'Roles',
          path: '/roles',
          titleOf: (r) => r['name'] as String,
          subtitleOf: (r) => (r['is_system'] as bool) ? 'System role' : 'Custom role',
          createFields: [SimpleFormField(key: 'name', label: 'Role name')],
          buildCreatePayload: (v) => {'name': v['name'], 'permissionCodes': <String>[]},
        ),
      ),
      _SettingsLink('Units / Categories / Brands', Icons.category_outlined, (_) => const UnitsCategoriesBrandsScreen()),
      _SettingsLink('Custom Fields', Icons.dynamic_form_outlined, (_) => const CustomFieldsScreen()),
      _SettingsLink(
        'Tax Categories',
        Icons.receipt_long_outlined,
        (_) => GenericAdminListScreen(
          title: 'Tax Categories',
          path: '/tax/categories',
          titleOf: (r) => r['name'] as String,
          subtitleOf: (r) => 'Code: ${r['code']}',
          createFields: [
            SimpleFormField(key: 'name', label: 'Name'),
            SimpleFormField(key: 'code', label: 'Code'),
          ],
          deletePathOf: (r) => '/tax/categories/${r['id']}',
        ),
      ),
      _SettingsLink(
        'Price Lists',
        Icons.sell_outlined,
        (_) => GenericAdminListScreen(
          title: 'Price Lists',
          path: '/pricing/price-lists',
          titleOf: (r) => r['name'] as String,
          subtitleOf: (r) => 'Scope: ${r['scope']}',
          createFields: [
            SimpleFormField(key: 'name', label: 'Name'),
            SimpleFormField(key: 'scope', label: 'Scope (GENERAL, CUSTOMER, WAREHOUSE)', initialValue: 'GENERAL'),
          ],
          buildCreatePayload: (v) => {'name': v['name'], 'scope': v['scope']!.toUpperCase()},
          deletePathOf: (r) => '/pricing/price-lists/${r['id']}',
        ),
      ),
      _SettingsLink(
        'Workflow Rules',
        Icons.rule_outlined,
        (_) => GenericAdminListScreen(
          title: 'Purchase Approval Rules',
          path: '/workflow/purchase-approval-rules',
          titleOf: (r) => r['name'] as String,
          subtitleOf: (r) => 'Threshold: ${r['min_amount']}  →  ${r['required_permission']}',
          createFields: [
            SimpleFormField(key: 'name', label: 'Rule name'),
            SimpleFormField(key: 'minAmount', label: 'Minimum amount', keyboardType: TextInputType.number),
            SimpleFormField(key: 'requiredPermission', label: 'Required permission code', required: false),
          ],
          buildCreatePayload: (v) => {
            'name': v['name'],
            'minAmount': double.tryParse(v['minAmount'] ?? '0') ?? 0,
            if ((v['requiredPermission'] ?? '').isNotEmpty) 'requiredPermission': v['requiredPermission'],
          },
          deletePathOf: (r) => '/workflow/purchase-approval-rules/${r['id']}',
        ),
      ),
      _SettingsLink(
        'Webhooks',
        Icons.webhook_outlined,
        (_) => GenericAdminListScreen(
          title: 'Webhook Subscriptions',
          path: '/webhooks/subscriptions',
          titleOf: (r) => r['url'] as String,
          subtitleOf: (r) => 'Events: ${(r['event_types'] as List).join(", ")}',
          createFields: [
            SimpleFormField(key: 'url', label: 'Endpoint URL'),
            SimpleFormField(key: 'eventTypes', label: 'Event types (comma-separated)'),
          ],
          buildCreatePayload: (v) => {
            'url': v['url'],
            'eventTypes': v['eventTypes']!.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList(),
          },
          deletePathOf: (r) => '/webhooks/subscriptions/${r['id']}',
        ),
      ),
      _SettingsLink(
        'Integrations',
        Icons.extension_outlined,
        (_) => GenericAdminListScreen(
          title: 'Integration Connections',
          path: '/integrations',
          titleOf: (r) => r['name'] as String,
          subtitleOf: (r) => 'Provider: ${r['provider']}  ·  ${r['status']}',
          createFields: [
            SimpleFormField(key: 'provider', label: 'Provider (e.g. SHOPIFY)'),
            SimpleFormField(key: 'name', label: 'Connection name'),
          ],
          buildCreatePayload: (v) => {'provider': v['provider'], 'name': v['name'], 'config': <String, dynamic>{}},
          deletePathOf: (r) => '/integrations/${r['id']}',
        ),
      ),
      _SettingsLink('Subscription', Icons.workspace_premium_outlined, (_) => const SubscriptionScreen()),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: links.length,
        itemBuilder: (context, i) {
          final link = links[i];
          return Card(
            child: ListTile(
              leading: Icon(link.icon),
              title: Text(link.title),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: link.builder)),
            ),
          );
        },
      ),
    );
  }
}
