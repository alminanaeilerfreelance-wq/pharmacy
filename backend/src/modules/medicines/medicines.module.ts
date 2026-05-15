import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Module, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { StoreService, newId } from '../../store/store.service';
import { Medicine, Batch } from '../../store/types';

@Injectable()
class MedicinesService {
  constructor(private store: StoreService) {}

  list(query: { search?: string; category?: string; lowStock?: string }) {
    let list = this.store.medicines;
    if (query.search) {
      const q = query.search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.barcode.includes(q));
    }
    if (query.category) list = list.filter(m => m.category === query.category);
    const enriched = list.map(m => ({
      ...m,
      stock: this.store.totalStock(m.id),
      batches: this.store.batches.filter(b => b.medicineId === m.id).length,
      lowStock: this.store.totalStock(m.id) <= m.reorderLevel,
    }));
    if (query.lowStock === 'true') return enriched.filter(m => m.lowStock);
    return enriched;
  }

  one(id: string) {
    const m = this.store.medicines.find(x => x.id === id);
    if (!m) throw new NotFoundException();
    return {
      ...m,
      batches: this.store.batches
        .filter(b => b.medicineId === id)
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)),
      stock: this.store.totalStock(id),
    };
  }

  byBarcode(barcode: string) {
    const m = this.store.medicines.find(x => x.barcode === barcode);
    if (!m) throw new NotFoundException('Barcode not found');
    return this.one(m.id);
  }

  create(body: Omit<Medicine, 'id'>): Medicine {
    if (!body.name || !body.barcode) throw new BadRequestException('name and barcode required');
    if (this.store.medicines.find(m => m.barcode === body.barcode))
      throw new BadRequestException('Barcode already exists');
    const m: Medicine = { id: newId('m'), ...body };
    this.store.medicines.push(m);
    return m;
  }

  update(id: string, body: Partial<Medicine>) {
    const m = this.store.medicines.find(x => x.id === id);
    if (!m) throw new NotFoundException();
    Object.assign(m, body, { id });
    return m;
  }

  remove(id: string) {
    const i = this.store.medicines.findIndex(x => x.id === id);
    if (i < 0) throw new NotFoundException();
    this.store.medicines.splice(i, 1);
    return { ok: true };
  }

  addBatch(medicineId: string, body: Omit<Batch, 'id' | 'medicineId' | 'receivedAt'>): Batch {
    if (!this.store.medicines.find(m => m.id === medicineId))
      throw new NotFoundException('Medicine not found');
    const batch: Batch = {
      id: newId('b'),
      medicineId,
      ...body,
      receivedAt: new Date().toISOString(),
    };
    this.store.batches.push(batch);
    this.store.logInventory({
      batchId: batch.id, medicineId, branchId: batch.branchId,
      type: 'adjustment', quantityChange: batch.quantity,
      reason: 'Manual batch creation', userId: 'system',
    });
    return batch;
  }

  expiringSoon(days = 60) {
    const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    const todayIso = new Date().toISOString().slice(0, 10);
    return this.store.batches
      .filter(b => b.quantity > 0 && b.expiryDate >= todayIso && b.expiryDate <= cutoff)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
      .map(b => ({
        ...b,
        medicine: this.store.medicines.find(m => m.id === b.medicineId),
        daysToExpiry: Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000),
      }));
  }

  expired() {
    const todayIso = new Date().toISOString().slice(0, 10);
    return this.store.batches
      .filter(b => b.quantity > 0 && b.expiryDate < todayIso)
      .map(b => ({ ...b, medicine: this.store.medicines.find(m => m.id === b.medicineId) }));
  }
}

@Controller('medicines')
class MedicinesController {
  constructor(private svc: MedicinesService) {}
  @Get() list(@Query() q: any) { return this.svc.list(q); }
  @Get('expiring') expiring(@Query('days') d?: string) { return this.svc.expiringSoon(d ? +d : 60); }
  @Get('expired') expired() { return this.svc.expired(); }
  @Get('barcode/:bc') byBarcode(@Param('bc') bc: string) { return this.svc.byBarcode(bc); }
  @Get(':id') one(@Param('id') id: string) { return this.svc.one(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
  @Post(':id/batches') addBatch(@Param('id') id: string, @Body() body: any) { return this.svc.addBatch(id, body); }
}

@Module({ providers: [MedicinesService], controllers: [MedicinesController] })
export class MedicinesModule {}
