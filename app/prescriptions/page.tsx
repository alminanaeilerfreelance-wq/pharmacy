'use client';
import { useEffect, useState } from 'react';
import { api, fmt } from '@/lib/api';
import { CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';

export default function PrescriptionsPage() {
  const [filter, setFilter] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const load = () => {
    const q = filter ? `?status=${filter}` : '';
    api.get(`/prescriptions${q}`).then(setItems);
  };

  useEffect(load, [filter]);

  const open = async (id: string) => setSelected(await api.get(`/prescriptions/${id}`));

  const verify = async (id: string) => {
    await api.post(`/prescriptions/${id}/verify`, {});
    await open(id); load();
  };
  const reject = async (id: string) => {
    const reason = prompt('Reason for rejection?') || 'unspecified';
    await api.post(`/prescriptions/${id}/reject`, { reason });
    await open(id); load();
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    verified: 'bg-green-100 text-green-700',
    dispensed: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Prescriptions</h1>

      <div className="flex gap-2">
        {['', 'pending', 'verified', 'dispensed', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
            {f || 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Doctor</th>
              <th className="text-left p-3">Issued</th>
              <th className="text-left p-3">Items</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(p => (
              <tr key={p.id} className="table-row cursor-pointer" onClick={() => open(p.id)}>
                <td className="p-3 font-mono text-xs">{p.id}</td>
                <td className="p-3">{p.customer?.name}</td>
                <td className="p-3 text-slate-600">{p.doctorName}</td>
                <td className="p-3 text-slate-600">{fmt.date(p.issuedDate)}</td>
                <td className="p-3 text-slate-600">{p.items.length}</td>
                <td className="p-3">
                  <span className={`badge ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No prescriptions.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/30 flex justify-end z-40" onClick={() => setSelected(null)}>
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-brand-600" />
                <h2 className="text-xl font-bold">{selected.id}</h2>
                <span className={`badge ml-auto ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
              </div>
              <div className="text-sm text-slate-600">
                {selected.customer?.name} · {selected.doctorName} ({selected.doctorLicense})
              </div>
            </div>
            <div className="p-5 space-y-4">
              {selected.interactions?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                    <AlertTriangle size={16} /> Drug interaction warnings
                  </div>
                  <ul className="text-xs text-amber-700 mt-1 list-disc pl-5">
                    {selected.interactions.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-2">
                  {selected.items.map((it: any, i: number) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-3 text-sm">
                      <div className="font-medium">{it.medicine?.name}</div>
                      <div className="text-xs text-slate-500">
                        {it.dosage} · qty {it.quantity} · stock {it.stock} · {it.instructions}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selected.notes && (
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <strong>Notes:</strong> <span className="whitespace-pre-line">{selected.notes}</span>
                </div>
              )}

              {selected.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => verify(selected.id)} className="btn btn-primary flex-1 justify-center">
                    <CheckCircle size={16} /> Verify
                  </button>
                  <button onClick={() => reject(selected.id)} className="btn btn-danger flex-1 justify-center">
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
