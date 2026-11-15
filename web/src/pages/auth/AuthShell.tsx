import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { ARCADE_GAMES } from '@shared/arcade';
import { Logo } from '../../components/Logo';
import { LanguageSwitcher } from '../../i18n';
import { GameArt } from '../../components/GameArt';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="min-h-screen bg-[#fbf7f0] lg:grid lg:grid-cols-[1fr_0.92fr]">
      <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Logo /><LanguageSwitcher /></div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft size={14} /> Ana sayfa
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px]">
            {eyebrow ? (
              <span className="badge-ok mb-4">
                <Sparkles size={11} /> {eyebrow}
              </span>
            ) : null}
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink-950">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-7 text-center text-[13px] text-ink-500">{footer}</div>
          </div>
        </div>

        <p className="text-center text-[10px] text-ink-400 lg:text-left">
          © {new Date().getFullYear()} Rook Works · Interactive Live Games
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-[#eee7dc] bg-[#fffaf4] lg:block">
        <div className="absolute -left-24 top-1/4 h-[380px] w-[380px] rounded-full bg-[#dff5ea] blur-[100px]" />
        <div className="absolute -bottom-24 right-0 h-[320px] w-[320px] rounded-full bg-[#ffe2ef] blur-[100px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e4dccf] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-ink-500">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Otuz oyunlu platform
            </span>
          </div>

          <div className="max-w-md">
            <div className="grid grid-cols-2 gap-3">
              <div className="overflow-hidden rounded-2xl border border-[#e9e1d5] bg-white p-1.5 shadow-card">
                <GameArt game={ARCADE_GAMES.dance} className="rounded-xl" />
                <p className="px-2 py-1.5 text-[11px] font-bold text-ink-800">Sahne 90</p>
              </div>
              <div className="mt-8 overflow-hidden rounded-2xl border border-[#e9e1d5] bg-white p-1.5 shadow-card">
                <GameArt game={ARCADE_GAMES.quiz} className="rounded-xl" />
                <p className="px-2 py-1.5 text-[11px] font-bold text-ink-800">Bilgi Arenası</p>
              </div>
            </div>
            <h2 className="mt-8 text-balance text-3xl font-bold leading-tight text-ink-950">
              Sohbetin hazır. Sahne senin.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Otuz oyun, tek hesap ve kalıcı yayın bağlantısı. Oyunu seç, OBS’e ekle, yayını
              başlat.
            </p>

            <div className="mt-7 space-y-2.5">
              {[
                { icon: Radio, title: 'Kalıcı OBS bağlantısı', text: 'Bir kez kur, hep aynı adres.' },
                { icon: ShieldCheck, title: 'Güvenli ödeme doğrulaması', text: 'İmzalı webhook olmadan panel açılmaz.' },
                { icon: Lock, title: 'Yayıncıya özel veri', text: 'Oyunların ve istatistiklerin izole.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-[#e9e1d5] bg-white/80 p-3.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eafaf3] text-brand-700">
                      <Icon size={17} />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-ink-900">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink-400">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#dcefe6] bg-[#f0fbf6] p-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-brand-700">
              <Check size={16} />
            </span>
            <p className="text-[11px] leading-relaxed text-[#2f5f52]">
              <span className="font-semibold text-[#073b31]">Test ödeme modu</span> geliştirme
              ortamında açıktır. Gerçek sağlayıcıya geçmek için tek bir environment değişkeni
              yeterli.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
