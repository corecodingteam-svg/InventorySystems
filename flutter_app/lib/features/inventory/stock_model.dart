class StockBalance {
  final String id;
  final String productId;
  final String sku;
  final String productName;
  final String warehouseId;
  final String warehouseName;
  final double onHand;
  final double reserved;
  final double reorderPoint;

  StockBalance({
    required this.id,
    required this.productId,
    required this.sku,
    required this.productName,
    required this.warehouseId,
    required this.warehouseName,
    required this.onHand,
    required this.reserved,
    required this.reorderPoint,
  });

  double get available => onHand - reserved;
  bool get isLowStock => reorderPoint > 0 && onHand <= reorderPoint;
  bool get isOutOfStock => onHand <= 0;

  factory StockBalance.fromJson(Map<String, dynamic> json) => StockBalance(
        id: json['id'] as String,
        productId: json['product_id'] as String,
        sku: json['sku'] as String,
        productName: json['product_name'] as String,
        warehouseId: json['warehouse_id'] as String,
        warehouseName: json['warehouse_name'] as String,
        onHand: double.tryParse(json['on_hand']?.toString() ?? '0') ?? 0,
        reserved: double.tryParse(json['reserved']?.toString() ?? '0') ?? 0,
        reorderPoint: double.tryParse(json['reorder_point']?.toString() ?? '0') ?? 0,
      );
}

class StockLedgerEntry {
  final String id;
  final String productId;
  final String warehouseId;
  final String transactionType;
  final double quantityIn;
  final double quantityOut;
  final double balanceQuantity;
  final String createdAt;

  StockLedgerEntry({
    required this.id,
    required this.productId,
    required this.warehouseId,
    required this.transactionType,
    required this.quantityIn,
    required this.quantityOut,
    required this.balanceQuantity,
    required this.createdAt,
  });

  factory StockLedgerEntry.fromJson(Map<String, dynamic> json) => StockLedgerEntry(
        id: json['id'] as String,
        productId: json['product_id'] as String,
        warehouseId: json['warehouse_id'] as String,
        transactionType: json['transaction_type'] as String,
        quantityIn: double.tryParse(json['quantity_in']?.toString() ?? '0') ?? 0,
        quantityOut: double.tryParse(json['quantity_out']?.toString() ?? '0') ?? 0,
        balanceQuantity: double.tryParse(json['balance_quantity']?.toString() ?? '0') ?? 0,
        createdAt: json['created_at'] as String,
      );
}
