'use client';
import { useEffect, useState } from 'react';
import { api, fmt } from '@/lib/api';
import { Plus, Search, AlertTriangle, X } from 'lucide-react';

export default function InventoryPage() {
  const [tab, setTab] = useState<'all' | 'low' | 'expiring' | 'expired'>('all');
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);

  const load = () => {
    if (tab === 'all')      api.get(`/medicines?search=${search}`).then(setItems);
    if (tab === 'low')      api.get('/medicines?lowStock=true').then(setItems);
    if (tab === 'expiring') api.get('/medicines/expiring?days=60').then(setItems);
    if (tab === 'expired')  api.get('/medicines/expired').then(setItems);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, search]);

  const openDetail = async (m: any) => {
    const id = m.id || m.medicineId;
    const full = await api.get(`/medicines/${id}`);
    setSelected(full);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus size={16} /> New medicine
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { k: 'all',      l: 'All medicines' },
          { k: 'low',      l: 'Low stock' },
          { k: 'expiring', l: 'Expiring soon' },
          { k: 'expired',  l: 'Expired' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              tab === t.k ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Search by name, generic, barcode…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              {tab === 'expiring' || tab === 'expired' ? (
                <>
                  <th className="text-left p-3">Batch</th>
                  <th className="text-left p-3">Expiry</th>
                  <th className="text-right p-3">Qty</th>
                </>
              ) : (
                <>
                  <th className="text-left p-3">Barcode</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-right p-3">Reorder lvl</th>
                </>
              )}
              <th className="text-left p-3">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No items.</td></tr>
            )}
            {items.map((m: any, i) => (
              <tr key={(m.id || m.medicineId) + i} className="table-row cursor-pointer"
                  onClick={() => openDetail(m.medicine || m)}>
                <td className="p-3 font-medium">{m.medicine?.name || m.name}</td>
                <td className="p-3 text-slate-600">{m.medicine?.category || m.category}</td>
                {tab === 'expiring' || tab === 'expired' ? (
                  <>
                    <td className="p-3 text-slate-600">{m.batchNumber}</td>
                    <td className="p-3 text-slate-600">
                      {fmt.date(m.expiryDate)}
                      {m.daysToExpiry !== undefined && (
                        <span className="ml-2 text-xs text-amber-700">({m.daysToExpiry}d)</span>
                      )}
                    </td>
                    <td className="p-3 text-right">{m.quantity}</td>
                  </>
                ) : (
                  <>
                    <td className="p-3 text-slate-600">{m.barcode}</td>
                    <td className={`p-3 text-right font-medium ${m.lowStock ? 'text-orange-600' : ''}`}>{m.stock}</td>
                    <td className="p-3 text-right text-slate-500">{m.reorderLevel}</td>
                  </>
                )}
                <td className="p-3">
                  {(m.medicine?.prescriptionRequired ?? m.prescriptionRequired) &&
                    <span className="badge bg-amber-100 text-amber-700 mr-1">Rx</span>}
                  {(m.medicine?.controlled ?? m.controlled) &&
                    <span className="badge bg-red-100 text-red-700 mr-1">Controlled</span>}
                  {m.lowStock && <span className="badge bg-orange-100 text-orange-700"><AlertTriangle size={10} /> Low</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <DetailDrawer m={selected} onClose={() => setSelected(null)}
          onAddBatch={() => setShowAddBatch(true)} onSaved={load} />
      )}

      {showAdd && <NewMedicineModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {showAddBatch && selected && (
        <NewBatchModal medicineId={selected.id} onClose={() => setShowAddBatch(false)}
          onSaved={async () => { setShowAddBatch(false); const f = await api.get(`/medicines/${selected.id}`); setSelected(f); load(); }} />
      )}
    </div>
  );
}

function DetailDrawer({ m, onClose, onAddBatch, onSaved }: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-40" onClick={onClose}>
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{m.name}</h2>
            <p className="text-sm text-slate-500">{m.genericName} · {m.manufacturer}</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Barcode" value={m.barcode} />
            <Field label="Category" value={m.category} />
            <Field label="Unit" value={m.unit} />
            <Field label="Shelf" value={m.shelfLocation} />
            <Field label="Reorder level" value={m.reorderLevel} />
            <Field label="Tax rate" value={`${m.taxRate}%`} />
            <Field label="Prescription" value={m.prescriptionRequired ? 'Required' : 'OTC'} />
            <Field label="Controlled" value={m.controlled ? 'Yes' : 'No'} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Batches ({m.batches?.length || 0})</h3>
              <button className="btn btn-secondary text-xs" onClick={onAddBatch}>
                <Plus size={14} /> Add batch
              </button>
            </div>
            <div className="space-y-2">
              {(m.batches || []).map((b: any) => {
                const expired = new Date(b.expiryDate) < new Date();
                return (
                  <div key={b.id} className={`border rounded-lg p-3 text-sm ${expired ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                    <div className="flex justify-between">
                      <div>
                        <strong>{b.batchNumber}</strong> · Qty <strong>{b.quantity}</strong>
                      </div>
                      <div className={expired ? 'text-red-700 font-medium' : 'text-slate-600'}>
                        Exp {fmt.date(b.expiryDate)} {expired && '(EXPIRED)'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Cost {fmt.money(b.costPrice)} · Sell {fmt.money(b.sellingPrice)}
                    </div>
                  </div>
                );
              })}
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

function NewMedicineModal({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: '', genericName: '', category: '', manufacturer: '', barcode: '',
    unit: 'tablet', prescriptionRequired: false, controlled: false,
    reorderLevel: 20, taxRate: 15, shelfLocation: '',
  });
  const [err, setErr] = useState('');
  const submit = async () => {
    try { await api.post('/medicines', form); onSaved(); }
    catch (e: any) { setErr(e.message); }
  };
  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-4">New medicine</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name" value={form.name} onChange={v => upd('name', v)} />
          <Input label="Generic name" value={form.genericName} onChange={v => upd('genericName', v)} />
          <Input label="Category" value={form.category} onChange={v => upd('category', v)} />
          <Input label="Manufacturer" value={form.manufacturer} onChange={v => upd('manufacturer', v)} />
          <Input label="Barcode" value={form.barcode} onChange={v => upd('barcode', v)} />
          <Input label="Shelf location" value={form.shelfLocation} onChange={v => upd('shelfLocation', v)} />
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => upd('unit', e.target.value)}>
              {['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'box', 'strip'].map(u =>
                <option key={u}>{u}</option>)}
            </select>
          </div>
          <Input label="Reorder level" type="number" value={form.reorderLevel} onChange={v => upd('reorderLevel', +v)} />
          <Input label="Tax rate %" type="number" value={form.taxRate} onChange={v => upd('taxRate', +v)} />
          <div className="col-span-2 flex gap-4 text-sm">
            <label><input type="checkbox" checked={form.prescriptionRequired}
              onChange={e => upd('prescriptionRequired', e.target.checked)} /> Prescription required</label>
            <label><input type="checkbox" checked={form.controlled}
              onChange={e => upd('controlled', e.target.checked)} /> Controlled</label>
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

function NewBatchModal({ medicineId, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    batchNumber: '', supplierId: '', branchId: 'br_main',
    expiryDate: '', manufactureDate: '', quantity: 0,
    costPrice: 0, sellingPrice: 0,
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get('/suppliers').then(setSuppliers);
    api.get('/branches').then(setBranches);
  }, []);
  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });
  const submit = async () => {
    try { await api.post(`/medicines/${medicineId}/batches`, form); onSaved(); }
    catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-4">Add batch</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Batch number" value={form.batchNumber} onChange={v => upd('batchNumber', v)} />
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={form.supplierId} onChange={e => upd('supplierId', e.target.value)}>
              <option value="">—</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Branch</label>
            <select className="input" value={form.branchId} onChange={e => upd('branchId', e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Input label="Quantity" type="number" value={form.quantity} onChange={v => upd('quantity', +v)} />
          <Input label="Manufacture date" type="date" value={form.manufactureDate} onChange={v => upd('manufactureDate', v)} />
          <Input label="Expiry date" type="date" value={form.expiryDate} onChange={v => upd('expiryDate', v)} />
          <Input label="Cost price" type="number" value={form.costPrice} onChange={v => upd('costPrice', +v)} />
          <Input label="Selling price" type="number" value={form.sellingPrice} onChange={v => upd('sellingPrice', +v)} />
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

function Input({ label, value, onChange, type = 'text' }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value}
        step={type === 'number' ? '0.01' : undefined}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}
