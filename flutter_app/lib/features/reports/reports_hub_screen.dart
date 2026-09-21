import 'package:flutter/material.dart';

import 'reports_repository.dart';
import 'raw_rows_screen.dart';

class _ReportLink {
  final String title;
  final IconData icon;
  final Widget Function() builder;
  const _ReportLink(this.title, this.icon, this.builder);
}

class ReportsHubScreen extends StatelessWidget {
  const ReportsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final links = [
      _ReportLink('Low Stock', Icons.trending_down,
          () => RawRowsScreen(title: 'Low Stock', provider: lowStockReportProvider)),
      _ReportLink('Stock Valuation', Icons.payments_outlined,
          () => RawRowsScreen(title: 'Stock Valuation', provider: stockValuationReportProvider)),
      _ReportLink('Sales by Product', Icons.inventory_2_outlined,
          () => RawRowsScreen(title: 'Sales by Product', provider: salesByProductReportProvider)),
      _ReportLink('Sales by Customer', Icons.people_outline,
          () => RawRowsScreen(title: 'Sales by Customer', provider: salesByCustomerReportProvider)),
      _ReportLink('Purchases by Supplier', Icons.local_shipping_outlined,
          () => RawRowsScreen(title: 'Purchases by Supplier', provider: purchasesBySupplierReportProvider)),
      _ReportLink('Reorder Forecast', Icons.timeline,
          () => RawRowsScreen(title: 'Reorder Forecast', provider: reorderForecastReportProvider)),
      _ReportLink('Warehouse Activity', Icons.warehouse_outlined,
          () => RawRowsScreen(title: 'Warehouse Activity', provider: warehouseActivityReportProvider)),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
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
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => link.builder())),
            ),
          );
        },
      ),
    );
  }
}
