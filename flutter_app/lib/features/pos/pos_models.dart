class PosRegister {
  final String id;
  final String name;
  final String code;
  final String warehouseId;
  final String status;

  PosRegister({required this.id, required this.name, required this.code, required this.warehouseId, required this.status});

  factory PosRegister.fromJson(Map<String, dynamic> json) => PosRegister(
        id: json['id'] as String,
        name: json['name'] as String,
        code: json['code'] as String,
        warehouseId: json['warehouse_id'] as String,
        status: json['status'] as String,
      );
}

class PosSession {
  final String id;
  final String registerId;
  final String status;
  final double openingCash;
  final double? closingCash;
  final double? expectedCash;

  PosSession({
    required this.id,
    required this.registerId,
    required this.status,
    required this.openingCash,
    this.closingCash,
    this.expectedCash,
  });

  factory PosSession.fromJson(Map<String, dynamic> json) => PosSession(
        id: json['id'] as String,
        registerId: json['register_id'] as String,
        status: json['status'] as String,
        openingCash: double.tryParse(json['opening_cash']?.toString() ?? '0') ?? 0,
        closingCash: json['closing_cash'] == null ? null : double.tryParse(json['closing_cash'].toString()),
        expectedCash: json['expected_cash'] == null ? null : double.tryParse(json['expected_cash'].toString()),
      );
}

class PosSale {
  final String id;
  final String saleNumber;
  final double totalAmount;
  final String status;

  PosSale({required this.id, required this.saleNumber, required this.totalAmount, required this.status});

  factory PosSale.fromJson(Map<String, dynamic> json) => PosSale(
        id: json['id'] as String,
        saleNumber: json['sale_number'] as String,
        totalAmount: double.tryParse(json['total_amount']?.toString() ?? '0') ?? 0,
        status: json['status'] as String,
      );
}
