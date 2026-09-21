import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KYSELY, Db } from '../database/database.module';
import { InventoryService } from '../inventory/inventory.service';
import { generateDocNumber } from '../common/generate-doc-number';
import { CloseSessionDto, CreatePosSaleDto, CreateRegisterDto, OpenSessionDto } from './dto/pos.dto';

@Injectable()
export class PosService {
  constructor(
    @Inject(KYSELY) private db: Db,
    private inventoryService: InventoryService,
  ) {}

  // ---- Registers ----

  listRegisters(organizationId: string) {
    return this.db
      .selectFrom('pos_registers')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .orderBy('name', 'asc')
      .execute();
  }

  async createRegister(organizationId: string, dto: CreateRegisterDto) {
    const existing = await this.db
      .selectFrom('pos_registers')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('code', '=', dto.code)
      .executeTakeFirst();
    if (existing) {
      throw new ConflictException({ code: 'REGISTER_EXISTS', message: 'A register with this code already exists.' });
    }
    return this.db
      .insertInto('pos_registers')
      .values({ organization_id: organizationId, warehouse_id: dto.warehouseId, name: dto.name, code: dto.code })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // ---- Sessions ----

  /** A register may only have one OPEN session at a time — enforced here rather than a DB constraint (see migration comment). */
  async openSession(organizationId: string, userId: string | null, dto: OpenSessionDto) {
    const register = await this.db
      .selectFrom('pos_registers')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('id', '=', dto.registerId)
      .executeTakeFirst();
    if (!register) throw new NotFoundException('Register not found.');

    const openSession = await this.db
      .selectFrom('pos_sessions')
      .select('id')
      .where('organization_id', '=', organizationId)
      .where('register_id', '=', dto.registerId)
      .where('status', '=', 'OPEN')
      .executeTakeFirst();
    if (openSession) {
      throw new ConflictException({
        code: 'SESSION_ALREADY_OPEN',
        message: 'This register already has an open session.',
      });
    }

    return this.db
      .insertInto('pos_sessions')
      .values({
        organization_id: organizationId,
        register_id: dto.registerId,
        opened_by: userId,
        opening_cash: dto.openingCash.toString(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async closeSession(organizationId: string, userId: string | null, sessionId: string, dto: CloseSessionDto) {
    const session = await this.db
      .selectFrom('pos_sessions')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', sessionId)
      .executeTakeFirst();
    if (!session) throw new NotFoundException('Session not found.');
    if (session.status !== 'OPEN') {
      throw new ConflictException({ code: 'SESSION_NOT_OPEN', message: 'This session is already closed.' });
    }

    const cashTotal = await this.db
      .selectFrom('pos_sale_payments as p')
      .innerJoin('pos_sales as s', 's.id', 'p.pos_sale_id')
      .select((eb) => eb.fn.sum('p.amount').as('total'))
      .where('s.session_id', '=', sessionId)
      .where('p.method', '=', 'CASH')
      .executeTakeFirst();
    const expectedCash = Number(session.opening_cash) + Number(cashTotal?.total ?? 0);

    return this.db
      .updateTable('pos_sessions')
      .set({
        status: 'CLOSED',
        closed_by: userId,
        closing_cash: dto.closingCash.toString(),
        expected_cash: expectedCash.toString(),
        closed_at: new Date(),
      })
      .where('id', '=', sessionId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findSession(organizationId: string, id: string) {
    const session = await this.db
      .selectFrom('pos_sessions')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!session) throw new NotFoundException('Session not found.');
    return session;
  }

  // ---- Sales ----

  /**
   * A POS sale is an immediate, single-step sale — unlike a full Sales
   * Order (Phase 5) there is no separate reserve/dispatch lifecycle: stock
   * leaves the moment the sale completes, which is how a real point of
   * sale behaves. Reuses InventoryService for the actual stock movement,
   * same as every other module — a POS sale is still fully ledgered.
   */
  async createSale(organizationId: string, userId: string | null, sessionId: string, dto: CreatePosSaleDto) {
    return this.db.transaction().execute(async (trx) => {
      const session = await trx
        .selectFrom('pos_sessions')
        .innerJoin('pos_registers', 'pos_registers.id', 'pos_sessions.register_id')
        .select(['pos_sessions.id', 'pos_sessions.status', 'pos_registers.warehouse_id'])
        .where('pos_sessions.organization_id', '=', organizationId)
        .where('pos_sessions.id', '=', sessionId)
        .executeTakeFirst();
      if (!session) throw new NotFoundException('Session not found.');
      if (session.status !== 'OPEN') {
        throw new ConflictException({ code: 'SESSION_NOT_OPEN', message: 'This session is not open.' });
      }

      const subtotal = dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice - (i.discountAmount ?? 0), 0);
      const discountAmount = dto.discountAmount ?? 0;
      const taxAmount = dto.taxAmount ?? 0;
      const totalAmount = subtotal - discountAmount + taxAmount;

      const paymentsTotal = dto.payments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(paymentsTotal - totalAmount) > 0.01) {
        throw new ConflictException({
          code: 'PAYMENT_MISMATCH',
          message: `Payments (${paymentsTotal.toFixed(2)}) do not add up to the sale total (${totalAmount.toFixed(2)}).`,
        });
      }

      const sale = await trx
        .insertInto('pos_sales')
        .values({
          organization_id: organizationId,
          session_id: sessionId,
          sale_number: generateDocNumber('POS'),
          customer_id: dto.customerId ?? null,
          subtotal: subtotal.toString(),
          discount_amount: discountAmount.toString(),
          tax_amount: taxAmount.toString(),
          total_amount: totalAmount.toString(),
          created_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      for (const item of dto.items) {
        await trx
          .insertInto('pos_sale_items')
          .values({
            organization_id: organizationId,
            pos_sale_id: sale.id,
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            quantity: item.quantity.toString(),
            unit_price: item.unitPrice.toString(),
            discount_amount: (item.discountAmount ?? 0).toString(),
          })
          .execute();

        await this.inventoryService.postMovementInTrx(trx, organizationId, userId, {
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: session.warehouse_id,
          transactionType: 'SALES_ISSUE',
          quantityOut: item.quantity,
          unitCost: item.unitPrice,
          referenceType: 'POS_SALE',
          referenceId: sale.id,
        });
      }

      for (const payment of dto.payments) {
        await trx
          .insertInto('pos_sale_payments')
          .values({
            organization_id: organizationId,
            pos_sale_id: sale.id,
            method: payment.method,
            amount: payment.amount.toString(),
          })
          .execute();
      }

      return sale;
    });
  }

  async listSales(organizationId: string, sessionId: string) {
    return this.db
      .selectFrom('pos_sales')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('session_id', '=', sessionId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async findSale(organizationId: string, id: string) {
    const sale = await this.db
      .selectFrom('pos_sales')
      .selectAll()
      .where('organization_id', '=', organizationId)
      .where('id', '=', id)
      .executeTakeFirst();
    if (!sale) throw new NotFoundException('Sale not found.');

    const items = await this.db
      .selectFrom('pos_sale_items')
      .selectAll()
      .where('pos_sale_id', '=', id)
      .execute();
    const payments = await this.db
      .selectFrom('pos_sale_payments')
      .selectAll()
      .where('pos_sale_id', '=', id)
      .execute();

    return { ...sale, items, payments };
  }

  /** Voids a sale and reverses its stock movement via a RETURN_IN — never deletes the original ledger entries. */
  async voidSale(organizationId: string, userId: string | null, id: string) {
    return this.db.transaction().execute(async (trx) => {
      const sale = await trx
        .selectFrom('pos_sales')
        .innerJoin('pos_sessions', 'pos_sessions.id', 'pos_sales.session_id')
        .innerJoin('pos_registers', 'pos_registers.id', 'pos_sessions.register_id')
        .select(['pos_sales.id', 'pos_sales.status', 'pos_registers.warehouse_id'])
        .where('pos_sales.organization_id', '=', organizationId)
        .where('pos_sales.id', '=', id)
        .executeTakeFirst();
      if (!sale) throw new NotFoundException('Sale not found.');
      if (sale.status !== 'COMPLETED') {
        throw new ConflictException({ code: 'ALREADY_VOIDED', message: 'This sale is already voided.' });
      }

      const items = await trx.selectFrom('pos_sale_items').selectAll().where('pos_sale_id', '=', id).execute();
      for (const item of items) {
        await this.inventoryService.postMovementInTrx(trx, organizationId, userId, {
          productId: item.product_id,
          variantId: item.variant_id,
          warehouseId: sale.warehouse_id,
          transactionType: 'RETURN_IN',
          quantityIn: Number(item.quantity),
          unitCost: Number(item.unit_price),
          referenceType: 'POS_VOID',
          referenceId: id,
        });
      }

      return trx
        .updateTable('pos_sales')
        .set({ status: 'VOIDED' })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }
}
