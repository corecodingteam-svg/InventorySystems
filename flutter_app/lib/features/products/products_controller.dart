import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/paginated_response.dart';
import '../../shared/widgets/app_data_table.dart';
import 'product_model.dart';
import 'products_repository.dart';

class ProductsListState {
  final ListLoadState loadState;
  final PaginatedResponse<Product>? response;
  final ListQueryState query;
  final String? errorMessage;

  const ProductsListState({
    this.loadState = ListLoadState.loading,
    this.response,
    this.query = const ListQueryState(),
    this.errorMessage,
  });

  ProductsListState copyWith({
    ListLoadState? loadState,
    PaginatedResponse<Product>? response,
    ListQueryState? query,
    String? errorMessage,
  }) {
    return ProductsListState(
      loadState: loadState ?? this.loadState,
      response: response ?? this.response,
      query: query ?? this.query,
      errorMessage: errorMessage,
    );
  }
}

class ProductsController extends StateNotifier<ProductsListState> {
  final ProductsRepository _repository;

  ProductsController(this._repository) : super(const ProductsListState()) {
    load();
  }

  Future<void> load() async {
    state = state.copyWith(loadState: ListLoadState.loading);
    try {
      final response = await _repository.list(state.query);
      state = state.copyWith(loadState: ListLoadState.loaded, response: response);
    } catch (e) {
      state = state.copyWith(loadState: ListLoadState.error, errorMessage: 'Failed to load products.');
    }
  }

  void updateQuery(ListQueryState query) {
    state = state.copyWith(query: query);
    load();
  }

  Future<void> create({
    required String sku,
    required String name,
    required String baseUnitId,
    double costPrice = 0,
    double sellingPrice = 0,
  }) async {
    await _repository.create(
      sku: sku,
      name: name,
      baseUnitId: baseUnitId,
      costPrice: costPrice,
      sellingPrice: sellingPrice,
    );
    await load();
  }

  Future<void> update(String id, {String? name, double? costPrice, double? sellingPrice, String? status}) async {
    await _repository.update(id, name: name, costPrice: costPrice, sellingPrice: sellingPrice, status: status);
    await load();
  }

  Future<void> remove(String id) async {
    await _repository.remove(id);
    await load();
  }
}

final productsControllerProvider =
    StateNotifierProvider.autoDispose<ProductsController, ProductsListState>((ref) {
  return ProductsController(ref.watch(productsRepositoryProvider));
});
