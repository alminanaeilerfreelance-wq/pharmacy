'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pill, LogIn } from 'lucide-react';
import { login } from '@/lib/api';

const DEMO = [
  { u: 'admin', label: 'Admin' },
  { u: 'pharmacist', label: 'Pharmacist' },
  { u: 'cashier', label: 'Cashier' },
  { u: 'inventory', label: 'Inventory' },
  { u: 'manager', label: 'Manager' },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      await login(username, password);
      router.push('/');
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-600 text-white items-center justify-center mb-3">
            <Pill size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">PharmaPOS</h1>
          <p className="text-slate-500 text-sm">Pharmacy management system</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button disabled={loading} className="btn btn-primary w-full justify-center">
            <LogIn size={16} /> {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Demo accounts (password: <code>password123</code>)</p>
            <div className="flex flex-wrap gap-1">
              {DEMO.map(d => (
                <button key={d.u} type="button" onClick={() => setUsername(d.u)}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
