import 'package:flutter/material.dart';

import '../../shared/widgets/generic_admin_list_screen.dart';
import '../../shared/widgets/simple_form_dialog.dart';

class UnitsCategoriesBrandsScreen extends StatelessWidget {
  const UnitsCategoriesBrandsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Units / Categories / Brands'),
          bottom: const TabBar(tabs: [Tab(text: 'Units'), Tab(text: 'Categories'), Tab(text: 'Brands')]),
        ),
        body: TabBarView(
          children: [
            GenericAdminListScreen(
              title: 'Units',
              path: '/units',
              titleOf: (r) => r['name'] as String,
              subtitleOf: (r) => 'Code: ${r['code']}',
              createFields: [
                SimpleFormField(key: 'name', label: 'Name'),
                SimpleFormField(key: 'code', label: 'Code'),
              ],
              deletePathOf: (r) => '/units/${r['id']}',
            ),
            GenericAdminListScreen(
              title: 'Categories',
              path: '/categories',
              titleOf: (r) => r['name'] as String,
              createFields: [SimpleFormField(key: 'name', label: 'Category name')],
              deletePathOf: (r) => '/categories/${r['id']}',
            ),
            GenericAdminListScreen(
              title: 'Brands',
              path: '/brands',
              titleOf: (r) => r['name'] as String,
              createFields: [SimpleFormField(key: 'name', label: 'Brand name')],
              deletePathOf: (r) => '/brands/${r['id']}',
            ),
          ],
        ),
      ),
    );
  }
}
