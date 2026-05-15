'use client';
import { useEffect, useState } from 'react';
import { api, fmt } from '@/lib/api';
import { Plus, Building2, Warehouse } from 'lucide-react';

export default function BranchesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => api.get('/branches').then(setItems);
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Branches & Warehouses</h1>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus size={16} /> New branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(b => (
          <div key={b.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${b.isWarehouse ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700'}`}>
                {b.isWarehouse ? <Warehouse size={22} /> : <Building2 size={22} />}
              </div>
              {b.isWarehouse && <span className="badge bg-amber-100 text-amber-700">Warehouse</span>}
            </div>
            <h3 className="font-bold text-slate-800">{b.name}</h3>
            <p className="text-sm text-slate-500 mb-3">{b.address}</p>
            <p className="text-xs text-slate-500 mb-3">📞 {b.phone}</p>
            <div className="border-t border-slate-100 pt-3 flex justify-between text-sm">
              <div>
                <div className="text-xs text-slate-500">Stock value</div>
                <div className="font-semibold">{fmt.money(b.stockValue)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Active SKUs</div>
                <div className="font-semibold">{b.itemCount}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <NewBranch onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function NewBranch({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({ name: '', address: '', phone: '', isWarehouse: false });
  const submit = async () => { await api.post('/branches', form); onSaved(); };
  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-4">New branch</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e => upd('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => upd('address', e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => upd('phone', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isWarehouse} onChange={e => upd('isWarehouse', e.target.checked)} />
            This is a warehouse (no retail sales)
          </label>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}
