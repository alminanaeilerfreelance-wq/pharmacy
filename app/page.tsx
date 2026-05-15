'use client';
import { useEffect, useState } from 'react';
import { api, fmt } from '@/lib/api';
import {
  TrendingUp, Package, AlertTriangle, FileText,
  DollarSign, Users, ShoppingCart, Clock,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar,
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard'),
      api.get('/reports/sales-by-day?days=14'),
      api.get('/reports/best-sellers?days=30'),
    ])
      .then(([s, d, b]) => { setStats(s); setSalesByDay(d); setBestSellers(b.slice(0, 5)); })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="card text-red-600">Error: {error}</div>;
  if (!stats) return <div className="text-slate-500">Loading…</div>;

  const cards = [
    { label: 'Today Revenue', value: fmt.money(stats.todayRevenue), icon: DollarSign, color: 'bg-green-100 text-green-700' },
    { label: 'Today Sales', value: stats.todaySalesCount, icon: ShoppingCart, color: 'bg-blue-100 text-blue-700' },
    { label: 'Stock Value', value: fmt.money(stats.totalStockValue), icon: Package, color: 'bg-purple-100 text-purple-700' },
    { label: 'Customers', value: stats.totalCustomers, icon: Users, color: 'bg-amber-100 text-amber-700' },
    { label: 'Low Stock', value: stats.lowStockCount, icon: AlertTriangle, color: 'bg-orange-100 text-orange-700', alert: stats.lowStockCount > 0 },
    { label: 'Expiring (60d)', value: stats.expiringSoonCount, icon: Clock, color: 'bg-yellow-100 text-yellow-700', alert: stats.expiringSoonCount > 0 },
    { label: 'Expired', value: stats.expiredCount, icon: AlertTriangle, color: 'bg-red-100 text-red-700', alert: stats.expiredCount > 0 },
    { label: 'Pending Rx', value: stats.pendingPrescriptions, icon: FileText, color: 'bg-teal-100 text-teal-700' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm">Real-time pharmacy operations overview</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`card ${c.alert ? 'border-l-4 border-l-red-500' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
                <div className="text-2xl font-bold mt-1">{c.value}</div>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Sales — Last 14 days</h2>
            <TrendingUp className="text-brand-600" size={18} />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={salesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-4">Top sellers — Last 30 days</h2>
          {bestSellers.length === 0 ? (
            <p className="text-sm text-slate-500">No sales yet — try the POS to record some.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bestSellers.map(b => ({ name: b.medicine?.name?.slice(0, 18), qty: b.qty }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qty" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
