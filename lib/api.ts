'use client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.sessionStorage.getItem('token')),
  set: (t: string) => window.sessionStorage.setItem('token', t),
  clear: () => window.sessionStorage.removeItem('token'),
  user: () => {
    if (typeof window === 'undefined') return null;
    const u = window.sessionStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  setUser: (u: any) => window.sessionStorage.setItem('user', JSON.stringify(u)),
};

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      msg = data.message || msg;
    } catch {}
    if (res.status === 401) {
      tokenStore.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null as any;
  return res.json();
}

export const api = {
  get:  <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body: any) => request<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  put:  <T = any>(p: string, body: any) => request<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  del:  <T = any>(p: string) => request<T>(p, { method: 'DELETE' }),
};

export async function login(username: string, password: string) {
  const data = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(r => {
    if (!r.ok) throw new Error('Invalid credentials');
    return r.json();
  });
  tokenStore.set(data.token);
  tokenStore.setUser(data.user);
  return data.user;
}

export function logout() {
  tokenStore.clear();
  window.sessionStorage.removeItem('user');
  window.location.href = '/login';
}

export const fmt = {
  money: (n: number) => 'SAR ' + (n ?? 0).toFixed(2),
  date: (s?: string) => (s ? new Date(s).toLocaleDateString() : '—'),
  datetime: (s?: string) => (s ? new Date(s).toLocaleString() : '—'),
};
