import { Injectable } from '@nestjs/common';
import {
  User, Branch, Supplier, Medicine, Batch, Customer,
  Prescription, Sale, Purchase, InventoryLog,
} from './types';
import { buildSeed } from './seed';

let counter = 1000;
export const newId = (prefix: string) => `${prefix}_${++counter}`;

@Injectable()
export class StoreService {
  users: User[] = [];
  branches: Branch[] = [];
  suppliers: Supplier[] = [];
  medicines: Medicine[] = [];
  batches: Batch[] = [];
  customers: Customer[] = [];
  prescriptions: Prescription[] = [];
  sales: Sale[] = [];
  purchases: Purchase[] = [];
  inventoryLogs: InventoryLog[] = [];

  constructor() {
    const seed = buildSeed();
    this.users = seed.users;
    this.branches = seed.branches;
    this.suppliers = seed.suppliers;
    this.medicines = seed.medicines;
    this.batches = seed.batches;
    this.customers = seed.customers;
    this.prescriptions = seed.prescriptions;
  }

  // FEFO ordering: returns batches for a medicine in expiry-ascending order, in-stock and not-expired
  getActiveBatches(medicineId: string, branchId?: string): Batch[] {
    const todayIso = new Date().toISOString().slice(0, 10);
    return this.batches
      .filter(b =>
        b.medicineId === medicineId &&
        b.quantity > 0 &&
        b.expiryDate > todayIso &&
        (!branchId || b.branchId === branchId)
      )
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }

  totalStock(medicineId: string, branchId?: string): number {
    return this.getActiveBatches(medicineId, branchId)
      .reduce((s, b) => s + b.quantity, 0);
  }

  // Decrement stock following FEFO. Returns the batch allocations used.
  consumeStock(medicineId: string, qty: number, branchId?: string)
    : { batchId: string; quantity: number; unitPrice: number }[] {
    const allocs: { batchId: string; quantity: number; unitPrice: number }[] = [];
    const batches = this.getActiveBatches(medicineId, branchId);
    let remaining = qty;
    for (const b of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, b.quantity);
      b.quantity -= take;
      remaining -= take;
      allocs.push({ batchId: b.id, quantity: take, unitPrice: b.sellingPrice });
    }
    if (remaining > 0) {
      // rollback
      for (const a of allocs) {
        const b = this.batches.find(x => x.id === a.batchId)!;
        b.quantity += a.quantity;
      }
      throw new Error(`Insufficient stock for medicine ${medicineId} (short by ${remaining})`);
    }
    return allocs;
  }

  logInventory(entry: Omit<InventoryLog, 'id' | 'createdAt'>) {
    this.inventoryLogs.push({
      ...entry,
      id: newId('log'),
      createdAt: new Date().toISOString(),
    });
  }
}
