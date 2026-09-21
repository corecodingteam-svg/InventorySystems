export type StockTransactionType =
  | 'OPENING_STOCK'
  | 'PURCHASE_RECEIPT'
  | 'SALES_ISSUE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'RETURN_IN'
  | 'RETURN_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'PRODUCTION_IN'
  | 'PRODUCTION_CONSUMPTION'
  | 'DAMAGE'
  | 'EXPIRY'
  | 'STOCK_RESERVATION'
  | 'STOCK_RELEASE';

export interface PostMovementInput {
  productId: string;
  variantId?: string | null;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  serialNumberId?: string | null;
  transactionType: StockTransactionType;
  quantityIn?: number;
  quantityOut?: number;
  unitCost?: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  /** Overrides the product's allow_negative_stock flag when explicitly false/true is passed. */
  allowNegativeOverride?: boolean;
}
