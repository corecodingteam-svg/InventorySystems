class PurchaseOrderSummary {
  final String id;
  final String poNumber;
  final String status;
  final String supplierId;
  final String supplierName;
  final String warehouseId;
  final String createdAt;

  PurchaseOrderSummary({
    required this.id,
    required this.poNumber,
    required this.status,
    required this.supplierId,
    required this.supplierName,
    required this.warehouseId,
    required this.createdAt,
  });

  factory PurchaseOrderSummary.fromJson(Map<String, dynamic> json) => PurchaseOrderSummary(
        id: json['id'] as String,
        poNumber: json['po_number'] as String,
        status: json['status'] as String,
        supplierId: json['supplier_id'] as String,
        supplierName: json['supplier_name'] as String,
        warehouseId: json['warehouse_id'] as String,
        createdAt: json['created_at'] as String,
      );
}

class PurchaseOrderItem {
  final String id;
  final String productId;
  final String? productSku;
  final String? productName;
  final double quantityOrdered;
  final double quantityReceived;
  final double unitCost;

  PurchaseOrderItem({
    required this.id,
    required this.productId,
    this.productSku,
    this.productName,
    required this.quantityOrdered,
    required this.quantityReceived,
    required this.unitCost,
  });

  String get productLabel => productSku != null ? '$productSku — ${productName ?? ''}' : productId;

  factory PurchaseOrderItem.fromJson(Map<String, dynamic> json) => PurchaseOrderItem(
        id: json['id'] as String,
        productId: json['product_id'] as String,
        productSku: json['product_sku'] as String?,
        productName: json['product_name'] as String?,
        quantityOrdered: double.tryParse(json['quantity_ordered']?.toString() ?? '0') ?? 0,
        quantityReceived: double.tryParse(json['quantity_received']?.toString() ?? '0') ?? 0,
        unitCost: double.tryParse(json['unit_cost']?.toString() ?? '0') ?? 0,
      );
}

class PurchaseOrderDetail extends PurchaseOrderSummary {
  final List<PurchaseOrderItem> items;

  PurchaseOrderDetail({
    required super.id,
    required super.poNumber,
    required super.status,
    required super.supplierId,
    required super.supplierName,
    required super.warehouseId,
    required super.createdAt,
    required this.items,
  });

  factory PurchaseOrderDetail.fromJson(Map<String, dynamic> json) => PurchaseOrderDetail(
        id: json['id'] as String,
        poNumber: json['po_number'] as String,
        status: json['status'] as String,
        supplierId: json['supplier_id'] as String,
        supplierName: (json['supplier_name'] ?? '') as String,
        warehouseId: json['warehouse_id'] as String,
        createdAt: json['created_at'] as String,
        items: ((json['items'] as List?) ?? [])
            .map((e) => PurchaseOrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
