'use client';
import { useEffect, useState } from 'react';
import { api, fmt } from '@/lib/api';
import { Plus, Search, X, User, Award } from 'lucide-react';

export default function CustomersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const load = () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/customers${q}`).then(setItems);
  };
  useEffect(load, [search]);

  const open = async (id: string) => setSelected(await api.get(`/customers/${id}`));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus size={16} /> New customer
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input className="input pl-10" placeholder="Search by name, phone, or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Insurance</th>
              <th className="text-right p-3">Loyalty pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No customers found.</td></tr>
            )}
            {items.map(c => (
              <tr key={c.id} className="table-row cursor-pointer" onClick={() => open(c.id)}>
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-slate-600">{c.phone}</td>
                <td className="p-3 text-slate-600">{c.email || '—'}</td>
                <td className="p-3 text-slate-600">{c.insuranceProvider || '—'}</td>
                <td className="p-3 text-right">
                  <span className="badge bg-purple-100 text-purple-700">{c.loyaltyPoints} pts</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <CustomerDetail c={selected} onClose={() => setSelected(null)} />}
      {showAdd && <NewCustomer onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function CustomerDetail({ c, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-40" onClick={onClose}>
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User className="text-brand-600" />
              <h2 className="text-xl font-bold">{c.name}</h2>
            </div>
            <p className="text-sm text-slate-500">{c.phone}{c.email ? ` · ${c.email}` : ''}</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
            <Award className="text-purple-600" />
            <div>
              <div className="text-xs uppercase text-purple-700 font-semibold">Loyalty</div>
              <div className="text-2xl font-bold text-purple-800">{c.loyaltyPoints} pts</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Date of birth" value={fmt.date(c.dateOfBirth)} />
            <Field label="Address" value={c.address || '—'} />
            <Field label="Insurance" value={c.insuranceProvider || '—'} />
            <Field label="Insurance #" value={c.insuranceNumber || '—'} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-semibold mb-2">Sales history ({c.sales?.length || 0})</h3>
            {c.sales?.length === 0 && <p className="text-sm text-slate-500">No sales yet.</p>}
            <div className="space-y-1">
              {c.sales?.map((s: any) => (
                <div key={s.id} className="flex justify-between border border-slate-100 rounded p-2 text-sm">
                  <div>
                    <div className="font-medium">{s.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">{fmt.datetime(s.createdAt)} · {s.items.length} items</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmt.money(s.total)}</div>
                    <span className={`badge text-xs ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-semibold mb-2">Prescriptions ({c.prescriptions?.length || 0})</h3>
            {c.prescriptions?.length === 0 && <p className="text-sm text-slate-500">None.</p>}
            <div className="space-y-1">
              {c.prescriptions?.map((p: any) => (
                <div key={p.id} className="flex justify-between border border-slate-100 rounded p-2 text-sm">
                  <div>
                    <div className="font-medium">{p.id}</div>
                    <div className="text-xs text-slate-500">{p.doctorName} · {fmt.date(p.issuedDate)}</div>
                  </div>
                  <span className="badge bg-blue-100 text-blue-700">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, value }: any) => (
  <div><span className="label">{label}</span><div>{value}</div></div>
);

function NewCustomer({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: '', phone: '', email: '', dateOfBirth: '', address: '',
    insuranceProvider: '', insuranceNumber: '',
  });
  const [err, setErr] = useState('');
  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });
  const submit = async () => {
    try { await api.post('/customers', form); onSaved(); }
    catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-4">New customer</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={e => upd('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Phone *</label>
            <input className="input" value={form.phone} onChange={e => upd('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email} onChange={e => upd('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Date of birth</label>
            <input className="input" type="date" value={form.dateOfBirth} onChange={e => upd('dateOfBirth', e.target.value)} />
          </div>
          <div>
            <label className="label">Insurance provider</label>
            <input className="input" value={form.insuranceProvider} onChange={e => upd('insuranceProvider', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Insurance number</label>
            <input className="input" value={form.insuranceNumber} onChange={e => upd('insuranceNumber', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => upd('address', e.target.value)} />
          </div>
        </div>
        {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
        <div className="flex gap-2 mt-4 justify-end">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}
