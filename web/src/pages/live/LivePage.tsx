import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  HelpCircle,
  Loader2,
  Radio,
  Send,
  Swords,
  Terminal,
  WifiOff,
  X,
} from 'lucide-react';
import type { LiveBootstrapDTO } from '@shared/types';
import { liveUi } from '@shared/languages';
import { api, ApiError } from '../../lib/api';
import { BattleStage } from '../../game/BattleStage';
import { useLiveSocket } from '../../game/useLiveSocket';
import type { StageConfig } from '../../game/Overlay';
import { Button } from '../../components/ui';
import { Logo } from '../../components/Logo';

export function LivePage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const testMode = params.get('test') === '1';
  const [bootstrap, setBootstrap] = useState<LiveBootstrapDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    api
      .get<LiveBootstrapDTO>(`/api/live/${slug}`)
      .then((data) => {
        if (!cancelled) setBootstrap(data);
      })
      .catch((caught) => {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 404) setNotFound(true);
        else setError(caught instanceof ApiError ? caught.message : 'Yayın yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const socket = useLiveSocket(slug, {
    enabled: Boolean(bootstrap) && !notFound,
    locale: bootstrap?.locale ?? 'tr',
  });

  const config = useMemo<StageConfig | null>(() => {
    if (!bootstrap) return null;
    return {
      gameName: bootstrap.gameName,
      locale: bootstrap.locale,
      teams: bootstrap.teams,
      settings: bootstrap.settings,
      commands: bootstrap.commands,
      slug: bootstrap.slug,
    };
  }, [bootstrap]);

  if (loading) {
    return (
      <div className="live-root flex min-h-[100dvh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={28} className="animate-spin text-brand-400" />
          <p className="text-sm text-white/40">Yayın hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (notFound || !bootstrap || !config) {
    return (
      <div className="live-root flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/40">
          <WifiOff size={24} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white/80">Yayın bulunamadı</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/40">
            Bu oyun bağlantısı devre dışı bırakılmış veya hiç oluşturulmamış olabilir.
          </p>
          {error ? <p className="mt-2 text-xs text-red-300/70">{error}</p> : null}
        </div>
        <Link to="/" className="text-xs font-medium text-brand-300 hover:text-brand-200">
          Meydan ana sayfa
        </Link>
      </div>
    );
  }

  return (
    <div className="live-root relative h-[100dvh] w-full overflow-hidden">
      <BattleStage
        view={socket.state}
        config={config}
        mode={testMode ? 'preview' : 'live'}
        myTeamSlot={socket.myTeamSlot}
        notice={socket.notice}
      />

      {!socket.connected ? (
        <div className="absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-amber-300/20 bg-ink-950/80 px-3 py-1.5 text-[10px] font-medium text-amber-200/80 backdrop-blur">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          {liveUi(bootstrap.locale).connecting}
        </div>
      ) : null}

      {testMode ? (
        <TestChatPanel
          slug={bootstrap.slug ?? slug ?? ''}
          commands={bootstrap.commands}
          locale={bootstrap.locale}
          sendCommand={socket.sendCommand}
          connected={socket.connected}
          notice={socket.notice}
          onClose={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('test');
            window.location.assign(url.toString());
          }}
        />
      ) : null}
    </div>
  );
}

function TestChatPanel({
  commands,
  locale,
  sendCommand,
  connected,
  notice,
  onClose,
}: {
  slug: string;
  commands: LiveBootstrapDTO['commands'];
  locale: LiveBootstrapDTO['locale'];
  sendCommand: (text: string) => boolean;
  connected: boolean;
  notice: { code: string; message?: string } | null;
  onClose: () => void;
}) {
  const ui = liveUi(locale);
  const [value, setValue] = useState('');
  const joinCommand = commands.system.find((row) => row.action === 'JOIN_TEAM')?.command ?? 'gir';
  const [log, setLog] = useState<Array<{ id: number; text: string }>>([]);

  useEffect(() => {
    if (!notice?.message) return;
    setLog((current) => [...current.slice(-4), { id: Date.now(), text: notice.message! }]);
  }, [notice]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    sendCommand(value);
    setValue('');
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 sm:pb-5">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-ink-950/90 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
            <Terminal size={13} /> Test sohbeti
            <span className={`ml-1 inline-flex items-center gap-1 ${connected ? 'text-brand-300' : 'text-white/30'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-brand-400' : 'bg-white/30'}`} />
              {connected ? 'bağlı' : 'bağlanıyor'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
            aria-label="Test panelini kapat"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {commands.teams.map((team) => (
            <button
              key={team.slot}
              type="button"
              onClick={() => sendCommand(`${commands.prefix}${joinCommand} ${team.command}`)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: team.color }}
              />
              {commands.prefix}
              {joinCommand} {team.command}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-2 flex gap-2">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={`${ui.commandPlaceholder} (!${joinCommand} ${commands.teams[0]?.command ?? ''})`}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-brand-400/60"
            maxLength={200}
          />
          <Button type="submit" variant="brand" size="sm" icon={<Send size={13} />} disabled={!connected}>
            {ui.send}
          </Button>
        </form>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => sendCommand(`${commands.prefix}${commands.system.find((row) => row.action === 'HELP')?.command ?? 'yardim'}`)}
            className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/40 hover:text-white"
          >
            <HelpCircle size={10} /> {ui.helpHint}
          </button>
          <button
            type="button"
            onClick={() => sendCommand(`${commands.prefix}${commands.system.find((row) => row.action === 'SHOW_SCORE')?.command ?? 'skor'}`)}
            className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/40 hover:text-white"
          >
            <Swords size={10} /> {ui.scoreHint}
          </button>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-white/25">
            <Radio size={10} /> Bu panel yalnızca ?test=1 ile görünür
          </span>
        </div>

        {log.length > 0 ? (
          <div className="mt-2 max-h-20 space-y-1 overflow-y-auto border-t border-white/10 pt-2">
            {log.map((entry) => (
              <p key={entry.id} className="truncate text-[10px] text-white/45">
                <span className="mr-1 text-brand-400">→</span>
                {entry.text}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
