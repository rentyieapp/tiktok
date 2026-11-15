import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Gamepad2,
  Heart,
  LockKeyhole,
  Info,
  Layers3,
  MessageCircle,
  Play,
  Radio,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
  TrendingUp,
  ListChecks,
  CircleHelp,
  Trophy,
  Wand2,
} from 'lucide-react';
import {
  ARCADE_GAME_LIST,
  HORSE_RACERS,
  findArcadeGameBySlug,
  type ArcadeGameDef,
} from '@shared/arcade';
import { ArcadeLiveStage } from '../../components/ArcadeLiveStage';
import { ArcadeGameCard } from '../../components/ArcadeGameCard';
import { ArcadeOverlay } from '../../components/ArcadeOverlay';
import { MarketingFooter, MarketingHeader } from '../../components/MarketingHeader';
import { GameArt } from '../../components/GameArt';
import { Button } from '../../components/ui';
import type { PackageDTO } from '@shared/types';
import { formatPrice } from '@shared/defaults';
import { api } from '../../lib/api';
import { startCheckout } from '../../lib/checkout';
import { useArcadeSocket } from '../../lib/useArcadeSocket';
import { useAuth } from '../../lib/auth';


interface Playbook {
  features: Array<{ title: string; text: string }>;
  tips: string[];
  faq: Array<{ q: string; a: string }>;
  commands: string[];
}

function buildPlaybook(game: ArcadeGameDef): Playbook {
  const mode = game.mode;
  const features = [
    {
      title: 'Canlı 3D sahne',
      text: `${game.name} için özel hazırlanmış, 9:16 dikey yayın sahnesi. OBS Browser Source olarak doğrudan eklenir.`,
    },
    {
      title: 'Sohbetle kontrol',
      text: 'İzleyici yorum, beğeni ve hediye gönderdiğinde oyun anında tepki verir. Ek uygulama veya eklenti gerekmez.',
    },
    {
      title: 'Canlı sıralama',
      text: 'Tur içinde puanlar, ilerleme ve kazananlar anlık güncellenir; yayıncı ve izleyici aynı sahneyi görür.',
    },
    {
      title: 'Yayıncı kontrolü',
      text: 'Katılım komutları, dil, overlay, TTS ve moderasyon oyun panelinden yönetilir. İstenmeyen izleyici kalıcı olarak engellenebilir.',
    },
  ];
  const modeFeatures: Record<string, Array<{ title: string; text: string }>> = {
    race: [
      { title: 'Hız ve nitro', text: 'Beğeni temel hızı, hediye ise kısa süreli nitro etkisini tetikler. Farklı hediye kademeleri yarışın temposunu değiştirir.' },
      { title: 'Şerit yarışı', text: `${game.maxPlayers} izleyiciye kadar aynı pistte yarışılır; bitiş çizgisine ilk ulaşan turu kazanır.` },
      { title: 'Kısa turlar', text: `${game.durationSec} saniyelik turlar sayesinde yayın temposu düşmez, yeni izleyici hızla dahil olur.` },
    ],
    dance: [
      { title: 'Ritim ve coşku', text: 'Beğeni ve hediyeler dansçıların enerjisini yükseltir; sahne ışıkları ve kalabalık tepki verir.' },
      { title: 'Kostüm ve sahne', text: 'Her izleyici kendi rengiyle sahnede görünür. Yayıncı overlay ve vurgu rengini kendi markasına uyarlar.' },
      { title: 'Sosyal anlar', text: 'Dansçılar aynı sahnede buluşur; sohbet akışı ve kazanan duyurusu yayıncıya doğal etkileşim sağlar.' },
    ],
    battle: [
      { title: 'Hayatta kalma', text: 'Beğeni ve hediyeler can/savunma gücü verir; tur sonuna kadar kalan izleyici kazanır.' },
      { title: 'Sürekli gerilim', text: 'Canlı HP göstergesi ve eleme akışı izleyiciyi ekranda tutar. Son saniye dönüşleri yüksek etkileşim yaratır.' },
      { title: 'Hediye saldırıları', text: 'Farklı hediye seviyeleri saldırı gücünü artırır; yayıncı dengeli bir ekonomi için hediye eşiklerini ayarlar.' },
    ],
    quiz: [
      { title: 'Bilgi yarışı', text: 'Her turda yeni soru gelir; doğru cevap puan kazandırır, yanlış cevap sıralamayı değiştirir.' },
      { title: 'Karışık cevaplar', text: 'Sorular ve seçenekler her turda karıştırılır; aynı cevabı ezberlemek avantaj sağlamaz.' },
      { title: 'Özel soru havuzu', text: 'Yayıncı kendi sorularını ekleyebilir; niş kitlesine uygun bilgi yarışı kurar.' },
    ],
    word: [
      { title: 'Harf avı', text: 'Verilen harfle başlayan kelimeleri sohbetten topla; doğru kelime anında puana dönüşür.' },
      { title: 'Kategori çeşitliliği', text: 'Şehir, hayvan, bitki gibi kategorilerle her tur farklı bir kelime oyunu oynanır.' },
      { title: 'Hızlı katılım', text: 'Kısa cevap süresi sayesinde izleyici beklemeden oyuna girer; sohbet hareketli kalır.' },
    ],
    wheel: [
      { title: 'Bilet ekonomisi', text: 'Beğeni, yorum ve hediye bilet kazandırır; çark ağırlıklı olarak en çok bilete sahip izleyiciyi ödüllendirir.' },
      { title: 'Otomatik dönüş', text: 'Çark belirli aralıklarla kendiliğinden döner; yayıncı ekstra butona basmadan tempo korunur.' },
      { title: 'Şans ve strateji', text: 'Az bileti olan da şansını deneyebilir; hediye ile bilet artırmak kazanma ihtimalini yükseltir.' },
    ],
    tug: [
      { title: 'Takım savaşı', text: 'İzleyiciler kırmızı veya mavi takıma katılır; beğeni ve hediyeler halatı kendi tarafına çeker.' },
      { title: 'Takım komutları', text: 'Yayıncı kırmızı/mavi komutlarını ve katılım komutunu kendi diline göre özelleştirir.' },
      { title: 'Ortak hedef', text: 'Tek bir izleyici yerine takım kazanır; sohbet içinde rekabet ve dayanışma aynı anda oluşur.' },
    ],
    versus: [
      { title: 'İki taraf, tek duvar', text: 'İzleyiciler taraf seçer; beğeni ve hediyeler duvarı karşı tarafa iter.' },
      { title: 'Takım kimliği', text: 'Kızlar/erkekler veya kırmızı/mavi gibi takım isimleri yayıncı tarafından özelleştirilebilir.' },
      { title: 'Dengeli tur', text: 'Duvarın konumu anlık gösterilir; izleyici hangi tarafın önde olduğunu her an görür.' },
    ],
    horse: [
      { title: 'Jokey yarışı', text: 'İzleyiciler 10 farklı jokeyden birini seçer; beğeni ve hediye atı ileri iter.' },
      { title: 'Şerit değiştirme', text: 'Yorumla jokey değiştirilebilir; yayıncı katılım komutlarıyla akışı yönetir.' },
      { title: 'Canlı skor', text: 'Her şeridin ilerlemesi ayrı gösterilir; yarışın sonuna kadar heyecan korunur.' },
    ],
    melon: [
      { title: 'Ortak gerginlik', text: 'Karpuzun etrafındaki bantlar her etkileşimde sıklaşır; tur sonunda karpuz patlar.' },
      { title: 'Katkı sıralaması', text: 'En çok bant geren izleyici kazanır; küçük hediyeler bile katkı sağlar.' },
      { title: 'Görsel gerilim', text: 'Bant sayısı ve sallanma efekti izleyiciye yaklaşan patlamayı hissettirir.' },
    ],
    gold: [
      { title: 'Ortak hazine', text: 'Tüm izleyiciler aynı altın kasasını boşaltmak için birlikte çalışır.' },
      { title: 'Mıknatıs gücü', text: 'Beğeni ve hediyeler mıknatısı güçlendirir; altınlar kasaya doğru çekilir.' },
      { title: 'Katkı yarışı', text: 'En çok altın çeken izleyici kazanır; ekip çalışması ve bireysel rekabet bir arada.' },
    ],
    town: [
      { title: 'Bina büyütme', text: 'Her izleyici kendi binasını kat kat yükseltir; beğeni ve hediyeler yeni kat ekler.' },
      { title: 'Şehir manzarası', text: 'Tüm binalar aynı sahnede görünür; en yüksek bina turun kazananı olur.' },
      { title: 'Uzun vadeli hedef', text: 'İzleyici binasını büyütmek için geri döner; yayıncı tekrar eden etkileşim kazanır.' },
    ],
  };
  features.push(...(modeFeatures[mode] ?? []));
  const tips = [
    `İlk turda izleyiciye ${game.controls.includes('Yorum') ? 'katılım komutunu' : 'beğeni ve hediyenin etkisini'} gösterin; ilk 30 saniye katılımın en yüksek olduğu aralıktır.`,
    `Hediye eşiklerini ${game.durationSec} saniyelik tur içinde görünür tutun; düşük, orta ve yüksek katkı arasında net bir fark olsun.`,
    'Tur arasında kazananı ve bir sonraki turun başlangıcını duyurun. Kısa geri sayım, izleyicinin odada kalmasını sağlar.',
    'Oyun panelindeki dil ve katılım komutlarını kendi topluluğunuza uyarlayın; moderasyon ve ban araçlarını yayın öncesi test edin.',
  ];
  const commands = [
    'Yoruma katıl.',
    'Beğeni gönder.',
    'Hediye gönder.',
    ...(mode === 'quiz' || mode === 'word' ? ['Doğru cevabı yaz.'] : []),
    ...(mode === 'tug' || mode === 'versus' ? ['Takım komutunu yaz.'] : []),
  ];
  const faq = [
    {
      q: `${game.name} oynamak için ne gerekiyor?`,
      a: 'Yayıncı tarafında oyun lisansı ve yayın odası gerekir. İzleyici tarafında sadece TikTok/YouTube/Twitch sohbeti yeterlidir; uygulama indirmesi gerekmez.',
    },
    {
      q: 'Kaç izleyici aynı anda katılabilir?',
      a: `${game.name} aynı anda ${game.maxPlayers} izleyiciye kadar destekler. Tur süresi ${game.durationSec} saniyedir; yeni turlar otomatik başlar.`,
    },
    {
      q: 'Hediye göndermek zorunlu mu?',
      a: 'Hayır. Beğeni ve yorum da oyunu etkiler. Hediye, daha güçlü bir etki yaratır; yayıncı bunu kendi topluluğuna göre dengeleyebilir.',
    },
    {
      q: 'OBS’e nasıl eklerim?',
      a: 'Yayıncı panelinden oyun odasını açın, OBS bağlantısını kopyalayın ve OBS’de Browser Source olarak ekleyin. 9:16 dikey sahne otomatik ölçeklenir.',
    },
    {
      q: 'Lisans bitince ne olur?',
      a: 'Oda yayına kapanır ancak ayarlarınız ve geçmişiniz korunur. Yeni lisans aldığınızda aynı odadan kaldığınız yerden devam edersiniz.',
    },
    {
      q: 'Moderasyon ve engelleme var mı?',
      a: 'Evet. İzleyiciyi kalıcı olarak engelleyebilir, sohbeti yönetebilir ve istenmeyen katılımcıları odadan çıkarabilirsiniz.',
    },
  ];
  return { features: features.slice(0, 7), tips, faq, commands };
}

const FEED_COLORS: Record<string, string> = {
  join: 'text-brand-700',
  like: 'text-pink-600',
  gift: 'text-amber-700',
  answer: 'text-blue-700',
  system: 'text-ink-400',
  win: 'text-amber-700 font-semibold',
};

export function ArcadeGamePage() {
  const { slug } = useParams<{ slug: string }>();
  const game = slug ? findArcadeGameBySlug(slug) : undefined;
  if (!game) return <Navigate to="/oyunlar" replace />;
  return <GameView key={game.key} game={game} />;
}

function GameView({ game }: { game: ArcadeGameDef }) {
  const { me: authUser } = useAuth();
  const {
    state,
    connected,
    playerId,
    notice,
    answerFeedback,
    join,
    action,
    start,
    reset,
    savedName,
  } = useArcadeSocket(game.key);
  const [name, setName] = useState(savedName);
  const [joinSide, setJoinSide] = useState<'red' | 'blue' | 'girls' | 'boys'>(
    game.mode === 'versus' ? 'girls' : 'red',
  );
  const [joinLane, setJoinLane] = useState(1);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'chat' | 'ranking'>('chat');
  const [overlayPreview, setOverlayPreview] = useState(true);
  const [overlayMode, setOverlayMode] = useState<'basic' | 'pro'>('pro');
  const playbook = useMemo(() => buildPlaybook(game), [game]);
  const [prices, setPrices] = useState<{ oneDay: number | null; thirtyDay: number | null }>({
    oneDay: null,
    thirtyDay: null,
  });
  const [offers, setOffers] = useState<PackageDTO[]>([]);
  const [licensed, setLicensed] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [trialStarting, setTrialStarting] = useState(false);

  useEffect(() => {
    api
      .get<{ offers: PackageDTO[] }>('/api/arcade/offers')
      .then((result) => {
        setOffers(result.offers.filter((offer) => offer.gameKey === game.key && offer.isActive !== false));
        const minFor = (days: number) => {
          const rows = result.offers.filter(
            (offer) => offer.gameKey === game.key && offer.durationDays === days && offer.isActive !== false,
          );
          return rows.length ? Math.min(...rows.map((pkg) => pkg.priceCents)) : null;
        };
        setPrices({ oneDay: minFor(1), thirtyDay: minFor(30) });
      })
      .catch(() => setPrices({ oneDay: null, thirtyDay: null }));
  }, [game.key]);

  useEffect(() => {
    if (!authUser) {
      setAccessLoaded(true);
      return;
    }
    api
      .get<{ licenses: Array<{ gameKey: string }> }>('/api/arcade/access')
      .then((result) => setLicensed(result.licenses.some((license) => license.gameKey === game.key)))
      .catch(() => setLicensed(false))
      .finally(() => setAccessLoaded(true));
  }, [authUser, game.key]);

  const startTrial = async () => {
    if (!authUser) {
      window.location.assign(`/kayit?next=/oyun/${game.slug}`);
      return;
    }
    setTrialStarting(true);
    try {
      await api.post('/api/arcade/trial', { gameKey: game.key });
      window.location.assign('/panel/arcade');
    } catch (caught) {
      setTrialStarting(false);
      window.alert(caught instanceof Error ? caught.message : 'Deneme başlatılamadı.');
    }
  };

  const buy = async (offer: PackageDTO) => {
    if (!authUser) {
      window.location.assign(`/kayit?next=/oyun/${game.slug}`);
      return;
    }
    setBuying(offer.id);
    try {
      await startCheckout(offer.id);
    } catch (caught) {
      setBuying(null);
      window.alert(caught instanceof Error ? caught.message : 'Ödeme başlatılamadı.');
    }
  };

  const me = useMemo(
    () => state?.players.find((player) => player.id === playerId) ?? null,
    [state, playerId],
  );
  const joined = Boolean(playerId && me);
  const isQuiz = game.mode === 'quiz';
  const isWord = game.mode === 'word';
  const prompt = state?.prompt;
  const canAnswer =
    joined &&
    state?.phase === 'running' &&
    (isQuiz || isWord) &&
    prompt &&
    !prompt.reveal &&
    me?.answeredPrompt !== prompt.id;

  const submitMessage = () => {
    if (!message.trim()) return;
    action('comment', message.trim());
    setMessage('');
  };
  const answerOption = (index: number) => {
    action('comment', ['A', 'B', 'C', 'D'][index]!);
  };

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-ink-900">
      <MarketingHeader />

      <main>
        <div className="container-page py-6">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-400">
            <Link to="/oyunlar" className="inline-flex items-center gap-1 hover:text-ink-800">
              <ArrowLeft size={12} /> Oyunlar
            </Link>
            <ChevronRight size={11} />
            <span>{game.category}</span>
            <ChevronRight size={11} />
            <span className="font-medium text-ink-800">{game.name}</span>
          </div>
        </div>

        <section className="container-page grid items-center gap-8 pb-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge-neutral">{game.category}</span>
              <span className="badge-ok">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {licensed ? 'Lisans aktif' : 'Önizleme'}
              </span>
              {game.risk === 'yuksek' ? (
                <span className="badge bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">
                  <ShieldAlert size={10} /> Yüksek etkileşim
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-balance font-display text-4xl font-bold leading-[1.04] tracking-tight text-ink-950 sm:text-5xl">
              {game.name}
            </h1>
            <p className="mt-3 max-w-xl text-base font-medium text-ink-600">{game.tagline}</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-500">{game.description}</p>
            {game.note ? (
              <p className="mt-3 inline-flex items-start gap-2 rounded-xl bg-[#eafaf5] px-3 py-2 text-[11px] leading-relaxed text-[#073b31]">
                <Info size={13} className="mt-0.5 shrink-0" /> {game.note}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#oyna">
                <Button variant="brand" icon={<Play size={15} />}>
                  Canlı dene
                </Button>
              </a>
              <Link to="/satin-al">
                <Button variant="secondary" icon={<ArrowRight size={15} />}>
                  Mağazayı gör
                </Button>
              </Link>
              <Link to={licensed ? '/panel/arcade' : authUser ? '#oyna' : '/kayit'}>
                <Button variant="secondary" icon={<Radio size={15} />}>
                  {licensed ? 'Yayın odasını yönet' : 'Lisans al ve yayına al'}
                </Button>
              </Link>
            </div>
            {prices.oneDay !== null || prices.thirtyDay !== null ? (
              <p className="mt-4 text-[11px] text-ink-500">
                Bu oyunun lisansı:{' '}
                {prices.oneDay !== null ? <strong className="text-ink-800">1 gün {formatPrice(prices.oneDay)}</strong> : null}
                {prices.oneDay !== null && prices.thirtyDay !== null ? ' · ' : null}
                {prices.thirtyDay !== null ? <strong className="text-ink-800">30 gün {formatPrice(prices.thirtyDay)}</strong> : null}
                {' '}· süreler admin tarafından güncellenir.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={12} /> {game.durationSec} saniyelik turlar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={12} /> {game.maxPlayers} izleyiciye kadar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} /> OBS / LIVE Studio
              </span>
            </div>
          </div>
          <div className="overflow-hidden rounded-[32px] border border-[#e9e1d5] bg-white p-3 shadow-[0_25px_70px_-35px_rgba(48,38,25,0.35)]">
            <GameArt game={game} className="rounded-2xl" />
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-ink-400">
                <Sparkles size={11} className="text-brand-600" /> Özgün sahne · 9:16
              </span>
              <span className="text-[10px] text-ink-400">Tarayıcıda çalışır</span>
            </div>
          </div>
        </section>

        <section id="oyna" className="scroll-mt-20 border-y border-[#eee7dc] bg-[#fffaf4] py-10">
          <div className="container-page">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">
                  Canlı önizleme
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-950">
                  Oyunu şimdi dene
                </h2>
                <p className="mt-1 text-xs text-ink-500">
                  Demo kalabalığıyla oynanan gerçek zamanlı sahne. Yayıncı bağlantısı hazır
                  olduğunda aynı ekran OBS’e gider.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    connected
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                      : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-ink-400'}`} />
                  {connected ? 'Canlı bağlı' : 'Bağlanıyor'}
                </span>
                {joined ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e4dccf] bg-white px-2.5 py-1.5 text-[10px] font-medium text-ink-500 hover:text-ink-900"
                  >
                    <RotateCcw size={11} /> Sıfırla
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,400px)_1fr] xl:grid-cols-[minmax(0,430px)_1fr]">
              <div className="mx-auto w-full max-w-[430px]">
                <div className="relative overflow-hidden rounded-[26px] border border-[#e5dccf] bg-white p-2 shadow-[0_25px_60px_-30px_rgba(48,38,25,0.35)]">
                  <ArcadeLiveStage game={game} state={state} />
                  {overlayPreview ? (
                    <ArcadeOverlay
                      game={game}
                      state={state}
                      roomName="Rook Works canlı önizleme"
                      accent={game.accent}
                      theme="full"
                      botEnabled
                      pro={overlayMode === 'pro'}
                    />
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500">
                    <Layers3 size={12} className="text-violet-600" /> Overlay önizleme
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOverlayMode('basic')}
                      className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${overlayMode === 'basic' ? 'bg-ink-950 text-white' : 'bg-ink-100 text-ink-500'}`}
                    >
                      Temel
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverlayMode('pro')}
                      className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${overlayMode === 'pro' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'}`}
                    >
                      ✦ Pro
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverlayPreview((current) => !current)}
                      className="ml-1 rounded-full border border-[#e4dccf] bg-white px-2 py-1 text-[9px] font-semibold text-ink-400"
                    >
                      {overlayPreview ? 'Gizle' : 'Göster'}
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2">
                  <p className="text-[9px] leading-relaxed text-violet-800">
                    {overlayMode === 'pro'
                      ? 'Pro: liderlik tablosu + hedef barı + kazanan kartı + bot.'
                      : 'Temel: oda bilgisi + son olay.'}{' '}
                    Overlay, OBS’de oyun sahnesinin üstüne ayrı katman olarak eklenir.
                  </p>
                  <Link to="/satin-al" className="shrink-0 text-[9px] font-bold text-violet-700 hover:text-violet-600">
                    Overlay Pro →
                  </Link>
                </div>
                <p className="mt-2 text-center text-[10px] text-ink-400">
                  9:16 dikey sahne · OBS Browser Source için hazır
                </p>
              </div>

              <div className="min-w-0 space-y-4">
                <div className="rounded-3xl border border-[#e9e1d5] bg-white p-5 shadow-card">
                  {!licensed && accessLoaded ? (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="flex items-center gap-2 text-base font-bold text-ink-950">
                            <LockKeyhole size={16} className="text-amber-600" /> Bu oyun lisans gerektirir
                          </h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                            Sahne önizlemesi açık; ancak oyuna katılmak ve kendi yayın odanı açmak
                            için oyun lisansı gerekir. Lisans, satın aldığın süre boyunca geçerlidir.
                          </p>
                        </div>
                        <ShoppingBag size={20} className="text-brand-600" />
                      </div>
                      <div className="mt-4 space-y-2">
                        {offers
                          .sort((a, b) => a.durationDays - b.durationDays)
                          .map((offer) => (
                            <button
                              key={offer.id}
                              type="button"
                              disabled={buying === offer.id}
                              onClick={() => void buy(offer)}
                              className="flex w-full items-center justify-between rounded-xl border border-[#e4dccf] bg-[#fffaf4] px-3 py-2.5 text-left text-[11px] font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50/40"
                            >
                              <span>{offer.name}</span>
                              <span className="text-brand-700">{formatPrice(offer.priceCents, offer.currency)}</span>
                            </button>
                          ))}
                        {offers.length === 0 ? (
                          <p className="text-[11px] text-ink-400">Bu oyun için satışta lisans yok.</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={trialStarting}
                        onClick={() => void startTrial()}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                      >
                        <Clock3 size={12} /> {trialStarting ? 'Deneme açılıyor...' : 'Günde 30 dk ücretsiz dene'}
                      </button>
                      <p className="mt-3 text-[10px] leading-relaxed text-ink-400">
                        Demo sahne yalnızca önizlemedir; sohbetten oynama ve OBS yayın bağlantısı
                        lisansla açılır.
                      </p>
                    </div>
                  ) : !joined ? (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-ink-950">Sahneye katıl</h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                            Bir görünen ad seç. Demo kalabalığına sen de katıl; yorum, beğeni ve
                            hediye gönder.
                          </p>
                        </div>
                        <Gamepad2 size={20} className="text-brand-600" />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <input
                          className="input text-sm"
                          value={name}
                          maxLength={18}
                          onChange={(event) => setName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') join(name, joinSide, game.mode === 'horse' ? joinLane : undefined);
                          }}
                          placeholder="Görünen adın"
                        />
                        <Button variant="brand" onClick={() => join(name, joinSide, game.mode === 'horse' ? joinLane : undefined)}>
                          Katıl
                        </Button>
                      </div>
                      {game.mode === 'tug' || game.mode === 'versus' ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {(game.mode === 'tug'
                            ? [
                                { key: 'red' as const, label: 'Kırmızı Takım' },
                                { key: 'blue' as const, label: 'Mavi Takım' },
                              ]
                            : [
                                { key: 'girls' as const, label: 'Kızlar Takımı' },
                                { key: 'boys' as const, label: 'Erkekler Takımı' },
                              ]
                          ).map((team) => (
                            <button
                              key={team.key}
                              type="button"
                              onClick={() => setJoinSide(team.key)}
                              className={`rounded-xl border px-2 py-2 text-[10px] font-semibold transition ${
                                joinSide === team.key
                                  ? team.key === 'red' || team.key === 'girls'
                                    ? 'border-pink-300 bg-pink-50 text-pink-700'
                                    : 'border-blue-300 bg-blue-50 text-blue-700'
                                  : 'border-[#e4dccf] bg-white text-ink-500'
                              }`}
                            >
                              {team.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {game.mode === 'horse' ? (
                        <div className="mt-3">
                          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-ink-400">Jokeyini seç</p>
                          <div className="grid max-h-36 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                            {HORSE_RACERS.map((racer) => (
                              <button
                                key={racer.id}
                                type="button"
                                onClick={() => setJoinLane(racer.id)}
                                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[9px] font-semibold transition ${
                                  joinLane === racer.id
                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-[#e4dccf] bg-white text-ink-500'
                                }`}
                              >
                                <span className="grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold text-white" style={{ background: racer.color }}>{racer.id}</span>
                                <span className="truncate">{racer.name}</span>
                                <span className="ml-auto text-[8px] text-ink-400">{racer.style}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <p className="mt-2 text-[10px] text-ink-400">
                        Adın yalnızca bu demo odasında görünür. Profil resmi yüklenmez.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                        <ShieldCheck size={11} /> Oyun lisansın aktif
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white"
                            style={{ background: me?.color ?? '#0f8a72' }}
                          >
                            {me?.name.slice(0, 2).toLocaleUpperCase('tr')}
                          </span>
                          <div>
                            <p className="text-[12px] font-semibold text-ink-900">{me?.name}</p>
                            <p className="text-[10px] text-ink-400">
                              {me?.eliminated ? 'Elendi' : `Sıra ${me?.rank ?? '—'}`}
                            </p>
                          </div>
                        </div>
                        <span className="badge-ok">Oyundasın</span>
                      </div>
                      {(game.mode === 'tug' || game.mode === 'versus') && me?.side ? (
                        <p className={`mt-3 rounded-xl px-3 py-2 text-[11px] font-semibold ${
                          me.side === 'red' || me.side === 'girls'
                            ? 'bg-pink-50 text-pink-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          Takımın:{' '}
                          {me.side === 'red' || me.side === 'girls'
                            ? game.mode === 'versus'
                              ? 'Kızlar'
                              : 'Kırmızı'
                            : game.mode === 'versus'
                              ? 'Erkekler'
                              : 'Mavi'}
                          {' '}· beğeni ve hediyele duvarı/halatı it
                        </p>
                      ) : null}
                      {game.mode === 'horse' && me?.lane ? (
                        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                          {HORSE_RACERS[me.lane - 1]?.name} jokeyindesin · beğeni +1, hediye +10, yorumla jokey değiştir
                        </p>
                      ) : null}
                      {game.mode === 'wheel' ? (
                        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                          Biletin: {Math.round(me?.score ?? 0)} · beğeni +3, hediye +25, yorum +1
                        </p>
                      ) : null}

                      {state?.phase === 'lobby' ? (
                        <div className="mt-3 rounded-xl bg-[#fbf7f0] p-3 text-[11px] text-ink-500">
                          Tur birazdan başlıyor. Hazır olduğunda başlatabilirsin.
                          <Button variant="secondary" size="sm" className="ml-2" onClick={start}>
                            Turu başlat
                          </Button>
                        </div>
                      ) : null}

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button variant="secondary" icon={<Heart size={14} className="text-pink-500" />} onClick={() => action('like')}>
                          Beğen
                        </Button>
                        <Button variant="secondary" icon={<Zap size={14} className="text-amber-500" />} onClick={() => action('gift')}>
                          Hediye
                        </Button>
                      </div>

                      {isQuiz && prompt?.options ? (
                        <div className="mt-4">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                            Cevabını seç
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {prompt.options.map((option, index) => {
                              const answered = me?.answeredPrompt === prompt.id;
                              const isCorrect = prompt.reveal && prompt.answerIndex === index;
                              return (
                                <button
                                  key={`${prompt.id}-${option}`}
                                  type="button"
                                  disabled={!canAnswer || answered}
                                  onClick={() => answerOption(index)}
                                  className={`flex items-start gap-2 rounded-xl border p-2.5 text-left text-[11px] transition ${
                                    isCorrect
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                      : 'border-[#e8e1d6] bg-[#fffaf4] text-ink-600 hover:border-[#cbbda9] disabled:opacity-50'
                                  }`}
                                >
                                  <span className="font-bold text-brand-700">{['A', 'B', 'C', 'D'][index]}</span>
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                          {me?.answeredPrompt === prompt.id ? (
                            <p className="mt-1.5 text-[10px] text-ink-400">Cevabın kaydedildi.</p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-3 flex gap-2">
                          <div className="relative flex-1">
                            <MessageCircle size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                            <input
                              className="input pl-9 text-xs"
                              value={message}
                              maxLength={80}
                              onChange={(event) => setMessage(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') submitMessage();
                              }}
                              placeholder={
                                isWord
                                  ? `${prompt?.letter ?? ''} ile başlayan cevabını yaz...`
                                  : 'Sohbete yaz...'
                              }
                            />
                          </div>
                          <Button variant="primary" className="px-3" onClick={submitMessage} aria-label="Gönder">
                            <Send size={15} />
                          </Button>
                        </div>
                      )}

                      {answerFeedback ? (
                        <div
                          className={`mt-3 rounded-xl px-3 py-2 text-[11px] font-medium ${
                            answerFeedback.correct
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {answerFeedback.correct ? <Check size={12} className="mr-1 inline" /> : null}
                          {answerFeedback.message}
                        </div>
                      ) : null}
                      {notice ? (
                        <div className="mt-3 rounded-xl bg-ink-100 px-3 py-2 text-[11px] text-ink-600">
                          {notice}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-[#e9e1d5] bg-white shadow-card">
                  <div className="flex items-center gap-1 border-b border-[#f0ebe2] px-4 pt-3">
                    <button
                      type="button"
                      onClick={() => setTab('chat')}
                      className={`rounded-t-lg px-3 py-2 text-[11px] font-semibold ${
                        tab === 'chat' ? 'bg-[#fbf7f0] text-ink-900' : 'text-ink-400'
                      }`}
                    >
                      Canlı akış
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('ranking')}
                      className={`rounded-t-lg px-3 py-2 text-[11px] font-semibold ${
                        tab === 'ranking' ? 'bg-[#fbf7f0] text-ink-900' : 'text-ink-400'
                      }`}
                    >
                      Sıralama
                    </button>
                    <span className="ml-auto text-[10px] text-ink-400">
                      {state?.players.length ?? 0} oyuncu
                    </span>
                  </div>

                  {tab === 'chat' ? (
                    <div className="h-[230px] overflow-y-auto p-4">
                      {state?.feed?.length ? (
                        <div className="space-y-1.5">
                          {state.feed.map((item) => (
                            <p key={item.id} className={`text-[11px] leading-relaxed ${FEED_COLORS[item.kind] ?? 'text-ink-500'}`}>
                              {item.text}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-ink-400">Akış hazırlanıyor...</p>
                      )}
                    </div>
                  ) : (
                    <div className="h-[230px] overflow-y-auto p-2">
                      {[...(state?.players ?? [])]
                        .sort((a, b) => a.rank - b.rank)
                        .slice(0, 12)
                        .map((player) => (
                          <div
                            key={player.id}
                            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                              player.id === playerId ? 'bg-[#f7f2e9]' : ''
                            }`}
                          >
                            <span className="w-4 text-[10px] font-bold text-ink-400">{player.rank}</span>
                            <span
                              className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold text-white"
                              style={{ background: player.color }}
                            >
                              {player.name.slice(0, 2).toLocaleUpperCase('tr')}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink-700">
                              {player.name}
                              {player.isBot ? (
                                <span className="ml-1 text-[8px] font-normal text-ink-400">demo</span>
                              ) : null}
                            </span>
                            <span className="text-[10px] font-semibold text-ink-500">
                              {game.mode === 'battle'
                                ? `${Math.ceil(player.hp)} HP`
                                : game.mode === 'race'
                                  ? `${Math.floor(player.progress)}%`
                                  : `${Math.round(player.score)}`}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-[10px] leading-relaxed text-amber-900/80">
                  <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>
                    Bu canlı önizleme demo kalabalığı içerir. Yayıncıya özel oda, izleyici kimliği
                    ve TikTok bağlantısı sonraki fazda devreye alınır. Oyun ekranında hediye talebi
                    gösterilmez.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-12">
          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-3xl border border-[#e9e1d5] bg-white p-6 shadow-card sm:p-8">
              <h2 className="text-xl font-bold tracking-tight text-ink-950">Nasıl oynanır?</h2>
              <div className="mt-5 space-y-3">
                {game.howTo.map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f7f2e9] text-[11px] font-bold text-brand-700">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-[12px] leading-relaxed text-ink-600">{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-1.5">
                {game.controls.map((control) => (
                  <span key={control} className="rounded-full bg-[#f7f2e9] px-2.5 py-1 text-[10px] font-medium text-ink-500">
                    {control}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-[#fffaf0] p-6 shadow-card sm:p-8">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-600" />
                <h2 className="text-lg font-bold text-amber-950">Yayın öncesi uyarılar</h2>
              </div>
              <ul className="mt-4 space-y-2.5">
                {game.warnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-900/75">
                    <Info size={12} className="mt-0.5 shrink-0 text-amber-600" />
                    {warning}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-amber-200/70 pt-3 text-[10px] leading-relaxed text-amber-900/55">
                Oyun bir eğlence aracıdır; TikTok, YouTube veya Twitch tarafından onaylanmış
                değildir. Yayın kısıtlaması ve ihlal riski yayıncıya aittir.
              </p>
            </div>
          </div>
        </section>

        <section className="container-page py-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Oyun rehberi</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-950">İçeride neler var?</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-500">
                {game.name} sadece bir sahne değil; katılım, hediye ekonomisi, moderasyon ve yayın
                akışı birlikte çalışır. Aşağıdaki başlıklar yayına hazırlık için gereken tüm katmanları özetler.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <TrendingUp size={12} /> Etkileşim odaklı
            </span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {playbook.features.map((feature, index) => (
              <div key={feature.title} className="rounded-2xl border border-[#e9e1d5] bg-white p-5 shadow-card">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f7f2e9] text-[11px] font-bold text-brand-700">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink-950">{feature.title}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-[#eee7dc] bg-[#fffaf4] py-10">
          <div className="container-page grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-[#e9e1d5] bg-white p-6 shadow-card sm:p-8">
              <div className="flex items-center gap-2">
                <Wand2 size={18} className="text-brand-600" />
                <h2 className="text-xl font-bold tracking-tight text-ink-950">Yayıncı stratejileri</h2>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
                Aynı oyun, doğru akışla iki kat daha fazla etkileşim üretir. Yayın öncesi bu dört
                adımı uygulayın.
              </p>
              <div className="mt-5 space-y-3">
                {playbook.tips.map((tip, index) => (
                  <div key={tip} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                      {index + 1}
                    </span>
                    <p className="pt-0.5 text-[11px] leading-relaxed text-ink-600">{tip}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {playbook.commands.map((command) => (
                  <span key={command} className="rounded-full bg-[#f7f2e9] px-2.5 py-1 text-[10px] font-medium text-ink-500">
                    {command}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-[#e9e1d5] bg-white p-6 shadow-card sm:p-8">
              <div className="flex items-center gap-2">
                <ListChecks size={18} className="text-brand-600" />
                <h2 className="text-xl font-bold tracking-tight text-ink-950">Yayına hazırlık</h2>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  'Oyun lisansını seç ve yayın odasını aç.',
                  'OBS bağlantısını Browser Source olarak ekle.',
                  'Katılım komutlarını ve dili panelden ayarla.',
                  'Sohbet bağlantısını test et, ilk turu başlat.',
                  'Moderasyon ve ban listesini yayın öncesi kontrol et.',
                ].map((step, index) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    <p className="text-[11px] leading-relaxed text-ink-600">
                      <span className="font-semibold text-ink-800">{index + 1}.</span> {step}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#f7f2e9] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-ink-400">Tur süresi</p>
                  <p className="mt-1 text-lg font-bold text-ink-950">{game.durationSec}s</p>
                </div>
                <div className="rounded-xl bg-[#f7f2e9] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-ink-400">Kapasite</p>
                  <p className="mt-1 text-lg font-bold text-ink-950">{game.maxPlayers}</p>
                </div>
              </div>
              <Link to="/kurulum" className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700">
                Kurulum rehberini aç <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </section>

        <section className="container-page py-10">
          <div className="flex items-center gap-2">
            <CircleHelp size={18} className="text-brand-600" />
            <h2 className="text-2xl font-bold tracking-tight text-ink-950">Sık sorulan sorular</h2>
          </div>
          <div className="mt-5 grid gap-2 lg:grid-cols-2">
            {playbook.faq.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-[#e9e1d5] bg-white p-4 open:bg-[#fffaf4]">
                <summary className="cursor-pointer list-none text-[12px] font-semibold text-ink-800 marker:hidden">
                  {item.q}
                  <span className="float-right text-brand-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{item.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-6 grid gap-3 rounded-2xl border border-[#e9e1d5] bg-white p-5 sm:grid-cols-3">
            {[
              { icon: <Trophy size={15} />, title: 'Kazanan akışı', text: 'Tur sonunda kazanan sahne ve sohbette duyurulur; yeni tur otomatik başlar.' },
              { icon: <ShieldCheck size={15} />, title: 'Güvenli moderasyon', text: 'Ban listesi, sohbet filtresi ve yayıncı onayıyla istenmeyen etkileşim engellenir.' },
              { icon: <Radio size={15} />, title: 'Tek bağlantı', text: 'Aynı OBS sahnesi TikTok, YouTube ve Twitch yayınlarında kullanılabilir.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-brand-600">{item.icon}</span>
                <div>
                  <p className="text-[11px] font-bold text-ink-800">{item.title}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[#eee7dc] bg-[#fffaf4] py-12">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Platform</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-950">Diğer oyunlar</h2>
              </div>
              <Link to="/oyunlar" className="text-[11px] font-semibold text-brand-700 hover:text-brand-600">
                Tümünü gör →
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ARCADE_GAME_LIST.filter((item) => item.key !== game.key)
                .slice(0, 4)
                .map((item) => (
                  <ArcadeGameCard key={item.key} game={item} compact />
                ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
