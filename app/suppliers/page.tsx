'use client';
import { useEffect, useState } from 'react';
import { api, fmt } from '@/lib/api';
import { Plus } from 'lucide-react';

export default function SuppliersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => api.get('/suppliers').then(setItems);
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus size={16} /> New supplier
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-right p-3">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(s => (
              <tr key={s.id} className="table-row">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 text-slate-600">{s.contact}</td>
                <td className="p-3 text-slate-600">{s.email}</td>
                <td className="p-3 text-slate-600">{s.phone}</td>
                <td className={`p-3 text-right ${s.balance > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                  {fmt.money(s.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <NewSupplier onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function NewSupplier({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({ name: '', contact: '', email: '', phone: '', address: '' });
  const submit = async () => { await api.post('/suppliers', form); onSaved(); };
  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-4">New supplier</h2>
        {['name', 'contact', 'email', 'phone', 'address'].map(k => (
          <div key={k} className="mb-3">
            <label className="label capitalize">{k}</label>
            <input className="input" value={form[k]} onChange={e => upd(k, e.target.value)} />
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}
