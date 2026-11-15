import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Clock3,
  Copy,
  CreditCard,
  Gamepad2,
  ListChecks,
  Link2,
  LockKeyhole,
  Pencil,
  Play,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import type { ArcadeRoomDTO, PackageDTO } from '@shared/types';
import { ARCADE_GAME_LIST, QUIZ_QUESTIONS, type ArcadeGameDef, type QuizQuestion } from '@shared/arcade';
import { formatDate } from '../../lib/format';
import { formatPrice } from '@shared/defaults';
import { GameArt } from '../../components/GameArt';
import { BundlePlans } from '../../components/BundlePlans';
import { Button, Field, Modal, PageHeader, SectionCard, Spinner } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { startCheckout } from '../../lib/checkout';
import { useToast } from '../../lib/toast';
import { copyText } from '../../lib/clipboard';

interface LicenseRow {
  gameKey: string;
  expiresAt: string;
}

export function ArcadeRoomsPage() {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ArcadeRoomDTO[]>([]);
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [offers, setOffers] = useState<PackageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [trialStarting, setTrialStarting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editing, setEditing] = useState<ArcadeRoomDTO | null>(null);
  const [editName, setEditName] = useState('');
  const [editWelcome, setEditWelcome] = useState('');
  const [editAccent, setEditAccent] = useState('#0f8a72');
  const [editOverlayTheme, setEditOverlayTheme] = useState<'full' | 'minimal'>('full');
  const [editTts, setEditTts] = useState(false);
  const [hostEmail, setHostEmail] = useState('');
  const [hostBusy, setHostBusy] = useState(false);
  const [moderationRoom, setModerationRoom] = useState<ArcadeRoomDTO | null>(null);
  const [modPlayers, setModPlayers] = useState<Array<{ id: string; name: string; score: number; side?: string; avatar?: string }>>([]);
  const [modBans, setModBans] = useState<Array<{ viewerId: string; viewerName: string; reason: string | null; createdAt: string }>>([]);
  const [modBusy, setModBusy] = useState(false);
  const [quizRoom, setQuizRoom] = useState<ArcadeRoomDTO | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizCategory, setQuizCategory] = useState('Genel');
  const [quizText, setQuizText] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
  const [quizAnswer, setQuizAnswer] = useState<0 | 1 | 2 | 3>(0);

  const load = async () => {
    setLoading(true);
    try {
      const [roomResult, offerResult] = await Promise.all([
        api.get<{ rooms: ArcadeRoomDTO[]; licenses: LicenseRow[] }>('/api/arcade/rooms'),
        api.get<{ offers: PackageDTO[] }>('/api/arcade/offers'),
      ]);
      setRooms(roomResult.rooms);
      setLicenses(roomResult.licenses);
      setOffers(offerResult.offers);
    } catch (caught) {
      toastError('Oyun odaları yüklenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const licenseFor = (gameKey: string) => licenses.find((license) => license.gameKey === gameKey);

  const create = async (gameKey: string) => {
    setCreating(gameKey);
    try {
      const result = await api.post<{ room: ArcadeRoomDTO }>('/api/arcade/rooms', { gameKey });
      success('Oda oluşturuldu', `${result.room.name} yayına hazır.`);
      await load();
    } catch (caught) {
      toastError('Oda oluşturulamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setCreating(null);
    }
  };

  const startTrial = async (gameKey: string) => {
    setTrialStarting(gameKey);
    try {
      await api.post('/api/arcade/trial', { gameKey });
      success('30 dakikalık deneme açıldı', 'Oda oluşturup hemen deneyebilirsin.');
      await load();
    } catch (caught) {
      toastError('Deneme başlatılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setTrialStarting(null);
    }
  };

  const buy = async (offer: PackageDTO) => {
    setBuying(offer.id);
    try {
      await startCheckout(offer.id);
    } catch (caught) {
      toastError('Ödeme başlatılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
      setBuying(null);
    }
  };

  const copy = async (value: string) => {
    try {
      const ok = await copyText(value);
      if (ok) success('Kopyalandı', value);
      else toastError('Kopyalanamadı', 'Adresi manuel seçebilirsin.');
    } catch {
      toastError('Kopyalanamadı', 'Adresi manuel seçebilirsin.');
    }
  };

  const toggleRoom = async (room: ArcadeRoomDTO) => {
    setUpdating(room.id);
    try {
      const next = room.status === 'live' ? 'disabled' : 'live';
      await api.put(`/api/arcade/rooms/${room.id}`, { status: next });
      success(next === 'live' ? 'Oda yayına alındı' : 'Oda duraklatıldı', room.name);
      await load();
    } catch (caught) {
      toastError('Oda güncellenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setUpdating(null);
    }
  };

  const openEdit = (room: ArcadeRoomDTO) => {
    setEditing(room);
    setEditName(room.name);
    setEditWelcome(String(room.settings.welcomeText ?? ''));
    setEditAccent(String(room.settings.accent ?? '#0f8a72'));
    setEditOverlayTheme(room.settings.overlayTheme === 'minimal' ? 'minimal' : 'full');
    setEditTts(room.settings.ttsEnabled === true);
    setHostEmail('');
  };

  const openModeration = async (room: ArcadeRoomDTO) => {
    setModerationRoom(room);
    setModBusy(true);
    try {
      const [result, banResult] = await Promise.all([
        api.get<{ players: typeof modPlayers }>(`/api/arcade/rooms/${room.id}/live`),
        api.get<{ bans: typeof modBans }>(`/api/arcade/rooms/${room.id}/bans`),
      ]);
      setModPlayers(result.players);
      setModBans(banResult.bans);
    } catch (caught) {
      toastError('Oyuncular yüklenemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setModBusy(false);
    }
  };

  const kickPlayer = async (playerId: string, ban = false) => {
    if (!moderationRoom) return;
    if (ban && !window.confirm('Bu izleyiciyi odadan kalıcı olarak banlamak istiyor musun?')) return;
    setModBusy(true);
    try {
      const result = await api.post<{ players: typeof modPlayers; bans: typeof modBans }>(
        `/api/arcade/rooms/${moderationRoom.id}/kick`,
        { playerId, ban, reason: ban ? 'Yayıncı moderasyonu' : undefined },
      );
      setModPlayers(result.players);
      setModBans(result.bans);
      success(ban ? 'İzleyici kalıcı olarak banlandı' : 'Oyuncu odadan çıkarıldı');
    } catch (caught) {
      toastError('İşlem yapılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setModBusy(false);
    }
  };

  const unban = async (viewerId: string) => {
    if (!moderationRoom) return;
    setModBusy(true);
    try {
      const result = await api.delete<{ bans: typeof modBans }>(
        `/api/arcade/rooms/${moderationRoom.id}/bans/${encodeURIComponent(viewerId)}`,
      );
      setModBans(result.bans);
      success('Ban kaldırıldı');
    } catch (caught) {
      toastError('Ban kaldırılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setModBusy(false);
    }
  };

  const openQuiz = (room: ArcadeRoomDTO) => {
    setQuizRoom(room);
    const existing = Array.isArray(room.settings.quizQuestions)
      ? (room.settings.quizQuestions as QuizQuestion[])
      : [];
    setQuizQuestions(existing);
    setQuizCategory('Genel');
    setQuizText('');
    setQuizOptions(['', '', '', '']);
    setQuizAnswer(0);
  };

  const addQuizQuestion = () => {
    const options = quizOptions.map((option) => option.trim());
    if (
      quizCategory.trim().length < 2 ||
      quizText.trim().length < 5 ||
      options.some((option) => option.length < 1)
    ) {
      toastError('Soru eksik', 'Kategori, soru ve dört seçeneği doldur.');
      return;
    }
    setQuizQuestions((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        category: quizCategory.trim().slice(0, 40),
        question: quizText.trim().slice(0, 220),
        options: options as [string, string, string, string],
        answer: quizAnswer,
      },
    ]);
    setQuizText('');
    setQuizOptions(['', '', '', '']);
    setQuizAnswer(0);
  };

  const saveQuiz = async (questions: QuizQuestion[]) => {
    if (!quizRoom) return;
    setQuizBusy(true);
    try {
      await api.put(`/api/arcade/rooms/${quizRoom.id}/quiz`, { questions });
      success(
        questions.length > 0 ? 'Sorular kaydedildi' : 'Hazır soru havuzuna dönüldü',
        questions.length > 0 ? `${questions.length} özel soru yayında.` : 'Varsayılan sorular karıştırılarak kullanılacak.',
      );
      setQuizRoom(null);
      await load();
    } catch (caught) {
      toastError('Sorular kaydedilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setQuizBusy(false);
    }
  };

  const inviteHost = async () => {
    if (!editing || !hostEmail.trim()) return;
    setHostBusy(true);
    try {
      const result = await api.post<{ hosts: Array<{ id: string; name: string }> }>(
        `/api/arcade/rooms/${editing.id}/hosts`,
        { email: hostEmail.trim() },
      );
      setEditing({ ...editing, hosts: result.hosts });
      setHostEmail('');
      success('Ortak yayıncı eklendi');
      await load();
    } catch (caught) {
      toastError('Davet gönderilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setHostBusy(false);
    }
  };

  const removeHost = async (hostId: string) => {
    if (!editing) return;
    setHostBusy(true);
    try {
      const result = await api.delete<{ hosts: Array<{ id: string; name: string }> }>(
        `/api/arcade/rooms/${editing.id}/hosts/${hostId}`,
      );
      setEditing({ ...editing, hosts: result.hosts });
      success('Ortak yayıncı kaldırıldı');
      await load();
    } catch (caught) {
      toastError('Kaldırılamadı', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setHostBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setUpdating(editing.id);
    try {
      await api.put(`/api/arcade/rooms/${editing.id}`, {
        name: editName,
        settings: {
          ...editing.settings,
          welcomeText: editWelcome,
          accent: editAccent,
          overlayTheme: editOverlayTheme,
          ttsEnabled: editTts,
        },
      });
      success('Oda özelleştirildi');
      setEditing(null);
      await load();
    } catch (caught) {
      toastError('Kaydedilemedi', caught instanceof ApiError ? caught.message : 'Tekrar dene.');
    } finally {
      setUpdating(null);
    }
  };

  const offersFor = (game: ArcadeGameDef) =>
    offers
      .filter((offer) => offer.gameKey === game.key && offer.isActive !== false)
      .sort((a, b) => a.durationDays - b.durationDays);

  const stats = useMemo(
    () => ({
      owned: licenses.length,
      rooms: rooms.length,
    }),
    [licenses, rooms],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Mağaza ve yayın"
        title="Oyunlarım"
        description="Oyunları tek tek satın al, lisansın süresince kendi odanı özelleştir ve yayına al."
        actions={
          <Button variant="secondary" icon={<RefreshCw size={14} />} loading={loading} onClick={() => void load()}>
            Yenile
          </Button>
        }
      />

      {loading ? (
        <Spinner label="Oyun lisansları yükleniyor..." />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
            <span className="badge-ok">
              <ShieldCheck size={11} /> {stats.owned} aktif oyun lisansı
            </span>
            <span className="badge-neutral">
              <Gamepad2 size={11} /> {stats.rooms} yayın odası
            </span>
            <span className="badge-neutral">
              <Radio size={11} /> Twitch · YouTube · TikTok
            </span>
          </div>

          <div className="mb-5">
            <BundlePlans compact />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {ARCADE_GAME_LIST.map((game) => {
              const room = rooms.find((item) => item.gameKey === game.key);
              const license = licenseFor(game.key);
              const gameOffers = offersFor(game);
              return (
                <div key={game.key} className="overflow-hidden rounded-2xl border border-[#e9e1d5] bg-white shadow-card">
                  <div className="relative h-32">
                    <GameArt game={game} className="rounded-none" />
                    <div className="absolute left-3 top-3 flex gap-1.5">
                      <span className="rounded-full bg-white/85 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-ink-600 backdrop-blur">
                        {game.category}
                      </span>
                    </div>
                    <div className="absolute right-3 top-3">
                      {!license ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/80 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">
                          <LockKeyhole size={9} /> Satın al
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500 px-2 py-1 text-[9px] font-bold text-white">
                          Lisanslı
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[14px] font-bold text-ink-950">{game.name}</h3>
                        <p className="mt-0.5 text-[10px] text-ink-400">{game.tagline}</p>
                      </div>
                      {room ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className={room.status === 'live' ? 'badge-ok text-[9px]' : 'badge-neutral text-[9px]'}>
                            {room.status === 'live' ? 'Yayında' : 'Duraklatıldı'}
                          </span>
                          {room.hosts.length > 0 ? (
                            <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[8px] font-semibold text-violet-700">
                              {room.hosts.length + 1} yayıncı
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {!license ? (
                      <div className="mt-3 space-y-1.5">
                        {gameOffers.length === 0 ? (
                          <p className="text-[10px] text-ink-400">Satışa açık lisans yok.</p>
                        ) : (
                          gameOffers.map((offer) => (
                            <button
                              key={offer.id}
                              type="button"
                              disabled={buying === offer.id}
                              onClick={() => void buy(offer)}
                              className="flex w-full items-center justify-between rounded-lg border border-[#e4dccf] px-2.5 py-2 text-left text-[10px] font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50/40"
                            >
                              <span>{offer.durationDays === 1 ? '1 gün' : `${offer.durationDays} gün`}</span>
                              <span className="text-brand-700">{formatPrice(offer.priceCents, offer.currency)}</span>
                            </button>
                          ))
                        )}
                        <button
                          type="button"
                          disabled={trialStarting === game.key}
                          onClick={() => void startTrial(game.key)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          <Zap size={10} /> {trialStarting === game.key ? 'Açılıyor...' : 'Günde 30 dk ücretsiz dene'}
                        </button>
                      </div>
                    ) : room ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-[9px] text-ink-400">
                          Lisans: {formatDate(license!.expiresAt)}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px] text-ink-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={10} /> {room.roundsPlayed} tur
                          </span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <Users size={10} /> {room.lastWinnerName ?? 'Kazanan yok'}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <Link to={`/canli/${room.slug}`} target="_blank" className="flex-1">
                            <Button variant="brand" size="sm" icon={<Play size={11} />} className="w-full">
                              Aç
                            </Button>
                          </Link>
                          <button
                            type="button"
                            onClick={() => void copy(room.obsUrl)}
                            className="rounded-lg border border-[#e4dccf] px-2 text-ink-500 hover:border-[#cbbda9] hover:text-ink-900"
                            title="OBS bağlantısını kopyala"
                            aria-label="OBS bağlantısını kopyala"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(room)}
                            className="rounded-lg border border-[#e4dccf] px-2 text-ink-500 hover:border-[#cbbda9] hover:text-ink-900"
                            title="Odayı özelleştir"
                            aria-label="Odayı özelleştir"
                          >
                            <Pencil size={12} />
                          </button>
                          {room.gameKey === 'quiz' ? (
                            <button
                              type="button"
                              onClick={() => openQuiz(room)}
                              className="rounded-lg border border-[#e4dccf] px-2 text-ink-500 hover:border-[#cbbda9] hover:text-ink-900"
                              title="Soruları düzenle"
                              aria-label="Soruları düzenle"
                            >
                              <ListChecks size={12} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void openModeration(room)}
                            className="rounded-lg border border-[#e4dccf] px-2 text-ink-500 hover:border-[#cbbda9] hover:text-ink-900"
                            title="Oyuncu moderasyonu"
                            aria-label="Oyuncu moderasyonu"
                          >
                            <Shield size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleRoom(room)}
                            disabled={updating === room.id}
                            className={`rounded-lg border px-2 ${
                              room.status === 'live'
                                ? 'border-[#e4dccf] text-ink-500 hover:border-red-200 hover:text-red-600'
                                : 'border-emerald-200 text-emerald-700'
                            }`}
                            title={room.status === 'live' ? 'Odayı duraklat' : 'Odayı yayına al'}
                            aria-label={room.status === 'live' ? 'Odayı duraklat' : 'Odayı yayına al'}
                          >
                            <Power size={12} />
                          </button>
                        </div>
                        <Link
                          to={`/panel/baglantilar?room=${room.id}`}
                          className="flex items-center justify-center gap-1 rounded-lg bg-[#f7f2e9] py-1.5 text-[10px] font-medium text-ink-600 hover:text-ink-900"
                        >
                          <Link2 size={10} /> Platform bağlantıları
                        </Link>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3 w-full"
                        icon={<Plus size={12} />}
                        loading={creating === game.key}
                        onClick={() => void create(game.key)}
                      >
                        Oda oluştur
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <SectionCard title="Nasıl çalışır?" description="Oyun bazlı lisans ve yayın akışı." icon={<CreditCard size={15} />}>
              <ol className="space-y-2 text-[11px] leading-relaxed text-ink-500">
                {[
                  'Oyunun 1 günlük veya 30 günlük lisansını satın al.',
                  'Lisans aktif olunca oyun kartından oda oluştur.',
                  'Oda adını, karşılama metnini ve rengini özelleştir.',
                  'Platform bağlantılarını kur ve OBS bağlantısını yayına ekle.',
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#f7f2e9] text-[8px] font-bold text-brand-700">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </SectionCard>
            <SectionCard title="Yayın bağlantıları" description="OBS ve platformlar." icon={<Radio size={15} />}>
              <p className="text-[11px] leading-relaxed text-ink-500">
                Her oda için OBS bağlantısı ayrıdır. Twitch, YouTube ve TikTok olayları oyun
                içindeki izleyiciyi otomatik oluşturur.
              </p>
              <Link to="/panel/baglantilar" className="mt-3 inline-flex">
                <Button variant="secondary" size="sm" icon={<ArrowUpRight size={12} />}>
                  Bağlantıları yönet
                </Button>
              </Link>
            </SectionCard>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#e9e1d5] bg-white p-4 text-[10px] leading-relaxed text-ink-500">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-600" />
            Lisans bitince oda public erişime kapanır. Yeni lisans aldığında oda ve geçmiş
            ayarların korunur; kaldığın yerden yayına devam edebilirsin.
          </div>
        </>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Odayı özelleştir"
        description="Yayıncıya özel ad, karşılama metni ve vurgu rengi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Vazgeç
            </Button>
            <Button variant="brand" loading={Boolean(editing && updating === editing.id)} onClick={() => void saveEdit()}>
              Kaydet
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Oda adı">
            <input className="input" value={editName} maxLength={60} onChange={(event) => setEditName(event.target.value)} />
          </Field>
          <Field label="Karşılama metni" hint="Public oda sayfasında ve yayın panelinde görünür.">
            <textarea
              className="textarea"
              rows={3}
              maxLength={180}
              value={editWelcome}
              onChange={(event) => setEditWelcome(event.target.value)}
              placeholder="Örn. Bu gece sahne bizim. Yoruma adını yaz, pistte yerini al."
            />
          </Field>
          <Field label="Vurgu rengi">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={editAccent}
                onChange={(event) => setEditAccent(event.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-[#e4dccf] bg-white p-1"
              />
              <span className="text-[11px] text-ink-500">{editAccent}</span>
            </div>
          </Field>
          <Field label="Overlay paketi" hint="OBS ekranında son olay ve oda kartı gösterilir.">
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'full' as const, label: 'Tam overlay' },
                { key: 'minimal' as const, label: 'Sade sahne' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setEditOverlayTheme(item.key)}
                  className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${
                    editOverlayTheme === item.key
                      ? 'border-brand-300 bg-brand-50 text-brand-800'
                      : 'border-[#e4dccf] bg-white text-ink-500'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#e4dccf] bg-[#fffaf4] p-3">
            <input
              type="checkbox"
              checked={editTts}
              onChange={(event) => setEditTts(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span>
              <span className="block text-[11px] font-semibold text-ink-800">Türkçe sesli sunucu (TTS)</span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-ink-500">
                Hediye, katılım ve tur kazananlarını Türkçe seslendirir. OBS tarayıcısında ses
                kaynağının açık olması gerekir.
              </span>
            </span>
          </label>
          {editing ? (
            <Link to={`/panel/oyun/${editing.gameKey}`} className="block rounded-lg bg-[#f7f2e9] px-3 py-2 text-[10px] font-semibold text-brand-700">
              Dil, katılım komutu ve takım komutları için oyun panelini aç →
            </Link>
          ) : null}

          {editing?.isOwner ? (
            <div className="rounded-xl border border-[#e4dccf] bg-[#fffaf4] p-3">
              <p className="text-[11px] font-semibold text-ink-800">Ortak yayıncılar</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-ink-500">
                İkinci bir yayıncıyı ekle; kendi platform sohbetini aynı odaya bağlayarak ortak
                yayın yapın. Oda lisansı senin hesabından kullanılır.
              </p>
              {(editing.hosts ?? []).length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {editing.hosts.map((host) => (
                    <div key={host.id} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5">
                      <span className="text-[10px] font-medium text-ink-700">{host.name}</span>
                      <button
                        type="button"
                        disabled={hostBusy}
                        onClick={() => void removeHost(host.id)}
                        className="text-[9px] font-semibold text-red-600"
                      >
                        Kaldır
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex gap-1.5">
                <input
                  className="input h-8 flex-1 text-[11px]"
                  type="email"
                  value={hostEmail}
                  onChange={(event) => setHostEmail(event.target.value)}
                  placeholder="ortak@ornek.com"
                />
                <Button size="sm" variant="secondary" loading={hostBusy} onClick={() => void inviteHost()}>
                  Davet et
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-violet-50 px-3 py-2 text-[10px] text-violet-700">
              Bu odaya ortak yayıncı olarak eklendin. Oda lisansı sahibinden kullanılır.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(moderationRoom)}
        onClose={() => setModerationRoom(null)}
        title="Oyuncu moderasyonu"
        description="Canlı odadaki izleyicileri yönet. Çıkarılan oyuncu yeni turda tekrar katılabilir."
        footer={
          <Button variant="secondary" onClick={() => setModerationRoom(null)}>
            Kapat
          </Button>
        }
      >
        <div className="space-y-2">
          {modBusy ? (
            <Spinner label="Oyuncular yükleniyor..." />
          ) : modPlayers.length === 0 ? (
            <p className="rounded-xl bg-[#fbf7f0] px-3 py-4 text-center text-[11px] text-ink-400">
              Şu anda odada oyuncu yok.
            </p>
          ) : (
            modPlayers.map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded-xl border border-[#eee7dc] bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  {player.avatar ? (
                    <img src={player.avatar} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f3ede3] text-[9px] font-bold text-ink-500">
                      {player.name.slice(0, 2).toLocaleUpperCase('tr')}
                    </span>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold text-ink-800">{player.name}</p>
                    <p className="text-[9px] text-ink-400">
                      {player.side ? `${player.side} · ` : ''}{Math.round(player.score)} puan
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={modBusy}
                    onClick={() => void kickPlayer(player.id)}
                    className="rounded-lg border border-[#e4dccf] px-2 py-1 text-[9px] font-semibold text-ink-500 hover:bg-[#fbf7f0]"
                  >
                    Çıkar
                  </button>
                  <button
                    type="button"
                    disabled={modBusy}
                    onClick={() => void kickPlayer(player.id, true)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-[9px] font-semibold text-red-600 hover:bg-red-50"
                  >
                    Banla
                  </button>
                </div>
              </div>
            ))
          )}

          {modBans.length > 0 ? (
            <div className="mt-3 border-t border-[#eee7dc] pt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                Banlı izleyiciler ({modBans.length})
              </p>
              <div className="space-y-1.5">
                {modBans.map((ban) => (
                  <div key={ban.viewerId} className="flex items-center justify-between rounded-lg bg-red-50/60 px-2.5 py-1.5">
                    <div>
                      <p className="text-[10px] font-semibold text-ink-700">{ban.viewerName}</p>
                      <p className="text-[8px] text-ink-400">{ban.reason ?? 'Moderasyon'}</p>
                    </div>
                    <button
                      type="button"
                      disabled={modBusy}
                      onClick={() => void unban(ban.viewerId)}
                      className="text-[9px] font-semibold text-emerald-700"
                    >
                      Banı kaldır
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(quizRoom)}
        onClose={() => setQuizRoom(null)}
        title="Bilgi Arenası soruları"
        description="Kendi sorularını ekle veya hazır soru havuzunu kullan. Sorular her turda karıştırılır."
        footer={
          <>
            <Button
              variant="secondary"
              loading={quizBusy}
              onClick={() => void saveQuiz([])}
            >
              Hazır havuza dön
            </Button>
            <Button variant="brand" loading={quizBusy} onClick={() => void saveQuiz(quizQuestions)}>
              Kaydet
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-[#e4dccf] bg-[#fffaf4] p-3 text-[10px] leading-relaxed text-ink-500">
            {quizQuestions.length > 0 ? (
              <>Şu anda <strong className="text-ink-800">{quizQuestions.length} özel soru</strong> kullanılıyor. Hazır havuzdaki {QUIZ_QUESTIONS.length} soru devre dışı.</>
            ) : (
              <>Hazır soru havuzu kullanılıyor: <strong className="text-ink-800">{QUIZ_QUESTIONS.length} soru</strong>, her turda karıştırılır.</>
            )}
          </div>

          {quizQuestions.length > 0 ? (
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {quizQuestions.map((question) => (
                <div key={question.id} className="rounded-lg border border-[#eee7dc] bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-brand-700">{question.category}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-ink-800">{question.question}</p>
                      <p className="mt-0.5 text-[9px] text-ink-400">
                        Doğru: {question.options[question.answer]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuizQuestions((current) => current.filter((entry) => entry.id !== question.id))}
                      className="text-[9px] font-semibold text-red-600"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="rounded-xl border border-[#e4dccf] bg-white p-3">
            <p className="text-[11px] font-bold text-ink-800">Yeni soru ekle</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                className="input h-8 text-[11px]"
                value={quizCategory}
                onChange={(event) => setQuizCategory(event.target.value)}
                placeholder="Kategori (ör. Genel kültür)"
                maxLength={40}
              />
              <select
                className="input h-8 text-[11px]"
                value={quizAnswer}
                onChange={(event) => setQuizAnswer(Number(event.target.value) as 0 | 1 | 2 | 3)}
                aria-label="Doğru cevap"
              >
                {[0, 1, 2, 3].map((index) => (
                  <option key={index} value={index}>Doğru cevap: {['A', 'B', 'C', 'D'][index]}</option>
                ))}
              </select>
            </div>
            <input
              className="input mt-2 h-9 w-full text-[11px]"
              value={quizText}
              onChange={(event) => setQuizText(event.target.value)}
              placeholder="Soru metni"
              maxLength={220}
            />
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {quizOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-ink-400">{['A', 'B', 'C', 'D'][index]}</span>
                  <input
                    className="input h-8 min-w-0 flex-1 text-[10px]"
                    value={option}
                    onChange={(event) =>
                      setQuizOptions((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                    }
                    placeholder={`${['A', 'B', 'C', 'D'][index]} seçeneği`}
                    maxLength={90}
                  />
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={addQuizQuestion}>
              Soruyu listeye ekle
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}