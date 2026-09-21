class BarcodeScanResult {
  final Map<String, dynamic> product;
  final Map<String, dynamic>? variant;

  BarcodeScanResult({required this.product, this.variant});

  factory BarcodeScanResult.fromJson(Map<String, dynamic> json) => BarcodeScanResult(
        product: json['product'] as Map<String, dynamic>,
        variant: json['variant'] as Map<String, dynamic>?,
      );
}
