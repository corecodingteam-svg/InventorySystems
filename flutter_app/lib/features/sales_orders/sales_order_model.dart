class SalesOrderSummary {
  final String id;
  final String soNumber;
  final String status;
  final String customerId;
  final String customerName;
  final String warehouseId;
  final String createdAt;

  SalesOrderSummary({
    required this.id,
    required this.soNumber,
    required this.status,
    required this.customerId,
    required this.customerName,
    required this.warehouseId,
    required this.createdAt,
  });

  factory SalesOrderSummary.fromJson(Map<String, dynamic> json) => SalesOrderSummary(
        id: json['id'] as String,
        soNumber: json['so_number'] as String,
        status: json['status'] as String,
        customerId: json['customer_id'] as String,
        customerName: json['customer_name'] as String,
        warehouseId: json['warehouse_id'] as String,
        createdAt: json['created_at'] as String,
      );
}

class SalesOrderItem {
  final String id;
  final String productId;
  final String? productSku;
  final String? productName;
  final double quantityOrdered;
  final double quantityReserved;
  final double quantityDispatched;
  final double unitPrice;

  SalesOrderItem({
    required this.id,
    required this.productId,
    this.productSku,
    this.productName,
    required this.quantityOrdered,
    required this.quantityReserved,
    required this.quantityDispatched,
    required this.unitPrice,
  });

  String get productLabel => productSku != null ? '$productSku — ${productName ?? ''}' : productId;

  factory SalesOrderItem.fromJson(Map<String, dynamic> json) => SalesOrderItem(
        id: json['id'] as String,
        productId: json['product_id'] as String,
        productSku: json['product_sku'] as String?,
        productName: json['product_name'] as String?,
        quantityOrdered: double.tryParse(json['quantity_ordered']?.toString() ?? '0') ?? 0,
        quantityReserved: double.tryParse(json['quantity_reserved']?.toString() ?? '0') ?? 0,
        quantityDispatched: double.tryParse(json['quantity_dispatched']?.toString() ?? '0') ?? 0,
        unitPrice: double.tryParse(json['unit_price']?.toString() ?? '0') ?? 0,
      );
}

class SalesOrderDetail extends SalesOrderSummary {
  final List<SalesOrderItem> items;

  SalesOrderDetail({
    required super.id,
    required super.soNumber,
    required super.status,
    required super.customerId,
    required super.customerName,
    required super.warehouseId,
    required super.createdAt,
    required this.items,
  });

  factory SalesOrderDetail.fromJson(Map<String, dynamic> json) => SalesOrderDetail(
        id: json['id'] as String,
        soNumber: json['so_number'] as String,
        status: json['status'] as String,
        customerId: json['customer_id'] as String,
        customerName: (json['customer_name'] ?? '') as String,
        warehouseId: json['warehouse_id'] as String,
        createdAt: json['created_at'] as String,
        items: ((json['items'] as List?) ?? [])
            .map((e) => SalesOrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
