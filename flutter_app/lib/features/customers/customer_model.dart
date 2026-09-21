class Customer {
  final String id;
  final String name;
  final String code;
  final String? email;
  final String? phone;
  final String status;

  Customer({
    required this.id,
    required this.name,
    required this.code,
    this.email,
    this.phone,
    required this.status,
  });

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        id: json['id'] as String,
        name: json['name'] as String,
        code: json['code'] as String,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        status: json['status'] as String,
      );
}
