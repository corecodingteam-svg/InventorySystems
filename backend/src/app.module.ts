import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { UnitsModule } from './units/units.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { BatchesModule } from './batches/batches.module';
import { SerialNumbersModule } from './serial-numbers/serial-numbers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { CustomersModule } from './customers/customers.module';
import { SalesModule } from './sales/sales.module';
import { ReportsModule } from './reports/reports.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { TaxModule } from './tax/tax.module';
import { PricingModule } from './pricing/pricing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkflowModule } from './workflow/workflow.module';
import { StockCountsModule } from './stock-counts/stock-counts.module';
import { PosModule } from './pos/pos.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    DatabaseModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    RolesModule,
    UnitsModule,
    CategoriesModule,
    BrandsModule,
    WarehousesModule,
    ProductsModule,
    InventoryModule,
    BatchesModule,
    SerialNumbersModule,
    SuppliersModule,
    PurchasingModule,
    CustomersModule,
    SalesModule,
    ReportsModule,
    CustomFieldsModule,
    TaxModule,
    PricingModule,
    NotificationsModule,
    WorkflowModule,
    StockCountsModule,
    PosModule,
    WebhooksModule,
    IntegrationsModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
