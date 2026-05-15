import {
  Body, Controller, Delete, Get, Param, Post, Put,
  Module, Injectable, NotFoundException,
} from '@nestjs/common';
import { StoreService, newId } from '../../store/store.service';
import { Branch } from '../../store/types';

@Injectable()
class BranchesService {
  constructor(private store: StoreService) {}

  list() {
    return this.store.branches.map(br => {
      const branchBatches = this.store.batches.filter(b => b.branchId === br.id);
      const stockValue = branchBatches.reduce((s, b) => s + b.quantity * b.costPrice, 0);
      const itemCount = branchBatches.filter(b => b.quantity > 0).length;
      return { ...br, stockValue: Math.round(stockValue * 100) / 100, itemCount };
    });
  }

  one(id: string) {
    const br = this.store.branches.find(x => x.id === id);
    if (!br) throw new NotFoundException();
    return br;
  }

  create(body: Omit<Branch, 'id'>): Branch {
    const br: Branch = { id: newId('br'), ...body };
    this.store.branches.push(br);
    return br;
  }

  update(id: string, body: Partial<Branch>) {
    const br = this.store.branches.find(x => x.id === id);
    if (!br) throw new NotFoundException();
    Object.assign(br, body, { id });
    return br;
  }

  remove(id: string) {
    const i = this.store.branches.findIndex(x => x.id === id);
    if (i < 0) throw new NotFoundException();
    this.store.branches.splice(i, 1);
    return { ok: true };
  }
}

@Controller('branches')
class BranchesController {
  constructor(private svc: BranchesService) {}
  @Get() list() { return this.svc.list(); }
  @Get(':id') one(@Param('id') id: string) { return this.svc.one(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ providers: [BranchesService], controllers: [BranchesController] })
export class BranchesModule {}
