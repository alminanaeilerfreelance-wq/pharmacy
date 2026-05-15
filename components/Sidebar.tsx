'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ScanBarcode, Package, FileText,
  Truck, ShoppingCart, Users, BarChart3, Building2, LogOut, Pill,
} from 'lucide-react';
import { tokenStore, logout } from '@/lib/api';

const NAV = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/pos',           label: 'POS',           icon: ScanBarcode     },
  { href: '/inventory',     label: 'Inventory',     icon: Package         },
  { href: '/prescriptions', label: 'Prescriptions', icon: FileText        },
  { href: '/suppliers',     label: 'Suppliers',     icon: Truck           },
  { href: '/purchases',     label: 'Purchases',     icon: ShoppingCart    },
  { href: '/customers',     label: 'Customers',     icon: Users           },
  { href: '/reports',       label: 'Reports',       icon: BarChart3       },
  { href: '/branches',      label: 'Branches',      icon: Building2       },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = tokenStore.user();
    if (!u && pathname !== '/login') router.replace('/login');
    setUser(u);
  }, [pathname, router]);

  if (pathname === '/login') return null;

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
          <Pill size={20} />
        </div>
        <div>
          <div className="font-bold text-slate-800">PharmaPOS</div>
          <div className="text-xs text-slate-500">Inventory & POS</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
              }`}>
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200">
        {user && (
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium text-slate-800">{user.fullName}</div>
            <div className="text-xs text-slate-500 capitalize">{user.role}</div>
          </div>
        )}
        <button onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600">
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </aside>
  );
}
