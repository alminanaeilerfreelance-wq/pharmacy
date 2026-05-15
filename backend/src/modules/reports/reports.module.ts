import { Controller, Get, Module, Injectable, Query } from '@nestjs/common';
import { StoreService } from '../../store/store.service';

@Injectable()
class ReportsService {
  constructor(private store: StoreService) {}

  dashboard() {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = this.store.sales.filter(s => s.createdAt.startsWith(today));
    const totalRevenue = todaySales.reduce((s, x) => s + x.total, 0);

    const stockValue = this.store.batches.reduce(
      (s, b) => s + b.quantity * b.costPrice, 0,
    );
    const todayIso = today;
    const cutoff60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

    return {
      todaySalesCount: todaySales.length,
      todayRevenue: round2(totalRevenue),
      totalStockValue: round2(stockValue),
      activeMedicines: this.store.medicines.length,
      lowStockCount: this.store.medicines.filter(m => this.store.totalStock(m.id) <= m.reorderLevel).length,
      expiringSoonCount: this.store.batches.filter(b => b.quantity > 0 && b.expiryDate >= todayIso && b.expiryDate <= cutoff60).length,
      expiredCount: this.store.batches.filter(b => b.quantity > 0 && b.expiryDate < todayIso).length,
      pendingPrescriptions: this.store.prescriptions.filter(p => p.status === 'pending').length,
      totalCustomers: this.store.customers.length,
      openPOs: this.store.purchases.filter(p => p.status === 'ordered').length,
    };
  }

  bestSellers(days = 30) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const counts: Record<string, { qty: number; revenue: number }> = {};
    for (const s of this.store.sales) {
      if (s.createdAt < cutoff || s.status === 'refunded') continue;
      for (const it of s.items) {
        const k = it.medicineId;
        counts[k] ||= { qty: 0, revenue: 0 };
        counts[k].qty += it.quantity;
        counts[k].revenue += it.lineTotal;
      }
    }
    return Object.entries(counts)
      .map(([medicineId, v]) => ({
        medicine: this.store.medicines.find(m => m.id === medicineId),
        qty: v.qty,
        revenue: round2(v.revenue),
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 20);
  }

  slowMovers(days = 30) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const sold = new Set<string>();
    for (const s of this.store.sales) {
      if (s.createdAt < cutoff) continue;
      for (const it of s.items) sold.add(it.medicineId);
    }
    return this.store.medicines
      .filter(m => !sold.has(m.id))
      .map(m => ({ ...m, stock: this.store.totalStock(m.id) }));
  }

  salesByDay(days = 30) {
    const buckets: Record<string, { revenue: number; transactions: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      buckets[d] = { revenue: 0, transactions: 0 };
    }
    for (const s of this.store.sales) {
      const d = s.createdAt.slice(0, 10);
      if (buckets[d]) {
        buckets[d].revenue += s.total;
        buckets[d].transactions += 1;
      }
    }
    return Object.entries(buckets).map(([date, v]) => ({
      date, revenue: round2(v.revenue), transactions: v.transactions,
    }));
  }

  inventoryValuation() {
    return this.store.medicines.map(m => {
      const batches = this.store.batches.filter(b => b.medicineId === m.id && b.quantity > 0);
      const qty = batches.reduce((s, b) => s + b.quantity, 0);
      const cost = batches.reduce((s, b) => s + b.quantity * b.costPrice, 0);
      const retail = batches.reduce((s, b) => s + b.quantity * b.sellingPrice, 0);
      return {
        medicine: m,
        quantity: qty,
        costValue: round2(cost),
        retailValue: round2(retail),
        potentialProfit: round2(retail - cost),
      };
    });
  }

  profitMargins(days = 30) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    let revenue = 0, cost = 0;
    for (const s of this.store.sales) {
      if (s.createdAt < cutoff || s.status === 'refunded') continue;
      for (const it of s.items) {
        const batch = this.store.batches.find(b => b.id === it.batchId);
        revenue += it.lineTotal - it.tax;
        cost += (batch?.costPrice || 0) * it.quantity;
      }
    }
    return {
      periodDays: days,
      revenue: round2(revenue),
      cost: round2(cost),
      profit: round2(revenue - cost),
      marginPct: revenue ? round2(((revenue - cost) / revenue) * 100) : 0,
    };
  }

  supplierPerformance() {
    return this.store.suppliers.map(s => {
      const pos = this.store.purchases.filter(p => p.supplierId === s.id);
      const received = pos.filter(p => p.status === 'received');
      const totalSpent = received.reduce((sum, p) => sum + p.total, 0);
      return {
        supplier: s,
        totalOrders: pos.length,
        receivedOrders: received.length,
        totalSpent: round2(totalSpent),
        outstandingBalance: round2(s.balance),
      };
    });
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

@Controller('reports')
class ReportsController {
  constructor(private svc: ReportsService) {}
  @Get('dashboard') dashboard() { return this.svc.dashboard(); }
  @Get('best-sellers') best(@Query('days') d?: string) { return this.svc.bestSellers(d ? +d : 30); }
  @Get('slow-movers') slow(@Query('days') d?: string) { return this.svc.slowMovers(d ? +d : 30); }
  @Get('sales-by-day') sbd(@Query('days') d?: string) { return this.svc.salesByDay(d ? +d : 30); }
  @Get('inventory-valuation') iv() { return this.svc.inventoryValuation(); }
  @Get('profit-margins') pm(@Query('days') d?: string) { return this.svc.profitMargins(d ? +d : 30); }
  @Get('supplier-performance') sp() { return this.svc.supplierPerformance(); }
}

@Module({ providers: [ReportsService], controllers: [ReportsController] })
export class ReportsModule {}
