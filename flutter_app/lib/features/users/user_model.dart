class AppUser {
  final String id;
  final String email;
  final String fullName;
  final String status;

  AppUser({required this.id, required this.email, required this.fullName, required this.status});

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['full_name'] as String,
        status: json['status'] as String,
      );
}
