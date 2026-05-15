import {
  Body, Controller, Delete, Get, Param, Post, Put,
  Module, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { StoreService, newId } from '../../store/store.service';
import { User } from '../../store/types';
import { Roles } from '../../auth/jwt.guard';

@Injectable()
class UsersService {
  constructor(private store: StoreService) {}
  list() {
    return this.store.users.map(({ passwordHash, ...rest }) => rest);
  }
  one(id: string) {
    const u = this.store.users.find(x => x.id === id);
    if (!u) throw new NotFoundException();
    const { passwordHash, ...rest } = u;
    return rest;
  }
  async create(body: any): Promise<Omit<User, 'passwordHash'>> {
    const u: User = {
      id: newId('u'),
      username: body.username,
      passwordHash: await bcrypt.hash(body.password || 'password123', 8),
      fullName: body.fullName,
      role: body.role,
      branchId: body.branchId,
      active: body.active ?? true,
      createdAt: new Date().toISOString(),
    };
    this.store.users.push(u);
    const { passwordHash, ...rest } = u;
    return rest;
  }
  async update(id: string, body: any) {
    const u = this.store.users.find(x => x.id === id);
    if (!u) throw new NotFoundException();
    if (body.password) u.passwordHash = await bcrypt.hash(body.password, 8);
    delete body.password;
    Object.assign(u, body, { id });
    const { passwordHash, ...rest } = u;
    return rest;
  }
  remove(id: string) {
    const i = this.store.users.findIndex(x => x.id === id);
    if (i < 0) throw new NotFoundException();
    this.store.users.splice(i, 1);
    return { ok: true };
  }
}

@Controller('users')
@Roles('admin', 'manager')
class UsersController {
  constructor(private svc: UsersService) {}
  @Get() list() { return this.svc.list(); }
  @Get(':id') one(@Param('id') id: string) { return this.svc.one(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ providers: [UsersService], controllers: [UsersController] })
export class UsersModule {}
