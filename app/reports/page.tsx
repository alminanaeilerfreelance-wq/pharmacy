'use client';
import { useEffect, useState } from 'react';
import { api, fmt } from '@/lib/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Truck } from 'lucide-react';

export default function ReportsPage() {
  const [tab, setTab] = useState<'overview' | 'sales' | 'inventory' | 'suppliers'>('overview');
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [slowMovers, setSlowMovers] = useState<any[]>([]);
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any[]>([]);
  const [margins, setMargins] = useState<any>(null);
  const [supplierPerf, setSupplierPerf] = useState<any[]>([]);

  useEffect(() => {
    api.get('/reports/best-sellers?days=30').then(setBestSellers);
    api.get('/reports/slow-movers?days=30').then(setSlowMovers);
    api.get('/reports/sales-by-day?days=30').then(setSalesByDay);
    api.get('/reports/inventory-valuation').then(setValuation);
    api.get('/reports/profit-margins?days=30').then(setMargins);
    api.get('/reports/supplier-performance').then(setSupplierPerf);
  }, []);

  const totalStockCost = valuation.reduce((s, v) => s + v.costValue, 0);
  const totalStockRetail = valuation.reduce((s, v) => s + v.retailValue, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { k: 'overview',  l: 'Overview',   icon: TrendingUp },
          { k: 'sales',     l: 'Sales',      icon: DollarSign },
          { k: 'inventory', l: 'Inventory',  icon: Package },
          { k: 'suppliers', l: 'Suppliers',  icon: Truck },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.k ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'}`}>
            <t.icon size={14} className="inline mr-1" /> {t.l}
          </button>
        ))}
      </div>

      {tab === 'overview' && margins && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label="Revenue (30d)" value={fmt.money(margins.revenue)} icon={TrendingUp} />
            <KPI label="Cost (30d)" value={fmt.money(margins.cost)} icon={DollarSign} />
            <KPI label="Profit (30d)" value={fmt.money(margins.profit)} icon={TrendingUp} accent="green" />
            <KPI label="Margin %" value={`${margins.marginPct}%`} icon={TrendingUp} accent="green" />
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Sales — Last 30 days</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="text-green-600" size={18} /> Best sellers (30d)
            </h2>
            <BestSellersTable items={bestSellers} />
          </div>
          <div className="card">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="text-red-600" size={18} /> Slow movers (30d, no sales)
            </h2>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-2">Medicine</th>
                  <th className="text-right p-2">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slowMovers.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-slate-500">All medicines have moved.</td></tr>}
                {slowMovers.slice(0, 12).map(m => (
                  <tr key={m.id}>
                    <td className="p-2">{m.name}</td>
                    <td className="p-2 text-right">{m.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <KPI label="Cost value" value={fmt.money(totalStockCost)} icon={Package} />
            <KPI label="Retail value" value={fmt.money(totalStockRetail)} icon={Package} />
            <KPI label="Potential profit" value={fmt.money(totalStockRetail - totalStockCost)} icon={TrendingUp} accent="green" />
          </div>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-3">Medicine</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-right p-3">Cost value</th>
                  <th className="text-right p-3">Retail value</th>
                  <th className="text-right p-3">Potential profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {valuation.map((v, i) => (
                  <tr key={i}>
                    <td className="p-3">{v.medicine?.name}</td>
                    <td className="p-3 text-right">{v.quantity}</td>
                    <td className="p-3 text-right">{fmt.money(v.costValue)}</td>
                    <td className="p-3 text-right">{fmt.money(v.retailValue)}</td>
                    <td className="p-3 text-right text-green-700 font-medium">{fmt.money(v.potentialProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left p-3">Supplier</th>
                <th className="text-right p-3">Total orders</th>
                <th className="text-right p-3">Received</th>
                <th className="text-right p-3">Total spent</th>
                <th className="text-right p-3">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplierPerf.map((sp, i) => (
                <tr key={i}>
                  <td className="p-3 font-medium">{sp.supplier.name}</td>
                  <td className="p-3 text-right">{sp.totalOrders}</td>
                  <td className="p-3 text-right">{sp.receivedOrders}</td>
                  <td className="p-3 text-right">{fmt.money(sp.totalSpent)}</td>
                  <td className={`p-3 text-right ${sp.outstandingBalance > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                    {fmt.money(sp.outstandingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, icon: Icon, accent }: any) {
  const color = accent === 'green' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700';
  return (
    <div className="card flex items-center justify-between">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-xl font-bold mt-1">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
    </div>
  );
}

function BestSellersTable({ items }: any) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase text-slate-500">
        <tr>
          <th className="text-left p-2">Medicine</th>
          <th className="text-right p-2">Qty sold</th>
          <th className="text-right p-2">Revenue</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-500">No sales yet.</td></tr>}
        {items.slice(0, 12).map((b: any, i: number) => (
          <tr key={i}>
            <td className="p-2">{b.medicine?.name}</td>
            <td className="p-2 text-right">{b.qty}</td>
            <td className="p-2 text-right font-medium">{fmt.money(b.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
