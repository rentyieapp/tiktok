import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, Menu, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Button } from './ui';
import { Logo } from './Logo';
import { LanguageSwitcher } from '../i18n';

const NAV = [
  { to: '/oyunlar', label: 'Oyunlar' },
  { to: '/#kategoriler', label: 'Kategoriler' },
  { to: '/satin-al', label: 'Mağaza' },
  { to: '/kurulum', label: 'Kurulum' },
  { to: '/liderlik', label: 'Liderlik' },
  { to: '/uyarilar', label: 'Uyarılar' },
];

export function MarketingHeader() {
  const { me } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-[#e9e3d9] bg-[#fffaf4]/90 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-ink-500 lg:flex">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="transition hover:text-ink-950">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden min-[380px]:block"><LanguageSwitcher /></div>
          {me ? (
            <Link to={me.user.role === 'admin' ? '/admin' : '/panel'}>
              <Button variant="brand" size="sm" className="px-4">
                {me.user.role === 'admin' ? (
                  <>
                    <ShieldCheck size={14} /> Admin
                  </>
                ) : (
                  <>
                    <LayoutDashboard size={14} /> Panele git
                  </>
                )}
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/giris" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-ink-600 hover:bg-[#f3ede4] hover:text-ink-950">
                  Giriş yap
                </Button>
              </Link>
              <Link to="/kayit">
                <Button variant="brand" size="sm" className="px-4">
                  <span className="hidden sm:inline">Ücretsiz başla</span><span className="sm:hidden">Başla</span>
                </Button>
              </Link>
            </>
          )}
          <button
            type="button"
            className="rounded-lg border border-[#e6dfd4] p-2 text-ink-600 lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Menüyü aç"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-[#eee7dc] bg-[#fffaf4] px-5 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-[#f5efe6]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/giris"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-[#f5efe6]"
            >
              Giriş yap <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-2 flex justify-end"><LanguageSwitcher /></div>
        </div>
      ) : null}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#e9e3d9] bg-[#f7f1e8] py-10">
      <div className="container-page flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-[11px] leading-relaxed text-ink-400">
            Yayıncılar için tarayıcıda çalışan etkileşimli oyun platformu. İzleyiciler yorum,
            beğeni ve hediyelerle oyuna katılır; sen tek bir bağlantıyı OBS’e eklersin.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-7 gap-y-2 text-[11px] text-ink-500">
          <Link to="/oyunlar" className="hover:text-ink-900">
            Oyunlar
          </Link>
          <Link to="/satin-al" className="hover:text-ink-900">
            Mağaza
          </Link>
          <Link to="/kurulum" className="hover:text-ink-900">
            Kurulum
          </Link>
          <Link to="/liderlik" className="hover:text-ink-900">
            Liderlik
          </Link>
          <Link to="/uygulama" className="hover:text-ink-900">
            Uygulama
          </Link>
          <Link to="/uyarilar" className="hover:text-ink-900">
            Uyarılar
          </Link>
          <Link to="/giris" className="hover:text-ink-900">
            Yayıncı girişi
          </Link>
          <span className="text-ink-300">© {new Date().getFullYear()} Meydan</span>
        </div>
      </div>
      <div className="container-page mt-7 border-t border-[#e4dccf] pt-4 text-[10px] leading-relaxed text-ink-400">
        Bağımsız bir hizmetiz; TikTok, YouTube veya Twitch ile bağlantılı, onlar tarafından
        onaylanmış veya sponsorlu değiliz. Yayın kurallarına uyum yayıncının sorumluluğundadır.
      </div>
    </footer>
  );
}
