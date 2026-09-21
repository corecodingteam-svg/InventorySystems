class Supplier {
  final String id;
  final String name;
  final String code;
  final String? email;
  final String? phone;
  final String status;

  Supplier({
    required this.id,
    required this.name,
    required this.code,
    this.email,
    this.phone,
    required this.status,
  });

  factory Supplier.fromJson(Map<String, dynamic> json) => Supplier(
        id: json['id'] as String,
        name: json['name'] as String,
        code: json['code'] as String,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        status: json['status'] as String,
      );
}
