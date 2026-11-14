import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  Gift,
  Heart,
  Info,
  Link2,
  MessageSquare,
  MonitorPlay,
  Play,
  Power,
  Radio,
  RefreshCw,
  Send,
  Square,
  Terminal,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { LiveSummaryDTO, WsNoticeCode } from '@shared/types';
import { liveUi } from '@shared/languages';
import { useStudio } from '../../lib/studio';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { formatTimer } from '../../lib/format';
import { useLiveSocket } from '../../game/useLiveSocket';
import {
  Button,
  CopyButton,
  Modal,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../../components/ui';

type SupportType = 'gift' | 'like' | 'comment';

export function LivePanelPage() {
  const { game, commands, refresh } = useStudio();
  const { success, error: toastError, toast } = useToast();
  const [live, setLive] = useState<LiveSummaryDTO | null>(null);
  const [polling, setPolling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [supportTeam, setSupportTeam] = useState(1);
  const [supportName, setSupportName] = useState('Test İzleyici');
  const [supportLoading, setSupportLoading] = useState<SupportType | null>(null);
  const [command, setCommand] = useState('');
  const [notices, setNotices] = useState<Array<{ id: number; code: string; message: string }>>([]);
  const noticeRef = useRef(0);

  const url = game ? `${window.location.origin}/live/${game.publicSlug}` : '';
  const locale = game?.language ?? 'tr';

  const socket = useLiveSocket(game?.publicSlug, {
    enabled: Boolean(game?.liveEnabled),
    locale,
    viewerName: 'Test Yayıncı',
  });

  useEffect(() => {
    if (supportTeam > (game?.teams.length ?? 1)) setSupportTeam(1);
  }, [game, supportTeam]);

  useEffect(() => {
    if (!socket.notice) return;
    noticeRef.current += 1;
    setNotices((current) => [
      ...current.slice(-5),
      {
        id: noticeRef.current,
        code: socket.notice?.code ?? 'INFO',
        message: socket.notice?.message ?? '',
      },
    ]);
  }, [socket.notice]);

  const loadLive = useCallback(async () => {
    try {
      const result = await api.get<{ live: LiveSummaryDTO | null }>('/api/game/live-state');
      setLive(result.live);
    } catch {
      /* canlı durum alınamadı; sessiz geç */
    }
  }, []);

  useEffect(() => {
    void loadLive();
    const timer = window.setInterval(() => void loadLive(), 3000);
    return () => window.clearInterval(timer);
  }, [loadLive]);

  const startRound = async () => {
    setStarting(true);
    try {
      await api.post('/api/game/session/start', {});
      await loadLive();
      await refresh();
      success('Tur başlatıldı', 'OBS ekranına yansıtılıyor.');
    } catch (caught) {
      toastError(
        'Tur başlatılamadı',
        caught instanceof ApiError ? caught.message : 'Tekrar dene.',
      );
    } finally {
      setStarting(false);
    }
  };

  const stopRound = async () => {
    setStopping(true);
    try {
      await api.post('/api/game/session/stop', {});
      await loadLive();
      await refresh();
      success('Tur durduruldu', 'Kazanan mevcut skorlara göre belirlendi.');
    } catch (caught) {
      toastError(
        'Tur durdurulamadı',
        caught instanceof ApiError ? caught.message : 'Tekrar dene.',
      );
    } finally {
      setStopping(false);
    }
  };

  const toggleLive = async () => {
    setToggling(true);
    try {
      const nextEnabled = !game?.liveEnabled;
      await api.post('/api/game/live', { enabled: nextEnabled });
      await refresh();
      await loadLive();
      setToggleOpen(false);
      success(
        nextEnabled ? 'Yayın bağlantısı açıldı' : 'Yayın bağlantısı kapatıldı',
        nextEnabled
          ? 'İzleyiciler artık komut gönderebilir. Mevcut URL değişmedi.'
          : 'Bağlantı devre dışı. OBS kaynağı boş görünecek.',
      );
    } catch (caught) {
      toastError(
        'Bağlantı değiştirilemedi',
        caught instanceof ApiError ? caught.message : 'Tekrar dene.',
      );
    } finally {
      setToggling(false);
    }
  };

  const sendSupport = async (type: SupportType) => {
    if (!game) return;
    if (live?.phase !== 'running') {
      toastError('Tur başlamadı', 'Destek göndermek için önce bir tur başlat.');
      return;
    }
    setSupportLoading(type);
    try {
      const result = await api.post<{ applied?: boolean; reason?: string }>('/api/game/test-event', {
        type,
        teamSlot: supportTeam,
        playerName: supportName.trim() || 'Test İzleyici',
        amount: 1,
      });
      const payload = result as { applied?: boolean; reason?: string };
      if (payload.applied) {
        const labels: Record<SupportType, string> = {
          gift: 'Hediye saldırısı gönderildi',
          like: 'Savunma kalkanı verildi',
          comment: 'Asker desteği gönderildi',
        };
        success(labels[type], 'Olay imzalı canlı yayın webhook’u üzerinden işlendi.');
      } else {
        toast(`Olay işlenmedi: ${payload.reason ?? 'bilinmeyen'}`, { kind: 'info' });
      }
    } catch (caught) {
      toastError(
        'Destek gönderilemedi',
        caught instanceof ApiError ? caught.message : 'Tekrar dene.',
      );
    } finally {
      setSupportLoading(null);
    }
  };

  const submitCommand = (event: FormEvent) => {
    event.preventDefault();
    if (!command.trim()) return;
    const sent = socket.sendCommand(command.trim());
    if (!sent) toastError('Bağlantı yok', 'Test sohbeti yayına bağlanamadı.');
    setCommand('');
  };

  const quickJoin = (teamCommand: string) => {
    const joinPhrase =
      commands?.sheet.system.find((row) => row.action === 'JOIN_TEAM')?.command ?? 'gir';
    socket.sendCommand(`!${joinPhrase} ${teamCommand}`);
  };

  const ui = liveUi(locale);
  const running = live?.phase === 'running';
  const phaseLabel =
    live?.phase === 'running' ? 'Canlı' : live?.phase === 'finished' ? 'Tur bitti' : 'Lobi';

  if (!game) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Yayın"
        title="Canlı yayın bağlantım"
        description="Kalıcı bağlantını OBS Browser Source olarak ekle. URL; takım, renk veya komut değişse bile sabit kalır."
        actions={
          <>
            <Link to="/panel/onizleme">
              <Button variant="secondary" icon={<MonitorPlay size={15} />}>
                Oyun önizlemesi
              </Button>
            </Link>
            <Button
              variant="secondary"
              icon={<RefreshCw size={15} />}
              loading={polling}
              onClick={() => {
                setPolling(true);
                setFrameKey((value) => value + 1);
                void loadLive().finally(() => setPolling(false));
              }}
            >
              Durumu yenile
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card card-pad">
          <p className="text-[11px] text-ink-400">Yayın durumu</p>
          <div className="mt-1.5">
            {game.liveEnabled ? (
              <StatusBadge status={running ? 'bad' : 'ok'}>
                {running ? 'Canlı yayında' : 'Bağlantı açık'}
              </StatusBadge>
            ) : (
              <StatusBadge status="neutral">Devre dışı</StatusBadge>
            )}
          </div>
        </div>
        <div className="card card-pad">
          <p className="text-[11px] text-ink-400">Tur</p>
          <p className="mt-1 text-lg font-semibold text-ink-900">
            {live?.roundIndex ? `#${live.roundIndex}` : '—'}{' '}
            <span className="text-xs font-normal text-ink-400">{phaseLabel}</span>
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-[11px] text-ink-400">Oyuncu / izleyici</p>
          <p className="mt-1 text-lg font-semibold text-ink-900">
            {live?.players ?? 0} <span className="text-xs font-normal text-ink-400">/</span>{' '}
            {live?.viewers ?? 0}
          </p>
        </div>
        <div className="card card-pad">
          <p className="text-[11px] text-ink-400">Kalan süre</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink-900">
            {running && live?.endsAt
              ? formatTimer(live.endsAt - Date.now())
              : live?.lobbyStartsAt
                ? `${Math.max(0, Math.ceil((live.lobbyStartsAt - Date.now()) / 1000))} sn`
                : '—'}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <div className="card overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                    <Link2 size={16} className="text-brand-600" /> Kalıcı yayın adresin
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">
                    Bu adres oyunun var olduğu sürece değişmez. Tahmin edilemez slug sayesinde
                    bağlantı rastgele bulunamaz.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={game.liveEnabled ? <Power size={13} /> : <Wifi size={13} />}
                    onClick={() => setToggleOpen(true)}
                  >
                    {game.liveEnabled ? 'Bağlantıyı kapat' : 'Bağlantıyı aç'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 sm:px-6">
              <div className="flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-ink-200 bg-ink-50 p-2 sm:flex-row sm:items-center">
                <span className="flex w-full min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${game.liveEnabled ? 'bg-brand-500' : 'bg-ink-300'}`} />
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-700">{url}</span>
                </span>
                <div className="flex shrink-0 gap-2">
                  <CopyButton value={url} label="Kopyala" size="sm" variant="primary" />
                  <a href={url} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm" icon={<ExternalLink size={13} />}>
                      Aç
                    </Button>
                  </a>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-100 p-4">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-800">
                    <Radio size={13} className="text-brand-600" /> OBS’e ekle
                  </p>
                  <ol className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-ink-500">
                    <li>1. Kaynaklar → + → Tarayıcı (Browser Source).</li>
                    <li>2. Genişlik <span className="font-mono text-ink-700">1080</span>, yükseklik{' '}
                      <span className="font-mono text-ink-700">1920</span>.</li>
                    <li>3. URL alanına yukarıdaki adresi yapıştır.</li>
                    <li>4. Sahneye ekle; gerekiyorsa kaynağı sığdır.</li>
                  </ol>
                </div>
                <div className="rounded-xl border border-ink-100 p-4">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-800">
                    <Eye size={13} className="text-brand-600" /> Yayın yönetimi
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
                    Turu manuel başlatabilir veya durdurabilirsin. İzleyici komutları geldiğinde
                    lobi otomatik olarak başlar.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant={running ? 'secondary' : 'brand'}
                      size="sm"
                      icon={running ? <RefreshCw size={13} /> : <Play size={13} />}
                      loading={starting}
                      disabled={!game.liveEnabled}
                      onClick={() => void startRound()}
                    >
                      {running ? 'Yeni tur' : 'Turu başlat'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Square size={13} />}
                      loading={stopping}
                      disabled={!running}
                      onClick={() => void stopRound()}
                    >
                      Durdur
                    </Button>
                  </div>
                </div>
              </div>

              {!game.liveEnabled ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  Yayın bağlantısı kapalı. OBS kaynağı “yayın bulunamadı” gösterir; panel dışından
                  komut kabul edilmez.
                </div>
              ) : null}
            </div>
          </div>

          <SectionCard
            title="Test stüdyosu"
            description="Gerçek yayın akışını panelden test et: komut gönder, hediye/beğeni/yorum desteği tetikle."
            icon={<Terminal size={17} />}
            action={
              <span className={`badge ${socket.connected ? 'badge-ok' : 'badge-neutral'}`}>
                {socket.connected ? 'Bağlı' : 'Bağlanıyor'}
              </span>
            }
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {game.teams.map((team) => (
                    <button
                      key={team.slot}
                      type="button"
                      onClick={() => quickJoin(team.joinCommand)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[10px] font-medium text-ink-600 transition hover:border-ink-300 hover:bg-ink-50"
                    >
                      <span>{team.symbol}</span>
                      !{commands?.sheet.system.find((row) => row.action === 'JOIN_TEAM')?.command ?? 'gir'}{' '}
                      {team.joinCommand.toLowerCase()}
                    </button>
                  ))}
                </div>
                <form onSubmit={submitCommand} className="flex gap-2">
                  <input
                    className="input flex-1 font-mono text-xs"
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    placeholder={`!gir ${game.teams[0]?.joinCommand ?? 'takim'}`}
                    maxLength={200}
                  />
                  <Button type="submit" variant="primary" size="md" icon={<Send size={14} />}>
                    Gönder
                  </Button>
                </form>
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-xl bg-ink-50 p-2.5">
                  {notices.length === 0 ? (
                    <p className="text-[10px] text-ink-400">Henüz komut yanıtı yok.</p>
                  ) : (
                    notices.map((notice) => (
                      <p key={notice.id} className="text-[10px] leading-relaxed text-ink-500">
                        <span className="mr-1 font-semibold text-brand-600">{notice.code}</span>
                        {notice.message}
                      </p>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3.5">
                <p className="text-[11px] font-semibold text-ink-800">Canlı yayın destekleri</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-ink-500">
                    Takım
                    <select
                      className="select mt-1 !py-1.5 text-xs"
                      value={supportTeam}
                      onChange={(event) => setSupportTeam(Number(event.target.value))}
                    >
                      {game.teams.map((team) => (
                        <option key={team.slot} value={team.slot}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] text-ink-500">
                    Gönderen adı
                    <input
                      className="input mt-1 !py-1.5 text-xs"
                      value={supportName}
                      maxLength={32}
                      onChange={(event) => setSupportName(event.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-col !px-1 !py-2 text-[9px]"
                    loading={supportLoading === 'gift'}
                    disabled={Boolean(supportLoading)}
                    onClick={() => void sendSupport('gift')}
                  >
                    <Gift size={14} /> Hediye
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-col !px-1 !py-2 text-[9px]"
                    loading={supportLoading === 'like'}
                    disabled={Boolean(supportLoading)}
                    onClick={() => void sendSupport('like')}
                  >
                    <Heart size={14} /> Beğeni
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-col !px-1 !py-2 text-[9px]"
                    loading={supportLoading === 'comment'}
                    disabled={Boolean(supportLoading)}
                    onClick={() => void sendSupport('comment')}
                  >
                    <MessageSquare size={14} /> Yorum
                  </Button>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
                  Destekler imzalı webhook üzerinden gönderilir ve event ID ile tekilleştirilir.
                  Yalnızca tur sırasında uygulanır.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Telefon önizleme */}
        <aside className="min-w-0">
          <div className="sticky top-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-700">
                <MonitorPlay size={14} /> OBS görüntüsü
              </p>
              <span className="text-[10px] text-ink-400">1080 × 1920</span>
            </div>
            <div className="overflow-hidden rounded-[28px] border-[6px] border-ink-900 bg-ink-950 shadow-float">
              <div className="relative aspect-[9/16] w-full overflow-hidden">
                {game.liveEnabled ? (
                  <iframe
                    key={frameKey}
                    title="Canlı yayın önizlemesi"
                    src={`/live/${game.publicSlug}?embed=1`}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="autoplay"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <WifiOff size={26} className="text-white/25" />
                    <p className="text-xs text-white/40">Yayın bağlantısı kapalı</p>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-ink-400">
              Bu görüntü OBS Browser Source ile aynıdır. Yönetim paneli öğeleri yayın ekranında
              görünmez.
            </p>
            {!running && game.liveEnabled ? (
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-ink-400">
                <Info size={10} /> Lobi ekranı izleyici bekliyor.
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      <Modal
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        title={game.liveEnabled ? 'Yayın bağlantısını kapat' : 'Yayın bağlantısını aç'}
        description={
          game.liveEnabled
            ? 'Bağlantı kapatıldığında OBS kaynağı ve izleyici komutları devre dışı kalır. URL değişmez; dilediğinde yeniden açabilirsin.'
            : 'Bağlantı açıldığında mevcut kalıcı URL üzerinden yeniden yayın yapabilirsin.'
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToggleOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant={game.liveEnabled ? 'danger' : 'brand'}
              loading={toggling}
              onClick={() => void toggleLive()}
            >
              {game.liveEnabled ? 'Bağlantıyı kapat' : 'Bağlantıyı aç'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-2.5 rounded-xl bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
          Bu işlem yalnızca yayın erişimini etkiler; takımlar, komutlar ve geçmiş veriler korunur.
          Yayın URL’si asla değişmez.
        </div>
      </Modal>
    </div>
  );
}
