class Warehouse {
  final String id;
  final String name;
  final String code;
  final String status;

  Warehouse({required this.id, required this.name, required this.code, required this.status});

  factory Warehouse.fromJson(Map<String, dynamic> json) => Warehouse(
        id: json['id'] as String,
        name: json['name'] as String,
        code: json['code'] as String,
        status: json['status'] as String,
      );
}
