import {
  Body, Controller, Get, Param, Post, Query, Req,
  Module, Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { StoreService, newId } from '../../store/store.service';
import { Sale, SaleItem } from '../../store/types';

interface CheckoutDto {
  branchId: string;
  customerId?: string;
  prescriptionId?: string;
  items: { medicineId: string; quantity: number; discount?: number }[];
  paymentMethod: 'cash' | 'card' | 'insurance' | 'mixed';
  amountPaid: number;
  insuranceCovered?: number;
  overridePrescription?: boolean; // pharmacist override — logged
}

@Injectable()
class SalesService {
  constructor(private store: StoreService) {}

  list(branchId?: string, from?: string, to?: string) {
    let list = this.store.sales;
    if (branchId) list = list.filter(s => s.branchId === branchId);
    if (from) list = list.filter(s => s.createdAt >= from);
    if (to) list = list.filter(s => s.createdAt <= to);
    return list
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(s => ({
        ...s,
        customer: s.customerId ? this.store.customers.find(c => c.id === s.customerId) : null,
      }));
  }

  one(id: string) {
    const s = this.store.sales.find(x => x.id === id);
    if (!s) throw new NotFoundException();
    return {
      ...s,
      customer: s.customerId ? this.store.customers.find(c => c.id === s.customerId) : null,
      itemsResolved: s.items.map(it => ({
        ...it,
        medicine: this.store.medicines.find(m => m.id === it.medicineId),
        batch: this.store.batches.find(b => b.id === it.batchId),
      })),
    };
  }

  checkout(dto: CheckoutDto, userId: string): Sale {
    if (!dto.items?.length) throw new BadRequestException('No items');
    if (!dto.branchId) throw new BadRequestException('branchId required');

    // Prescription requirement check
    const requiresRx = dto.items.filter(it => {
      const m = this.store.medicines.find(x => x.id === it.medicineId);
      return m?.prescriptionRequired;
    });
    if (requiresRx.length && !dto.prescriptionId && !dto.overridePrescription) {
      throw new ForbiddenException(
        'Prescription required for: ' +
        requiresRx.map(it => this.store.medicines.find(m => m.id === it.medicineId)?.name).join(', ')
      );
    }

    // If prescription provided, verify it covers the items
    if (dto.prescriptionId) {
      const rx = this.store.prescriptions.find(p => p.id === dto.prescriptionId);
      if (!rx) throw new BadRequestException('Prescription not found');
      if (rx.status !== 'verified')
        throw new BadRequestException('Prescription not verified');
    }

    // Build items, consuming FEFO. We expand multi-batch consumption into multiple SaleItems.
    const saleItems: SaleItem[] = [];
    for (const line of dto.items) {
      const m = this.store.medicines.find(x => x.id === line.medicineId);
      if (!m) throw new BadRequestException(`Unknown medicine: ${line.medicineId}`);
      const allocs = this.store.consumeStock(line.medicineId, line.quantity, dto.branchId);
      for (const alloc of allocs) {
        const discount = (line.discount || 0) * (alloc.quantity / line.quantity);
        const gross = alloc.unitPrice * alloc.quantity;
        const tax = ((gross - discount) * m.taxRate) / 100;
        saleItems.push({
          medicineId: line.medicineId,
          batchId: alloc.batchId,
          quantity: alloc.quantity,
          unitPrice: alloc.unitPrice,
          discount: round2(discount),
          tax: round2(tax),
          lineTotal: round2(gross - discount + tax),
        });
      }
    }

    const subtotal = round2(saleItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
    const totalDiscount = round2(saleItems.reduce((s, i) => s + i.discount, 0));
    const totalTax = round2(saleItems.reduce((s, i) => s + i.tax, 0));
    const total = round2(subtotal - totalDiscount + totalTax);
    const insuranceCovered = round2(dto.insuranceCovered || 0);
    const customerOwes = round2(total - insuranceCovered);

    if (dto.amountPaid < customerOwes - 0.01)
      throw new BadRequestException(`Insufficient payment. Customer owes ${customerOwes}`);

    const sale: Sale = {
      id: newId('sale'),
      invoiceNumber: 'INV-' + Date.now().toString().slice(-8),
      branchId: dto.branchId,
      cashierId: userId,
      customerId: dto.customerId,
      prescriptionId: dto.prescriptionId,
      items: saleItems,
      subtotal, totalDiscount, totalTax, total, insuranceCovered,
      paymentMethod: dto.paymentMethod,
      amountPaid: round2(dto.amountPaid),
      change: round2(dto.amountPaid - customerOwes),
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    this.store.sales.push(sale);

    // Inventory logs
    for (const it of saleItems) {
      this.store.logInventory({
        batchId: it.batchId, medicineId: it.medicineId, branchId: dto.branchId,
        type: 'sale', quantityChange: -it.quantity,
        reason: `Sale ${sale.invoiceNumber}`, userId, refId: sale.id,
      });
    }

    // Loyalty: 1 point per currency unit spent (ex-tax, ex-insurance)
    if (dto.customerId) {
      const cust = this.store.customers.find(c => c.id === dto.customerId);
      if (cust) cust.loyaltyPoints += Math.floor(customerOwes - totalTax);
    }

    // Mark prescription dispensed
    if (dto.prescriptionId) {
      const rx = this.store.prescriptions.find(p => p.id === dto.prescriptionId);
      if (rx) rx.status = 'dispensed';
    }

    return sale;
  }

  refund(saleId: string, userId: string, reason: string) {
    const sale = this.store.sales.find(s => s.id === saleId);
    if (!sale) throw new NotFoundException();
    if (sale.status === 'refunded') throw new BadRequestException('Already refunded');

    // Return stock to original batches
    for (const it of sale.items) {
      const batch = this.store.batches.find(b => b.id === it.batchId);
      if (batch) batch.quantity += it.quantity;
      this.store.logInventory({
        batchId: it.batchId, medicineId: it.medicineId, branchId: sale.branchId,
        type: 'return', quantityChange: it.quantity,
        reason: `Refund ${sale.invoiceNumber}: ${reason}`, userId, refId: sale.id,
      });
    }
    sale.status = 'refunded';
    return sale;
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Controller('sales')
class SalesController {
  constructor(private svc: SalesService) {}
  @Get() list(@Query() q: any) { return this.svc.list(q.branchId, q.from, q.to); }
  @Get(':id') one(@Param('id') id: string) { return this.svc.one(id); }
  @Post() checkout(@Body() body: CheckoutDto, @Req() req: any) {
    return this.svc.checkout(body, req.user?.sub || 'unknown');
  }
  @Post(':id/refund') refund(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.svc.refund(id, req.user?.sub || 'unknown', body?.reason || 'not specified');
  }
}

@Module({ providers: [SalesService], controllers: [SalesController] })
export class SalesModule {}
