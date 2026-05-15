'use client';
import { useEffect, useState } from 'react';
import { api, fmt } from '@/lib/api';
import { Plus, Truck, X, AlertTriangle } from 'lucide-react';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const load = () => {
    api.get('/purchases').then(setPurchases);
    api.get('/purchases/reorder-suggestions').then(setReorderSuggestions);
  };
  useEffect(() => {
    void load();
  }, []);

  const open = async (id: string) => setSelected(await api.get(`/purchases/${id}`));

  const receive = async (id: string) => {
    if (!confirm('Mark this PO as received and add stock?')) return;
    await api.post(`/purchases/${id}/receive`, {});
    setSelected(null); load();
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancel this PO?')) return;
    await api.put(`/purchases/${id}/cancel`, {});
    setSelected(null); load();
  };

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    ordered: 'bg-blue-100 text-blue-700',
    received: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
        <button onClick={() => setShowNew(true)} className="btn btn-primary">
          <Plus size={16} /> New purchase order
        </button>
      </div>

      {reorderSuggestions.length > 0 && (
        <div className="card border-l-4 border-l-orange-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-orange-600" size={18} />
            <h2 className="font-semibold">Reorder suggestions ({reorderSuggestions.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reorderSuggestions.slice(0, 6).map((r: any) => (
              <div key={r.medicine.id} className="border border-slate-200 rounded-lg p-3 text-sm">
                <div className="font-medium">{r.medicine.name}</div>
                <div className="text-xs text-slate-500">
                  Stock: <span className="text-orange-600 font-medium">{r.stock}</span> ·
                  Reorder: {r.medicine.reorderLevel} ·
                  Suggest: {r.needed}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">PO #</th>
              <th className="text-left p-3">Supplier</th>
              <th className="text-left p-3">Items</th>
              <th className="text-right p-3">Total</th>
              <th className="text-left p-3">Ordered</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No purchase orders yet.</td></tr>
            )}
            {purchases.map(p => (
              <tr key={p.id} className="table-row cursor-pointer" onClick={() => open(p.id)}>
                <td className="p-3 font-mono text-xs">{p.poNumber}</td>
                <td className="p-3">{p.supplier?.name}</td>
                <td className="p-3 text-slate-600">{p.items.length}</td>
                <td className="p-3 text-right font-medium">{fmt.money(p.total)}</td>
                <td className="p-3 text-slate-600">{fmt.date(p.orderedAt)}</td>
                <td className="p-3"><span className={`badge ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <PODetail po={selected} onClose={() => setSelected(null)}
          onReceive={() => receive(selected.id)} onCancel={() => cancel(selected.id)} />
      )}

      {showNew && <NewPOModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function PODetail({ po, onClose, onReceive, onCancel }: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-40" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck className="text-brand-600" />
              <h2 className="text-xl font-bold">{po.poNumber}</h2>
            </div>
            <p className="text-sm text-slate-500">{po.supplier?.name} · {fmt.date(po.orderedAt)}</p>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Items</h3>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-2">Medicine</th>
                  <th className="text-left p-2">Batch</th>
                  <th className="text-left p-2">Expiry</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-right p-2">Cost</th>
                  <th className="text-right p-2">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {po.itemsResolved.map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="p-2">{it.medicine?.name}</td>
                    <td className="p-2 text-slate-600">{it.batchNumber}</td>
                    <td className="p-2 text-slate-600">{fmt.date(it.expiryDate)}</td>
                    <td className="p-2 text-right">{it.quantity}</td>
                    <td className="p-2 text-right">{fmt.money(it.costPrice)}</td>
                    <td className="p-2 text-right font-medium">{fmt.money(it.costPrice * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold">
                  <td colSpan={5} className="p-2 text-right">Total</td>
                  <td className="p-2 text-right">{fmt.money(po.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {po.status === 'ordered' && (
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button onClick={onReceive} className="btn btn-primary flex-1 justify-center">
                Receive (GRN) — adds stock
              </button>
              <button onClick={onCancel} className="btn btn-danger">Cancel PO</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewPOModal({ onClose, onSaved }: any) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('br_main');
  const [items, setItems] = useState<any[]>([
    { medicineId: '', batchNumber: '', expiryDate: '', manufactureDate: '', quantity: 0, costPrice: 0, sellingPrice: 0 },
  ]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/suppliers').then(setSuppliers);
    api.get('/medicines').then(setMedicines);
    api.get('/branches').then(setBranches);
  }, []);

  const updateItem = (i: number, k: string, v: any) =>
    setItems(items.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const addLine = () => setItems([...items,
    { medicineId: '', batchNumber: '', expiryDate: '', manufactureDate: '', quantity: 0, costPrice: 0, sellingPrice: 0 }]);
  const removeLine = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const total = items.reduce((s, i) => s + (i.costPrice || 0) * (i.quantity || 0), 0);

  const submit = async () => {
    setErr('');
    try {
      await api.post('/purchases', { supplierId, branchId, items });
      onSaved();
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-4">New purchase order</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">— choose —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Receiving branch</label>
            <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="text-left p-2">Medicine</th>
                <th className="text-left p-2">Batch #</th>
                <th className="text-left p-2">Mfg</th>
                <th className="text-left p-2">Exp</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">Cost</th>
                <th className="text-right p-2">Sell</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="p-1">
                    <select className="input py-1 text-xs" value={it.medicineId}
                      onChange={e => updateItem(i, 'medicineId', e.target.value)}>
                      <option value="">—</option>
                      {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </td>
                  <td className="p-1"><input className="input py-1 text-xs" value={it.batchNumber}
                    onChange={e => updateItem(i, 'batchNumber', e.target.value)} /></td>
                  <td className="p-1"><input className="input py-1 text-xs" type="date" value={it.manufactureDate}
                    onChange={e => updateItem(i, 'manufactureDate', e.target.value)} /></td>
                  <td className="p-1"><input className="input py-1 text-xs" type="date" value={it.expiryDate}
                    onChange={e => updateItem(i, 'expiryDate', e.target.value)} /></td>
                  <td className="p-1"><input className="input py-1 text-xs text-right" type="number" value={it.quantity}
                    onChange={e => updateItem(i, 'quantity', +e.target.value)} /></td>
                  <td className="p-1"><input className="input py-1 text-xs text-right" type="number" step="0.01" value={it.costPrice}
                    onChange={e => updateItem(i, 'costPrice', +e.target.value)} /></td>
                  <td className="p-1"><input className="input py-1 text-xs text-right" type="number" step="0.01" value={it.sellingPrice}
                    onChange={e => updateItem(i, 'sellingPrice', +e.target.value)} /></td>
                  <td className="p-1">
                    {items.length > 1 && (
                      <button onClick={() => removeLine(i)} className="text-red-500 text-xs">×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button onClick={addLine} className="btn btn-secondary text-sm"><Plus size={14} /> Add line</button>
          <div className="font-semibold">Total: {fmt.money(total)}</div>
        </div>

        {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Create order</button>
        </div>
      </div>
    </div>
  );
}
