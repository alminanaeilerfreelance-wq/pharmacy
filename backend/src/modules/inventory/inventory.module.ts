import {
  Body, Controller, Get, Param, Post, Query, Req,
  Module, Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { StoreService } from '../../store/store.service';

@Injectable()
class InventoryService {
  constructor(private store: StoreService) {}

  logs(query: { branchId?: string; type?: string; medicineId?: string; limit?: string }) {
    let logs = [...this.store.inventoryLogs];
    if (query.branchId) logs = logs.filter(l => l.branchId === query.branchId);
    if (query.type) logs = logs.filter(l => l.type === query.type);
    if (query.medicineId) logs = logs.filter(l => l.medicineId === query.medicineId);
    logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (query.limit) logs = logs.slice(0, +query.limit);
    return logs.map(l => ({
      ...l,
      medicine: this.store.medicines.find(m => m.id === l.medicineId),
      branch: this.store.branches.find(b => b.id === l.branchId),
    }));
  }

  adjust(body: { batchId: string; quantityChange: number; reason: string }, userId: string) {
    const batch = this.store.batches.find(b => b.id === body.batchId);
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.quantity + body.quantityChange < 0)
      throw new BadRequestException('Adjustment would result in negative stock');
    batch.quantity += body.quantityChange;
    this.store.logInventory({
      batchId: batch.id, medicineId: batch.medicineId, branchId: batch.branchId,
      type: 'adjustment', quantityChange: body.quantityChange,
      reason: body.reason, userId,
    });
    return batch;
  }

  transfer(body: { batchId: string; toBranchId: string; quantity: number }, userId: string) {
    const batch = this.store.batches.find(b => b.id === body.batchId);
    if (!batch) throw new NotFoundException('Batch not found');
    if (!this.store.branches.find(br => br.id === body.toBranchId))
      throw new NotFoundException('Destination branch not found');
    if (batch.quantity < body.quantity)
      throw new BadRequestException('Insufficient stock for transfer');

    batch.quantity -= body.quantity;
    // Create a new batch at destination (preserves original batch number / expiry)
    const destBatch = {
      ...batch,
      id: 'b_t' + Date.now(),
      branchId: body.toBranchId,
      quantity: body.quantity,
      receivedAt: new Date().toISOString(),
    };
    this.store.batches.push(destBatch);

    this.store.logInventory({
      batchId: batch.id, medicineId: batch.medicineId, branchId: batch.branchId,
      type: 'transfer', quantityChange: -body.quantity,
      reason: `Transfer to ${body.toBranchId}`, userId,
    });
    this.store.logInventory({
      batchId: destBatch.id, medicineId: batch.medicineId, branchId: body.toBranchId,
      type: 'transfer', quantityChange: body.quantity,
      reason: `Transfer from ${batch.branchId}`, userId,
    });
    return { source: batch, destination: destBatch };
  }

  // Mark expired batches as written off (removes from active stock)
  writeOffExpired(userId: string) {
    const todayIso = new Date().toISOString().slice(0, 10);
    const expired = this.store.batches.filter(b => b.quantity > 0 && b.expiryDate < todayIso);
    for (const b of expired) {
      this.store.logInventory({
        batchId: b.id, medicineId: b.medicineId, branchId: b.branchId,
        type: 'expired', quantityChange: -b.quantity,
        reason: `Expired on ${b.expiryDate}`, userId,
      });
      b.quantity = 0;
    }
    return { writtenOff: expired.length };
  }

  alerts() {
    const todayIso = new Date().toISOString().slice(0, 10);
    const cutoff = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const lowStock = this.store.medicines
      .filter(m => this.store.totalStock(m.id) <= m.reorderLevel)
      .map(m => ({ ...m, stock: this.store.totalStock(m.id) }));
    const expiringSoon = this.store.batches
      .filter(b => b.quantity > 0 && b.expiryDate >= todayIso && b.expiryDate <= cutoff);
    const expired = this.store.batches
      .filter(b => b.quantity > 0 && b.expiryDate < todayIso);
    return { lowStock, expiringSoon, expired };
  }
}

@Controller('inventory')
class InventoryController {
  constructor(private svc: InventoryService) {}
  @Get('logs') logs(@Query() q: any) { return this.svc.logs(q); }
  @Get('alerts') alerts() { return this.svc.alerts(); }
  @Post('adjust') adjust(@Body() body: any, @Req() req: any) {
    return this.svc.adjust(body, req.user?.sub || 'unknown');
  }
  @Post('transfer') transfer(@Body() body: any, @Req() req: any) {
    return this.svc.transfer(body, req.user?.sub || 'unknown');
  }
  @Post('write-off-expired') writeOff(@Req() req: any) {
    return this.svc.writeOffExpired(req.user?.sub || 'unknown');
  }
}

@Module({ providers: [InventoryService], controllers: [InventoryController] })
export class InventoryModule {}
