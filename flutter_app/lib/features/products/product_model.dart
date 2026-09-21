class Product {
  final String id;
  final String sku;
  final String name;
  final String status;
  final double costPrice;
  final double sellingPrice;
  final double reorderPoint;

  Product({
    required this.id,
    required this.sku,
    required this.name,
    required this.status,
    required this.costPrice,
    required this.sellingPrice,
    required this.reorderPoint,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        sku: json['sku'] as String,
        name: json['name'] as String,
        status: json['status'] as String,
        costPrice: double.tryParse(json['cost_price']?.toString() ?? '0') ?? 0,
        sellingPrice: double.tryParse(json['selling_price']?.toString() ?? '0') ?? 0,
        reorderPoint: double.tryParse(json['reorder_point']?.toString() ?? '0') ?? 0,
      );
}
