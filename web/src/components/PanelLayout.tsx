import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Gamepad2,
  History,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Radio,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  ShoppingBag,
  Play,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useStudio, StudioProvider } from '../lib/studio';
import { Avatar, Button, Spinner } from './ui';
import { Logo } from './Logo';
import { LanguageSwitcher } from '../i18n';
import { formatDate } from '../lib/format';

const NAV_SECTIONS = [
  {
    title: 'Portföy',
    items: [
      { to: '/panel', label: 'Genel bakış', icon: LayoutDashboard, end: true },
      { to: '/panel/arcade', label: 'Oyunlarım', icon: Gamepad2 },
      { to: '/satin-al', label: 'Oyun mağazası', icon: ShoppingBag },
    ],
  },
  {
    title: 'Taraftar Savaşı 3D',
    items: [
      { to: '/panel/3d', label: '3D oyun paneli', icon: Play, end: true },
      { to: '/panel/takimlar', label: 'Takım yönetimi', icon: Shield },
      { to: '/panel/ayarlar', label: 'Oyun ayarları', icon: SlidersHorizontal },
      { to: '/panel/komutlar', label: 'Dil ve komutlar', icon: Languages },
      { to: '/panel/yayin', label: '3D yayın bağlantım', icon: Radio },
      { to: '/panel/onizleme', label: 'Oyun önizlemesi', icon: MonitorPlay },
      { to: '/panel/istatistikler', label: 'İstatistikler', icon: BarChart3 },
      { to: '/panel/gecmis', label: 'Oyun geçmişi', icon: History },
      { to: '/panel/oyun', label: '3D oyun kurulumu', icon: Settings, end: true },
    ],
  },
  {
    title: 'Bağlantılar ve hesap',
    items: [
      { to: '/panel/baglantilar', label: 'Platform bağlantıları', icon: Radio },
      { to: '/panel/odeme', label: 'Paketim ve ödemeler', icon: CreditCard },
      { to: '/panel/hesap', label: 'Hesap ayarları', icon: Settings },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { me, logout } = useAuth();
  const { game, live } = useStudio();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const isStudioPath =
    location.pathname === '/panel/3d' ||
    location.pathname === '/panel/takimlar' ||
    location.pathname === '/panel/ayarlar' ||
    location.pathname === '/panel/komutlar' ||
    location.pathname === '/panel/yayin' ||
    location.pathname === '/panel/onizleme' ||
    location.pathname === '/panel/istatistikler' ||
    location.pathname === '/panel/gecmis' ||
    location.pathname === '/panel/oyun';
  // 3D stüdyo alt menüsü yalnızca 3D oyunun içindeyken görünür.
  const sections = isStudioPath
    ? NAV_SECTIONS
    : NAV_SECTIONS.filter((section) => section.title !== 'Taraftar Savaşı 3D');

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2"><Logo /><LanguageSwitcher compact /></div>
      </div>

      <div className="px-3">
        <Link
          to="/panel"
          onClick={onNavigate}
          className="block rounded-2xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-3.5 transition hover:border-ink-200 hover:shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Oyun portföyü
            </span>
            <span className="badge-ok text-[9px]">{me?.licenses.length ?? 0} arcade</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-ink-900">
            {game ? '17 arcade + 3D stüdyo' : 'Oyunlarını keşfet'}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            {game
              ? `${game.teamCount} takım · 3D stüdyo`
              : 'Oyun seç, lisans al ve yayına başla'}
          </p>
        </Link>
      </div>

      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="section-title px-3 pb-1.5">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      isActive ? 'nav-link nav-link-active' : 'nav-link'
                    }
                  >
                    <Icon size={17} strokeWidth={2} />
                    <span className="truncate">{item.label}</span>
                    {item.to === '/panel' && !game ? (
                      <Sparkles size={13} className="ml-auto text-brand-500" />
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
          <Avatar name={me?.user.displayName ?? 'Yayıncı'} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink-900">{me?.user.displayName}</p>
            <p className="truncate text-[11px] text-ink-400">
              {me?.subscription ? me.subscription.packageName : 'Paket yok'}
              {me?.subscription ? ` · ${formatDate(me.subscription.expiresAt)}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-800"
            title="Çıkış yap"
            aria-label="Çıkış yap"
          >
            <LogOut size={16} />
          </button>
        </div>
        {me?.user.role === 'admin' ? (
          <Link
            to="/admin"
            onClick={onNavigate}
            className="mt-1 flex items-center justify-between rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
          >
            Süper admin paneli
            <ArrowUpRight size={12} />
          </Link>
        ) : null}
        <Link
          to="/"
          onClick={onNavigate}
          className="mt-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink-400 hover:text-ink-700"
        >
          Siteye dön
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function NoAccessScreen() {
  const { me } = useAuth();
  return (
    <div className="mx-auto max-w-3xl py-4">
      <div className="card overflow-hidden">
        <div className="relative overflow-hidden bg-ink-950 px-6 py-10 text-white sm:px-10">
          <div className="absolute inset-0 bg-marketing-grid opacity-60" />
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">
              <Shield size={12} /> Panel kilitli
            </span>
            <h2 className="mt-4 max-w-md text-balance text-3xl font-bold leading-tight">
              Yayıncı panelini açmak için bir paket seç.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60">
              Ödeme sağlayıcı tarafından doğrulandıktan sonra hesabın aktifleşir; kendi takımlarını,
              komutlarını ve kalıcı yayın bağlantını hemen kullanmaya başlarsın.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/panel/odeme">
                <Button variant="brand" icon={<CreditCard size={16} />}>
                  Paket seç ve öde
                </Button>
              </Link>
              <Link to="/">
                <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white">
                  Paketleri incele
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          {[
            { title: 'Kendi takımların', text: '2, 4 veya 8 takım; renkler, armalar ve komutlar tamamen sana ait.' },
            { title: 'Kalıcı yayın linki', text: 'OBS’e ekle, bir kez kur; takımlar değişse de URL sabit kalır.' },
            { title: 'Çok dilli komutlar', text: 'Türkçe, İngilizce, İspanyolca, Almanca ve Fransızca destek.' },
          ].map((item) => (
            <div key={item.title}>
              <p className="text-[13px] font-semibold text-ink-900">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{item.text}</p>
            </div>
          ))}
        </div>
        {me?.subscription ? (
          <div className="border-t border-ink-100 bg-amber-50/50 px-6 py-3 text-xs text-amber-800">
            {me.subscription.packageName} paketin {formatDate(me.subscription.expiresAt)} tarihinde sona
            erdi. Devam etmek için paketini yenile.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StudioGate() {
  const { game, loading, error } = useStudio();
  const location = useLocation();
  const { me } = useAuth();
  const path = location.pathname;
  const isArcadePath =
    path === '/panel' ||
    path.startsWith('/panel/arcade') ||
    path.startsWith('/panel/oyun/') ||
    path === '/panel/baglantilar' ||
    path === '/panel/odeme' ||
    path === '/panel/hesap';

  if (loading) return <Spinner label="Stüdyon hazırlanıyor..." />;
  if (error?.status === 402 || (me && !me.hasPanelAccess && (me.licenses.length ?? 0) === 0)) {
    if (isArcadePath) return <Outlet />;
    return <NoAccessScreen />;
  }
  if (!game && !isArcadePath) {
    return <Navigate to="/panel" replace />;
  }
  return <Outlet />;
}

function PanelShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] border-r border-ink-100 bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobil üst bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo compact />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink-800">Yayıncı Stüdyosu</span>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-ink-200 p-2 text-ink-700"
            aria-label="Menüyü aç"
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
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] overflow-y-auto bg-white shadow-float">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-ink-500 hover:bg-ink-100"
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="lg:pl-[268px]">
        <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1320px] px-4 py-5 sm:px-7 sm:py-7 lg:px-10 lg:py-9">
          <StudioGate />
        </div>
      </main>
    </div>
  );
}

export function PanelLayout() {
  return (
    <StudioProvider>
      <PanelShell />
    </StudioProvider>
  );
}
