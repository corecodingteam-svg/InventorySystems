class Pagination {
  final int page;
  final int pageSize;
  final int total;
  final int totalPages;

  Pagination({required this.page, required this.pageSize, required this.total, required this.totalPages});

  factory Pagination.fromJson(Map<String, dynamic> json) => Pagination(
        page: json['page'] as int,
        pageSize: json['pageSize'] as int,
        total: json['total'] as int,
        totalPages: json['totalPages'] as int,
      );
}

class PaginatedResponse<T> {
  final List<T> data;
  final Pagination pagination;

  PaginatedResponse({required this.data, required this.pagination});

  factory PaginatedResponse.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) fromJson) {
    return PaginatedResponse(
      data: (json['data'] as List).map((e) => fromJson(e as Map<String, dynamic>)).toList(),
      pagination: Pagination.fromJson(json['pagination'] as Map<String, dynamic>),
    );
  }
}

/// Server-side list query state shared by every listing screen (search, sort,
/// pagination, filters) — see the global listing standard in the master spec.
class ListQueryState {
  final int page;
  final int pageSize;
  final String? search;
  final String? sortBy;
  final String sortOrder;
  final Map<String, String> filters;

  const ListQueryState({
    this.page = 1,
    this.pageSize = 25,
    this.search,
    this.sortBy,
    this.sortOrder = 'asc',
    this.filters = const {},
  });

  ListQueryState copyWith({
    int? page,
    int? pageSize,
    String? search,
    String? sortBy,
    String? sortOrder,
    Map<String, String>? filters,
  }) {
    return ListQueryState(
      page: page ?? this.page,
      pageSize: pageSize ?? this.pageSize,
      search: search ?? this.search,
      sortBy: sortBy ?? this.sortBy,
      sortOrder: sortOrder ?? this.sortOrder,
      filters: filters ?? this.filters,
    );
  }

  Map<String, dynamic> toQueryParameters() => {
        'page': page,
        'pageSize': pageSize,
        if (search != null && search!.isNotEmpty) 'search': search,
        if (sortBy != null) 'sortBy': sortBy,
        if (sortBy != null) 'sortOrder': sortOrder,
        ...filters,
      };
}
