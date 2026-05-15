import {
  Body, Controller, Delete, Get, Param, Post, Put, Query, Req,
  Module, Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { StoreService, newId } from '../../store/store.service';
import { Prescription } from '../../store/types';

// Toy interaction matrix — would come from an external drug DB in production
const INTERACTIONS: Record<string, string[]> = {
  m6: ['m4'], // Tramadol + cough suppressant — caution
  m2: [],     // Amoxicillin — no flagged interactions in this seed
};

@Injectable()
class PrescriptionsService {
  constructor(private store: StoreService) {}

  list(status?: string) {
    let list = this.store.prescriptions;
    if (status) list = list.filter(p => p.status === status);
    return list.map(p => ({
      ...p,
      customer: this.store.customers.find(c => c.id === p.customerId),
    }));
  }

  one(id: string) {
    const p = this.store.prescriptions.find(x => x.id === id);
    if (!p) throw new NotFoundException();
    const items = p.items.map(i => ({
      ...i,
      medicine: this.store.medicines.find(m => m.id === i.medicineId),
      stock: this.store.totalStock(i.medicineId),
    }));
    return {
      ...p,
      items,
      customer: this.store.customers.find(c => c.id === p.customerId),
      interactions: this.checkInteractions(p.items.map(i => i.medicineId)),
    };
  }

  private checkInteractions(medicineIds: string[]): string[] {
    const warnings: string[] = [];
    for (const id of medicineIds) {
      const conflicts = INTERACTIONS[id] || [];
      for (const c of conflicts) {
        if (medicineIds.includes(c)) {
          const a = this.store.medicines.find(m => m.id === id)?.name;
          const b = this.store.medicines.find(m => m.id === c)?.name;
          warnings.push(`Interaction: ${a} ⇄ ${b} — review before dispensing`);
        }
      }
    }
    return warnings;
  }

  create(body: Omit<Prescription, 'id' | 'status'>): Prescription {
    if (!body.customerId || !body.items?.length)
      throw new BadRequestException('customerId and items required');
    const rx: Prescription = { id: newId('rx'), status: 'pending', ...body };
    this.store.prescriptions.push(rx);
    return rx;
  }

  verify(id: string, userId: string) {
    const rx = this.store.prescriptions.find(x => x.id === id);
    if (!rx) throw new NotFoundException();
    rx.status = 'verified';
    rx.verifiedBy = userId;
    return rx;
  }

  reject(id: string, userId: string, reason: string) {
    const rx = this.store.prescriptions.find(x => x.id === id);
    if (!rx) throw new NotFoundException();
    rx.status = 'rejected';
    rx.verifiedBy = userId;
    rx.notes = (rx.notes || '') + `\n[REJECTED] ${reason}`;
    return rx;
  }

  update(id: string, body: Partial<Prescription>) {
    const rx = this.store.prescriptions.find(x => x.id === id);
    if (!rx) throw new NotFoundException();
    Object.assign(rx, body, { id });
    return rx;
  }

  remove(id: string) {
    const i = this.store.prescriptions.findIndex(x => x.id === id);
    if (i < 0) throw new NotFoundException();
    this.store.prescriptions.splice(i, 1);
    return { ok: true };
  }
}

@Controller('prescriptions')
class PrescriptionsController {
  constructor(private svc: PrescriptionsService) {}
  @Get() list(@Query('status') s?: string) { return this.svc.list(s); }
  @Get(':id') one(@Param('id') id: string) { return this.svc.one(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Post(':id/verify') verify(@Param('id') id: string, @Req() req: any) { return this.svc.verify(id, req.user?.sub || 'unknown'); }
  @Post(':id/reject') reject(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.svc.reject(id, req.user?.sub || 'unknown', body?.reason || 'not specified');
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ providers: [PrescriptionsService], controllers: [PrescriptionsController] })
export class PrescriptionsModule {}
