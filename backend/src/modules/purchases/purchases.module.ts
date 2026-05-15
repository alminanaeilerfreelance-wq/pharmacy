import {
  Body, Controller, Get, Param, Post, Put, Req,
  Module, Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { StoreService, newId } from '../../store/store.service';
import { Purchase, PurchaseItem } from '../../store/types';

@Injectable()
class PurchasesService {
  constructor(private store: StoreService) {}

  list() {
    return this.store.purchases
      .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
      .map(p => ({
        ...p,
        supplier: this.store.suppliers.find(s => s.id === p.supplierId),
      }));
  }

  one(id: string) {
    const p = this.store.purchases.find(x => x.id === id);
    if (!p) throw new NotFoundException();
    return {
      ...p,
      supplier: this.store.suppliers.find(s => s.id === p.supplierId),
      itemsResolved: p.items.map(i => ({
        ...i,
        medicine: this.store.medicines.find(m => m.id === i.medicineId),
      })),
    };
  }

  create(body: Omit<Purchase, 'id' | 'poNumber' | 'orderedAt' | 'status' | 'total'>): Purchase {
    if (!body.supplierId) throw new BadRequestException('supplierId required');
    if (!body.items?.length) throw new BadRequestException('items required');
    const total = body.items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
    const po: Purchase = {
      id: newId('po'),
      poNumber: 'PO-' + Date.now().toString().slice(-8),
      ...body,
      total: Math.round(total * 100) / 100,
      status: 'ordered',
      orderedAt: new Date().toISOString(),
    };
    this.store.purchases.push(po);
    return po;
  }

  receive(id: string, userId: string) {
    const po = this.store.purchases.find(x => x.id === id);
    if (!po) throw new NotFoundException();
    if (po.status === 'received') throw new BadRequestException('Already received');

    // Create a batch per line item, increment supplier balance
    for (const it of po.items) {
      const batch = {
        id: newId('b'),
        medicineId: it.medicineId,
        batchNumber: it.batchNumber,
        supplierId: po.supplierId,
        branchId: po.branchId,
        expiryDate: it.expiryDate,
        manufactureDate: it.manufactureDate,
        quantity: it.quantity,
        costPrice: it.costPrice,
        sellingPrice: it.sellingPrice,
        receivedAt: new Date().toISOString(),
      };
      this.store.batches.push(batch);
      this.store.logInventory({
        batchId: batch.id, medicineId: batch.medicineId, branchId: po.branchId,
        type: 'purchase', quantityChange: batch.quantity,
        reason: `GRN ${po.poNumber}`, userId, refId: po.id,
      });
    }
    po.status = 'received';
    po.receivedAt = new Date().toISOString();
    const supplier = this.store.suppliers.find(s => s.id === po.supplierId);
    if (supplier) supplier.balance += po.total;
    return po;
  }

  cancel(id: string) {
    const po = this.store.purchases.find(x => x.id === id);
    if (!po) throw new NotFoundException();
    if (po.status === 'received') throw new BadRequestException('Cannot cancel received PO');
    po.status = 'cancelled';
    return po;
  }

  payment(id: string, amount: number) {
    const supplier = this.store.suppliers.find(s => s.id === id);
    if (!supplier) throw new NotFoundException();
    supplier.balance -= amount;
    return supplier;
  }

  // Forecasting stub: suggest PO lines for low-stock items
  suggestReorders(branchId?: string) {
    return this.store.medicines
      .map(m => {
        const stock = this.store.totalStock(m.id, branchId);
        return { medicine: m, stock, needed: m.reorderLevel * 2 - stock };
      })
      .filter(r => r.stock <= r.medicine.reorderLevel)
      .sort((a, b) => a.stock - b.stock);
  }
}

@Controller('purchases')
class PurchasesController {
  constructor(private svc: PurchasesService) {}
  @Get() list() { return this.svc.list(); }
  @Get('reorder-suggestions') suggest() { return this.svc.suggestReorders(); }
  @Get(':id') one(@Param('id') id: string) { return this.svc.one(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Post(':id/receive') receive(@Param('id') id: string, @Req() req: any) {
    return this.svc.receive(id, req.user?.sub || 'unknown');
  }
  @Put(':id/cancel') cancel(@Param('id') id: string) { return this.svc.cancel(id); }
  @Post('suppliers/:id/pay') pay(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.svc.payment(id, body.amount);
  }
}

@Module({ providers: [PurchasesService], controllers: [PurchasesController] })
export class PurchasesModule {}
