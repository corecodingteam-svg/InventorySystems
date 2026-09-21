class DashboardSummary {
  final int totalProducts;
  final int totalWarehouses;
  final int lowStockCount;
  final int outOfStockCount;
  final int pendingPurchaseOrders;
  final int pendingSalesOrders;
  final double inventoryValue;

  DashboardSummary({
    required this.totalProducts,
    required this.totalWarehouses,
    required this.lowStockCount,
    required this.outOfStockCount,
    required this.pendingPurchaseOrders,
    required this.pendingSalesOrders,
    required this.inventoryValue,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) => DashboardSummary(
        totalProducts: json['totalProducts'] as int,
        totalWarehouses: json['totalWarehouses'] as int,
        lowStockCount: json['lowStockCount'] as int,
        outOfStockCount: json['outOfStockCount'] as int,
        pendingPurchaseOrders: json['pendingPurchaseOrders'] as int,
        pendingSalesOrders: json['pendingSalesOrders'] as int,
        inventoryValue: (json['inventoryValue'] as num).toDouble(),
      );
}
