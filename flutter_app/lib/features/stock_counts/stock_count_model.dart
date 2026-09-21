class StockCountSummary {
  final String id;
  final String countNumber;
  final String countType;
  final String status;
  final String warehouseId;
  final String warehouseName;
  final String createdAt;

  StockCountSummary({
    required this.id,
    required this.countNumber,
    required this.countType,
    required this.status,
    required this.warehouseId,
    required this.warehouseName,
    required this.createdAt,
  });

  factory StockCountSummary.fromJson(Map<String, dynamic> json) => StockCountSummary(
        id: json['id'] as String,
        countNumber: json['count_number'] as String,
        countType: json['count_type'] as String,
        status: json['status'] as String,
        warehouseId: json['warehouse_id'] as String,
        warehouseName: json['warehouse_name'] as String,
        createdAt: json['created_at'] as String,
      );
}

class StockCountLine {
  final String id;
  final String productId;
  final String sku;
  final String productName;
  final double systemQuantity;
  final double? countedQuantity;

  StockCountLine({
    required this.id,
    required this.productId,
    required this.sku,
    required this.productName,
    required this.systemQuantity,
    this.countedQuantity,
  });

  factory StockCountLine.fromJson(Map<String, dynamic> json) => StockCountLine(
        id: json['id'] as String,
        productId: json['product_id'] as String,
        sku: json['sku'] as String,
        productName: json['product_name'] as String,
        systemQuantity: double.tryParse(json['system_quantity']?.toString() ?? '0') ?? 0,
        countedQuantity: json['counted_quantity'] == null
            ? null
            : double.tryParse(json['counted_quantity'].toString()),
      );
}

class StockCountDetail extends StockCountSummary {
  final List<StockCountLine> lines;

  StockCountDetail({
    required super.id,
    required super.countNumber,
    required super.countType,
    required super.status,
    required super.warehouseId,
    required super.warehouseName,
    required super.createdAt,
    required this.lines,
  });

  factory StockCountDetail.fromJson(Map<String, dynamic> json) => StockCountDetail(
        id: json['id'] as String,
        countNumber: json['count_number'] as String,
        countType: json['count_type'] as String,
        status: json['status'] as String,
        warehouseId: json['warehouse_id'] as String,
        warehouseName: (json['warehouse_name'] ?? '') as String,
        createdAt: json['created_at'] as String,
        lines: ((json['lines'] as List?) ?? []).map((e) => StockCountLine.fromJson(e as Map<String, dynamic>)).toList(),
      );
}
