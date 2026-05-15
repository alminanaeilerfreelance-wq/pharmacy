import {
  Body, Controller, Delete, Get, Param, Post, Put, Query,
  Module, Injectable, NotFoundException,
} from '@nestjs/common';
import { StoreService, newId } from '../../store/store.service';
import { Customer } from '../../store/types';

@Injectable()
class CustomersService {
  constructor(private store: StoreService) {}
  list(search?: string) {
    let list = this.store.customers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email || '').toLowerCase().includes(q));
    }
    return list;
  }
  one(id: string) {
    const c = this.store.customers.find(x => x.id === id);
    if (!c) throw new NotFoundException();
    const sales = this.store.sales.filter(s => s.customerId === id);
    const prescriptions = this.store.prescriptions.filter(p => p.customerId === id);
    return { ...c, sales, prescriptions };
  }
  create(body: Omit<Customer, 'id' | 'loyaltyPoints'>): Customer {
    const c: Customer = { id: newId('c'), loyaltyPoints: 0, ...body };
    this.store.customers.push(c);
    return c;
  }
  update(id: string, body: Partial<Customer>) {
    const c = this.store.customers.find(x => x.id === id);
    if (!c) throw new NotFoundException();
    Object.assign(c, body, { id });
    return c;
  }
  remove(id: string) {
    const i = this.store.customers.findIndex(x => x.id === id);
    if (i < 0) throw new NotFoundException();
    this.store.customers.splice(i, 1);
    return { ok: true };
  }
}

@Controller('customers')
class CustomersController {
  constructor(private svc: CustomersService) {}
  @Get() list(@Query('search') s?: string) { return this.svc.list(s); }
  @Get(':id') one(@Param('id') id: string) { return this.svc.one(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ providers: [CustomersService], controllers: [CustomersController] })
export class CustomersModule {}
