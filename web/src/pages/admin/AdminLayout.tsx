import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CreditCard,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { Avatar, Button } from '../../components/ui';
import { Logo } from '../../components/Logo';
import { LanguageSwitcher } from '../../i18n';

const ADMIN_NAV = [
  { to: '/admin', label: 'Genel bakış', icon: LayoutDashboard, end: true },
  { to: '/admin/oyunlar', label: 'Oyun kataloğu', icon: Gamepad2 },
  { to: '/admin/paketler', label: 'Paketler ve fiyatlar', icon: CreditCard },
  { to: '/admin/odemeler', label: 'Ödemeler', icon: ReceiptText },
  { to: '/admin/yayincilar', label: 'Yayıncılar', icon: Users },
  { to: '/admin/shopier', label: 'Shopier hazırlığı', icon: ShoppingBag },
];

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { me, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-full flex-col border-r border-[#e9e1d5] bg-[#fffaf4] text-ink-900">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2"><Logo /><LanguageSwitcher compact /></div>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-700">
          <ShieldCheck size={10} /> Süper admin
        </span>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-ink-500 hover:bg-[#f5efe6] hover:text-ink-900'
                }`
              }
            >
              <Icon size={17} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-[#eee7dc] p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
          <Avatar name={me?.user.displayName ?? 'Admin'} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold">{me?.user.displayName}</p>
            <p className="truncate text-[10px] text-ink-400">{me?.user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-lg p-2 text-ink-400 hover:bg-[#f0e9de] hover:text-ink-900"
            aria-label="Çıkış yap"
          >
            <LogOut size={15} />
          </button>
        </div>
        <Link
          to="/panel"
          onClick={onNavigate}
          className="mt-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink-400 hover:text-ink-900"
        >
          Yayıncı paneline git
          <ArrowUpRight size={12} />
        </Link>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink-400 hover:text-ink-900"
        >
          Siteye dön
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { me } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  if (!me) return <Navigate to="/giris" replace />;
  if (me.user.role !== 'admin') return <Navigate to="/panel" replace />;

  return (
    <div className="min-h-screen bg-[#fbf7f0]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] lg:block">
        <AdminSidebar />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3 lg:hidden">
        <Logo compact />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Admin</span>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-ink-200 p-2 text-ink-700"
            aria-label="Admin menüsünü aç"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-ink-950/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] overflow-y-auto">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-ink-500 hover:bg-[#f0e9de]"
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="lg:pl-[264px]">
        <div className="mx-auto min-h-screen w-full max-w-[1320px] px-4 py-6 sm:px-8 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
