'use client';
import { useEffect, useRef, useState } from 'react';
import { api, fmt } from '@/lib/api';
import { ScanBarcode, Plus, Minus, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CartLine {
  medicineId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  taxRate: number;
  prescriptionRequired: boolean;
  controlled: boolean;
  stock: number;
}

export default function POSPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [prescriptionId, setPrescriptionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'insurance' | 'mixed'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [insuranceCovered, setInsuranceCovered] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('br_main');
  const [override, setOverride] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/customers').then(setCustomers);
    api.get('/branches').then(setBranches);
    api.get('/prescriptions?status=verified').then(setPrescriptions);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      api.get(`/medicines?search=${encodeURIComponent(search)}`).then(setResults);
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const handleBarcodeEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    try {
      const m = await api.get(`/medicines/barcode/${encodeURIComponent(search.trim())}`);
      addToCart(m);
      setSearch(''); setResults([]);
    } catch {
      // not a barcode — fall back to first search result
      if (results[0]) addToCart(results[0]);
    }
  };

  const addToCart = (m: any) => {
    if (m.stock <= 0) { setError(`${m.name} is out of stock`); return; }
    setError('');
    const existing = cart.find(c => c.medicineId === m.id);
    if (existing) {
      if (existing.quantity + 1 > m.stock) { setError(`Only ${m.stock} available`); return; }
      setCart(cart.map(c => c.medicineId === m.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      // unitPrice from soonest-expiry batch
      const firstBatch = m.batches?.find?.((b: any) => b.quantity > 0) || null;
      setCart([...cart, {
        medicineId: m.id, name: m.name,
        unitPrice: firstBatch?.sellingPrice || 0,
        quantity: 1, discount: 0, taxRate: m.taxRate,
        prescriptionRequired: m.prescriptionRequired,
        controlled: m.controlled, stock: m.stock,
      }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.medicineId !== id) return c;
      const newQty = Math.max(1, Math.min(c.stock, c.quantity + delta));
      return { ...c, quantity: newQty };
    }));
  };

  const removeLine = (id: string) => setCart(cart.filter(c => c.medicineId !== id));
  const clearCart = () => { setCart([]); setReceipt(null); setError(''); };

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const totalDiscount = cart.reduce((s, c) => s + c.discount, 0);
  const totalTax = cart.reduce((s, c) =>
    s + ((c.unitPrice * c.quantity - c.discount) * c.taxRate) / 100, 0);
  const total = subtotal - totalDiscount + totalTax;
  const customerOwes = total - (parseFloat(insuranceCovered) || 0);

  const requiresRx = cart.some(c => c.prescriptionRequired);

  const checkout = async () => {
    setError('');
    try {
      const sale = await api.post('/sales', {
        branchId,
        customerId: customerId || undefined,
        prescriptionId: prescriptionId || undefined,
        items: cart.map(c => ({ medicineId: c.medicineId, quantity: c.quantity, discount: c.discount })),
        paymentMethod,
        amountPaid: parseFloat(amountPaid) || customerOwes,
        insuranceCovered: parseFloat(insuranceCovered) || 0,
        overridePrescription: override,
      });
      setReceipt(sale);
      setCart([]); setAmountPaid(''); setInsuranceCovered(''); setOverride(false); setPrescriptionId('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (receipt) {
    return (
      <div className="max-w-md mx-auto card mt-8">
        <div className="flex items-center gap-2 text-green-700 mb-4">
          <CheckCircle2 /> <h2 className="font-bold text-lg">Sale Completed</h2>
        </div>
        <div className="text-sm space-y-1 mb-4">
          <div><strong>Invoice:</strong> {receipt.invoiceNumber}</div>
          <div><strong>Subtotal:</strong> {fmt.money(receipt.subtotal)}</div>
          <div><strong>Discount:</strong> {fmt.money(receipt.totalDiscount)}</div>
          <div><strong>Tax:</strong> {fmt.money(receipt.totalTax)}</div>
          <div><strong>Total:</strong> {fmt.money(receipt.total)}</div>
          <div><strong>Insurance:</strong> {fmt.money(receipt.insuranceCovered)}</div>
          <div><strong>Paid:</strong> {fmt.money(receipt.amountPaid)}</div>
          <div><strong>Change:</strong> {fmt.money(receipt.change)}</div>
        </div>
        <button onClick={clearCart} className="btn btn-primary w-full justify-center">New sale</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left: search + cart */}
      <div className="lg:col-span-2 space-y-4">
        <div className="card">
          <div className="relative">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input ref={inputRef} className="input pl-10" placeholder="Scan barcode or search medicine…"
              value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleBarcodeEnter} />
          </div>
          {results.length > 0 && (
            <div className="mt-3 space-y-1 max-h-60 overflow-auto">
              {results.map(m => (
                <button key={m.id} onClick={() => { addToCart(m); setSearch(''); setResults([]); }}
                  className="w-full flex justify-between items-center p-2 rounded hover:bg-slate-50 text-left">
                  <div>
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className="text-xs text-slate-500">
                      {m.genericName} · {m.barcode} · {m.shelfLocation}
                      {m.prescriptionRequired && <span className="badge bg-amber-100 text-amber-700 ml-2">Rx</span>}
                      {m.controlled && <span className="badge bg-red-100 text-red-700 ml-1">Controlled</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmt.money(m.batches > 0 ? 0 : 0)}</div>
                    <div className="text-xs text-slate-500">Stock: {m.stock}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Cart ({cart.length})</h2>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-sm text-red-600 hover:underline">Clear</button>
            )}
          </div>
          {cart.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Cart is empty — scan or search a medicine.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {cart.map(c => (
                <div key={c.medicineId} className="py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {fmt.money(c.unitPrice)} · {c.taxRate}% tax
                      {c.prescriptionRequired && <span className="badge bg-amber-100 text-amber-700 ml-1">Rx</span>}
                      {c.controlled && <span className="badge bg-red-100 text-red-700 ml-1">Controlled</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(c.medicineId, -1)}
                      className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm">{c.quantity}</span>
                    <button onClick={() => updateQty(c.medicineId, 1)}
                      className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="w-20 text-right text-sm font-medium">
                    {fmt.money(c.unitPrice * c.quantity)}
                  </div>
                  <button onClick={() => removeLine(c.medicineId)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: checkout */}
      <div className="space-y-4">
        <div className="card">
          <h2 className="font-semibold mb-3">Checkout</h2>

          <label className="label">Branch</label>
          <select className="input mb-3" value={branchId} onChange={e => setBranchId(e.target.value)}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <label className="label">Customer</label>
          <select className="input mb-3" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">Walk-in</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
          </select>

          {requiresRx && (
            <>
              <label className="label">Prescription (verified)</label>
              <select className="input mb-3" value={prescriptionId} onChange={e => setPrescriptionId(e.target.value)}>
                <option value="">— none —</option>
                {prescriptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.customer?.name} · {p.doctorName}
                  </option>
                ))}
              </select>
              {!prescriptionId && (
                <label className="flex items-center gap-2 text-xs text-amber-700 mb-3">
                  <input type="checkbox" checked={override} onChange={e => setOverride(e.target.checked)} />
                  Pharmacist override (logged)
                </label>
              )}
            </>
          )}

          <label className="label">Payment method</label>
          <select className="input mb-3" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="insurance">Insurance only</option>
            <option value="mixed">Mixed (insurance + cash/card)</option>
          </select>

          {(paymentMethod === 'insurance' || paymentMethod === 'mixed') && (
            <>
              <label className="label">Insurance covered</label>
              <input className="input mb-3" type="number" step="0.01" value={insuranceCovered}
                onChange={e => setInsuranceCovered(e.target.value)} placeholder="0.00" />
            </>
          )}

          <label className="label">Amount paid</label>
          <input className="input mb-4" type="number" step="0.01" value={amountPaid}
            onChange={e => setAmountPaid(e.target.value)} placeholder={customerOwes.toFixed(2)} />

          <div className="border-t border-slate-100 pt-3 space-y-1 text-sm">
            <Row label="Subtotal" value={fmt.money(subtotal)} />
            <Row label="Discount" value={`- ${fmt.money(totalDiscount)}`} />
            <Row label="Tax" value={fmt.money(totalTax)} />
            <Row label="Total" value={fmt.money(total)} bold />
            {parseFloat(insuranceCovered) > 0 && (
              <Row label="Customer owes" value={fmt.money(customerOwes)} bold />
            )}
          </div>

          {error && (
            <div className="mt-3 p-2 rounded bg-red-50 text-red-700 text-sm flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <button disabled={cart.length === 0} onClick={checkout}
            className="btn btn-primary w-full justify-center mt-4 disabled:opacity-50">
            Complete sale
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
