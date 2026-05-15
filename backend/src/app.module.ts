import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { StoreModule } from './store/store.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt.guard';

import { MedicinesModule } from './modules/medicines/medicines.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    StoreModule,
    AuthModule,
    MedicinesModule,
    SuppliersModule,
    CustomersModule,
    PrescriptionsModule,
    SalesModule,
    PurchasesModule,
    InventoryModule,
    ReportsModule,
    BranchesModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
