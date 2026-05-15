import {
  Body, Controller, Delete, Get, Param, Post, Put,
  Module, Injectable, NotFoundException,
} from '@nestjs/common';
import { StoreService, newId } from '../../store/store.service';
import { Supplier } from '../../store/types';

@Injectable()
class SuppliersService {
  constructor(private store: StoreService) {}
  list() { return this.store.suppliers; }
  one(id: string) {
    const s = this.store.suppliers.find(x => x.id === id);
    if (!s) throw new NotFoundException();
    const purchases = this.store.purchases.filter(p => p.supplierId === id);
    return { ...s, purchases };
  }
  create(body: Omit<Supplier, 'id'>): Supplier {
    const s: Supplier = { id: newId('s'), balance: 0, ...body };
    this.store.suppliers.push(s);
    return s;
  }
  update(id: string, body: Partial<Supplier>) {
    const s = this.store.suppliers.find(x => x.id === id);
    if (!s) throw new NotFoundException();
    Object.assign(s, body, { id });
    return s;
  }
  remove(id: string) {
    const i = this.store.suppliers.findIndex(x => x.id === id);
    if (i < 0) throw new NotFoundException();
    this.store.suppliers.splice(i, 1);
    return { ok: true };
  }
}

@Controller('suppliers')
class SuppliersController {
  constructor(private svc: SuppliersService) {}
  @Get() list() { return this.svc.list(); }
  @Get(':id') one(@Param('id') id: string) { return this.svc.one(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ providers: [SuppliersService], controllers: [SuppliersController] })
export class SuppliersModule {}
