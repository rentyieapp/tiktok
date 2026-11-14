import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Gamepad2,
  Globe2,
  Info,
  Languages,
  Lock,
  Palette,
  Save,
  Shield,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import type { GameDTO, Locale, TeamConfig, TeamCount } from '@shared/types';
import { LOCALES } from '@shared/types';
import { LOCALE_LABELS } from '@shared/languages';
import {
  DEFAULT_SETTINGS,
  makeDefaultTeams,
  TEAM_PRESETS,
  WIN_CONDITION_LABELS,
} from '@shared/defaults';
import { validateCommandConfig, type CommandIssue } from '@shared/commands';
import { useAuth } from '../../lib/auth';
import { useStudio } from '../../lib/studio';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { resizeTeams, applyPreset } from '../../lib/teams';
import { Button, Field, Modal, PageHeader, TeamCrest } from '../../components/ui';
import { TeamSummaryCard, TeamEditor } from '../../components/TeamEditor';

const STEPS = [
  { id: 0, label: 'Oyun adı', icon: Gamepad2 },
  { id: 1, label: 'Takım sayısı', icon: Users },
  { id: 2, label: 'Takımlar', icon: Shield },
  { id: 3, label: 'Özet', icon: CheckCircle2 },
];

const NAME_EXAMPLES = ["Ahmet'in Taraftar Savaşı", 'Champions Arena', 'Gece Yayını Savaşı'];

interface Draft {
  name: string;
  language: Locale;
  teamCount: TeamCount;
  teams: TeamConfig[];
}

function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem('tt.wizard.draft');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed.name || !parsed.teamCount || !Array.isArray(parsed.teams)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function teamCountCopy(count: TeamCount) {
  if (count === 2) return { title: '2 takım', subtitle: 'Hızlı ve net bir rekabet. Klasik 1v1.' };
  if (count === 4) return { title: '4 takım', subtitle: 'Dengeli kaos. Yayınlar için ideal.' };
  return { title: '8 takım', subtitle: 'Büyük arena. Taraftar savaşı tam gaz.' };
}

export function GameWizardPage() {
  const { me } = useAuth();
  const { game, commands, refresh } = useStudio();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const isEdit = Boolean(game);
  const maxTeams = me?.subscription?.maxTeams ?? 2;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(game?.gameName ?? '');
  const [language, setLanguage] = useState<Locale>(game?.language ?? 'tr');
  const [teamCount, setTeamCount] = useState<TeamCount>(game?.teamCount ?? 2);
  const [teams, setTeams] = useState<TeamConfig[]>(
    game?.teams.map(({ id: _id, ...team }) => team) ?? makeDefaultTeams(2, 'tr'),
  );
  const [saving, setSaving] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [draftTeam, setDraftTeam] = useState<TeamConfig | null>(null);
  const [created, setCreated] = useState<GameDTO | null>(null);
  const [serverIssues, setServerIssues] = useState<CommandIssue[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (game) {
      setName(game.gameName);
      setLanguage(game.language);
      setTeamCount(game.teamCount);
      setTeams(game.teams.map(({ id: _id, ...team }) => team));
      return;
    }
    const draft = loadDraft();
    if (draft) {
      setName(draft.name);
      setLanguage(draft.language);
      setTeamCount(draft.teamCount);
      setTeams(resizeTeams(draft.teams, draft.teamCount, draft.language));
    }
  }, [game]);

  // Yeni oyun taslağını tarayıcıda sakla; sayfa yenilenirse kaybolmasın.
  useEffect(() => {
    if (game) return;
    try {
      window.localStorage.setItem(
        'tt.wizard.draft',
        JSON.stringify({ name, language, teamCount, teams }),
      );
    } catch {
      /* yoksay */
    }
  }, [name, language, teamCount, teams, game]);

  const effectiveLanguage = language;
  const effectiveOverrides =
    commands && game && language === game.language ? commands.overrides : {};
  const issues = useMemo<CommandIssue[]>(
    () =>
      validateCommandConfig({
        language: effectiveLanguage,
        overrides: effectiveOverrides,
        teams,
      }),
    [effectiveLanguage, effectiveOverrides, teams],
  );

  const allIssues = [...issues, ...serverIssues.filter((serverIssue) =>
    !issues.some((issue) => issue.field === serverIssue.field && issue.message === serverIssue.message),
  )];

  const updateTeam = (next: TeamConfig) => {
    setTeams((current) => current.map((team) => (team.slot === next.slot ? next : team)));
    setServerIssues([]);
  };

  const openEditor = (slot: number) => {
    const team = teams.find((candidate) => candidate.slot === slot);
    if (!team) return;
    setDraftTeam({ ...team });
    setEditingSlot(slot);
  };

  const handleTeamCount = (count: TeamCount) => {
    if (count > maxTeams) return;
    setTeamCount(count);
    setTeams((current) => resizeTeams(current, count, language));
    setServerIssues([]);
  };

  const next = () => {
    if (step === 0 && name.trim().length < 2) {
      toastError('Oyun adı gerekli', 'En az 2 karakterlik bir isim gir.');
      return;
    }
    if (step === 2 && allIssues.length > 0) {
      toastError('Komut çakışmalarını çöz', allIssues[0]?.message);
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const save = async () => {
    setSaving(true);
    setServerIssues([]);
    try {
      const payload = {
        gameName: name.trim(),
        language,
        teamCount,
        teams: teams.map((team) => ({
          slot: team.slot,
          name: team.name.trim(),
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
          emblemUrl: team.emblemUrl ?? null,
          symbol: team.symbol.trim() || '⭐',
          soldierLook: team.soldierLook,
          castleLook: team.castleLook,
          joinCommand: team.joinCommand.trim(),
          description: team.description.trim(),
        })),
      };
      const result = game
        ? await api.put<{ game: GameDTO; publicUrl: string; pendingApply: boolean }>('/api/game', payload)
        : await api.post<{ game: GameDTO; publicUrl: string; pendingApply: boolean }>('/api/game', payload);
      await refresh();
      try {
        window.localStorage.removeItem('tt.wizard.draft');
      } catch {
        /* yoksay */
      }
      if (!game) {
        setCreated(result.game);
        success('Oyunun hazır!', 'Kalıcı yayın bağlantın oluşturuldu ve stüdyon açıldı.');
        navigate('/panel/yayin', { replace: true });
        return;
      }
      success(
        'Değişiklikler kaydedildi',
        result.pendingApply
          ? 'Aktif maç var. Yeni ayarlar bir sonraki turda uygulanacak.'
          : 'Oyun ayarların güncellendi.',
      );
      setStep(3);
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.details) {
        const mapped = Object.entries(apiError.details).flatMap(([field, messages]) =>
          messages.map((message) => ({ field, code: 'SERVER', message })),
        );
        setServerIssues(mapped);
        const teamField = mapped.find((issue) => issue.field.startsWith('teams.'));
        if (teamField) {
          const slot = Number(teamField.field.split('.')[1]);
          if (Number.isFinite(slot)) openEditor(slot);
        }
      }
      toastError(
        'Kaydedilemedi',
        caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Lütfen tekrar dene.',
      );
    } finally {
      setSaving(false);
    }
  };

  const teamCountValid = (count: TeamCount) => count <= maxTeams;
  const commandPreview = teams
    .map((team) => `${team.joinCommand}`)
    .filter(Boolean)
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        eyebrow={isEdit ? 'Stüdyo' : 'İlk kurulum'}
        title={isEdit ? 'Oyununu düzenle' : 'Oyununu oluştur'}
        description={
          isEdit
            ? 'İsim, dil, takım sayısı ve takım kimliklerini güncelle. Yayın bağlantın değişmez; aktif maç varsa değişiklikler sonraki turda uygulanır.'
            : 'Dört adımda kendi arenanı kur. Takımlar, renkler ve komutlar tamamen sana ait; hiçbir isim veya renk motora gömülü değil.'
        }
        actions={
          isEdit ? (
            <Link to="/panel">
              <Button variant="secondary" icon={<ArrowLeft size={15} />}>
                Panele dön
              </Button>
            </Link>
          ) : (
            <span className="badge-neutral">
              <Sparkles size={11} /> ~2 dakika
            </span>
          )
        }
      />

      {/* Adımlar */}
      <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-2 shadow-card">
        <ol className="grid grid-cols-4 gap-1">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const active = step === index;
            const done = step > index;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (index < step) setStep(index);
                  }}
                  className={`flex w-full flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition sm:flex-row sm:justify-center sm:gap-2 sm:text-left ${
                    active
                      ? 'bg-ink-900 text-white'
                      : done
                        ? 'text-brand-700 hover:bg-brand-50'
                        : 'text-ink-400'
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${
                      active
                        ? 'bg-white/15 text-white'
                        : done
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-ink-100 text-ink-400'
                    }`}
                  >
                    {done ? <Check size={14} /> : <Icon size={14} />}
                  </span>
                  <span className="text-[11px] font-semibold sm:text-xs">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card card-pad min-w-0">
          {step === 0 ? (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Adım 1
                </span>
                <h2 className="mt-1 text-xl font-semibold text-ink-950">Arenana bir isim ver.</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                  Bu isim yayın ekranının üst kısmında görünür. Daha sonra değiştirebilirsin; yayın
                  bağlantın aynı kalır.
                </p>
              </div>

              <Field label="Oyun adı" hint="2-60 karakter. Marka veya kişi adı kullanabilirsin.">
                <input
                  className="input text-base"
                  value={name}
                  maxLength={60}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Örn. Ahmet'in Taraftar Savaşı"
                  autoFocus
                />
              </Field>

              <div>
                <p className="mb-2 text-[11px] font-medium text-ink-500">Bazı örnekler</p>
                <div className="flex flex-wrap gap-2">
                  {NAME_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setName(example)}
                      className="rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1.5 text-[11px] text-ink-600 transition hover:border-ink-300 hover:bg-white"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-800">
                  <Languages size={14} /> Oyun dili
                </p>
                <p className="mb-3 text-xs leading-relaxed text-ink-500">
                  Sistem komutları ve yayın ekranı bu dilde görünür. Daha sonra değiştirebilirsin.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LOCALES.map((locale) => {
                    const active = language === locale;
                    const info = LOCALE_LABELS[locale];
                    return (
                      <button
                        key={locale}
                        type="button"
                        onClick={() => setLanguage(locale)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                          active
                            ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500'
                            : 'border-ink-200 bg-white hover:border-ink-300'
                        }`}
                      >
                        <span className="text-lg">{info.flag}</span>
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold text-ink-900">{info.native}</span>
                          <span className="block text-[10px] text-ink-400">{info.code}</span>
                        </span>
                        {active ? <Check size={13} className="ml-auto text-brand-600" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Adım 2
                </span>
                <h2 className="mt-1 text-xl font-semibold text-ink-950">Kaç takım savaşsın?</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                  Takım sayısı özelleştirme ekranını belirler. Paketin en fazla{' '}
                  <span className="font-semibold text-ink-800">{maxTeams} takım</span> destekliyor.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {([2, 4, 8] as TeamCount[]).map((count) => {
                  const allowed = teamCountValid(count);
                  const active = teamCount === count;
                  const copy = teamCountCopy(count);
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={!allowed}
                      onClick={() => handleTeamCount(count)}
                      className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500'
                          : allowed
                            ? 'border-ink-200 bg-white hover:border-ink-300'
                            : 'cursor-not-allowed border-ink-100 bg-ink-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-display text-2xl font-bold text-ink-950">{copy.title}</p>
                        {active ? (
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-white">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        ) : null}
                        {!allowed ? <Lock size={14} className="text-ink-400" /> : null}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">{copy.subtitle}</p>
                      <div className="mt-3 flex -space-x-2">
                        {makeDefaultTeams(count, language).map((team) => (
                          <span
                            key={team.slot}
                            className="grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[11px] shadow-sm"
                            style={{ background: `${team.primaryColor}33` }}
                          >
                            {team.symbol}
                          </span>
                        ))}
                      </div>
                      {!allowed ? (
                        <span className="mt-3 text-[10px] font-semibold text-amber-700">
                          Paketini yükselt
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50/60 p-3.5 text-[11px] leading-relaxed text-ink-500">
                <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
                Takım sayısını daha sonra paketin izin verdiği ölçüde değiştirebilirsin. Mevcut takım
                kimlikleri korunur; yayın URL’n değişmez.
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                    Adım 3
                  </span>
                  <h2 className="mt-1 text-xl font-semibold text-ink-950">Takımlarını tasarla.</h2>
                  <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-500">
                    Her takımın adı, renkleri, sembolü, arması, asker/kale görünümü ve katılma
                    komutu var. Hazır paletten başlayıp tamamen değiştirebilirsin.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Palette size={13} />}
                  onClick={() =>
                    setTeams((current) =>
                      current.map((team, index) =>
                        applyPreset(team, TEAM_PRESETS[index % TEAM_PRESETS.length]),
                      ),
                    )
                  }
                >
                  Hazır paleti uygula
                </Button>
              </div>

              {allIssues.length > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <p className="text-[12px] font-semibold text-red-800">
                    Çözülmesi gereken {allIssues.length} komut sorunu var
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-red-700">
                    {allIssues.slice(0, 4).map((issue) => (
                      <li key={`${issue.field}-${issue.code}`}>• {issue.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3.5 py-2.5 text-[11px] text-brand-800">
                  <CheckCircle2 size={14} /> Komutlar birbiriyle çakışmıyor.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {teams.map((team) => (
                  <TeamSummaryCard
                    key={team.slot}
                    team={team}
                    language={language}
                    onEdit={() => openEditor(team.slot)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Adım 4
                </span>
                <h2 className="mt-1 text-xl font-semibold text-ink-950">Her şey hazır mı?</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                  {isEdit
                    ? 'Kaydettiğinde ayarlar veritabanına yazılır. Yayın bağlantın sabit kalır.'
                    : 'Oyunu oluşturduğunda kalıcı yayın bağlantın üretilir ve stüdyon açılır.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Oyun</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {LOCALE_LABELS[language].flag} {LOCALE_LABELS[language].native} · {teamCount} takım
                  </p>
                </div>
                <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Tur</p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">
                    {game?.settings.roundDurationSec ?? DEFAULT_SETTINGS.roundDurationSec} saniye
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {WIN_CONDITION_LABELS[game?.settings.winCondition ?? DEFAULT_SETTINGS.winCondition].title}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-ink-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-ink-50 text-[10px] uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-4 py-2.5">Takım</th>
                      <th className="px-4 py-2.5">Renkler</th>
                      <th className="px-4 py-2.5">Komut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 bg-white">
                    {teams.map((team) => (
                      <tr key={team.slot}>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2 font-medium text-ink-800">
                            <TeamCrest symbol={team.symbol} emblemUrl={team.emblemUrl} color={team.primaryColor} size={24} />
                            {team.name}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="flex gap-1">
                            <span className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10" style={{ background: team.primaryColor }} />
                            <span className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10" style={{ background: team.secondaryColor }} />
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-ink-600">!{team.joinCommand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50/60 p-3.5 text-[11px] leading-relaxed text-ink-500">
                <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
                {isEdit ? (
                  <>Yayın URL’n değişmez. Oyun ayarlarını kaydettikten sonra takımlar ve komutlar
                  için ayrı sayfaları da kullanabilirsin.</>
                ) : (
                  <>Oyun oluşturulduktan sonra tur süresi, kale canı, komutlar ve daha fazlasını
                  stüdyodan düzenleyebilirsin.</>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="brand" size="lg" loading={saving} icon={<Save size={16} />} onClick={() => void save()}>
                  {isEdit ? 'Değişiklikleri kaydet' : 'Oyunu oluştur'}
                </Button>
                <Button variant="secondary" size="lg" onClick={() => setShowPreview(true)}>
                  9:16 önizleme
                </Button>
              </div>
            </div>
          ) : null}

          {step < 3 ? (
            <div className="mt-7 flex items-center justify-between border-t border-ink-100 pt-5">
              <Button
                variant="ghost"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                icon={<ArrowLeft size={15} />}
              >
                Geri
              </Button>
              <Button variant="primary" onClick={next} icon={<ArrowRight size={15} />}>
                Devam et
              </Button>
            </div>
          ) : null}
        </div>

        {/* Sağ özet */}
        <aside className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
            <div className="relative bg-ink-950 px-5 py-4 text-white">
              <div className="absolute inset-0 bg-marketing-grid opacity-40" />
              <div className="relative">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Yayın kartı
                </p>
                <p className="mt-1 truncate text-sm font-semibold">{name || 'Oyunun adı'}</p>
                <p className="mt-0.5 text-[10px] text-white/40">
                  {LOCALE_LABELS[language].native} · {teamCount} takım
                </p>
              </div>
            </div>
            <div className="space-y-2 p-4">
              {teams.slice(0, 4).map((team) => (
                <div key={team.slot} className="flex items-center gap-2.5 rounded-xl border border-ink-100 p-2">
                  <TeamCrest symbol={team.symbol} emblemUrl={team.emblemUrl} color={team.primaryColor} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-ink-800">{team.name}</p>
                    <p className="truncate font-mono text-[9px] text-ink-400">!{team.joinCommand}</p>
                  </div>
                  <span className="h-2 w-2 rounded-full" style={{ background: team.primaryColor }} />
                </div>
              ))}
              <p className="pt-1 text-[10px] leading-relaxed text-ink-400">
                İzleyiciler yayın sohbetinden bu komutlarla takımlara katılır.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-200/60 bg-brand-50/50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-800">
              <Lock size={12} /> Kalıcı bağlantı
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-brand-800/70">
              {isEdit && game
                ? `/live/${game.publicSlug}`
                : 'Oyun oluşturulunca tahmin edilemez, kalıcı bir /live adresi üretilir.'}
            </p>
            {isEdit ? (
              <Link to="/panel/yayin" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-600">
                Yayın sayfasına git <ChevronRight size={12} />
              </Link>
            ) : null}
          </div>
        </aside>
      </div>

      {/* Takım düzenleme */}
      <Modal
        open={editingSlot !== null && draftTeam !== null}
        onClose={() => {
          setEditingSlot(null);
          setDraftTeam(null);
        }}
        title={draftTeam ? `Takım ${draftTeam.slot} düzenle` : 'Takım düzenle'}
        description="Tüm değişiklikler kalıcı olarak kaydedilmeden önce burada test edilir."
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setEditingSlot(null);
                setDraftTeam(null);
              }}
            >
              Vazgeç
            </Button>
            <Button
              variant="brand"
              icon={<Check size={15} />}
              disabled={Boolean(
                draftTeam &&
                  allIssues.some((issue) => issue.field.startsWith(`teams.${draftTeam.slot}.`)),
              )}
              onClick={() => {
                if (draftTeam) updateTeam(draftTeam);
                setEditingSlot(null);
                setDraftTeam(null);
              }}
            >
              Takımı uygula
            </Button>
          </>
        }
      >
        {draftTeam ? (
          <TeamEditor
            key={draftTeam.slot}
            team={draftTeam}
            language={language}
            issues={allIssues.filter((issue) => issue.field.startsWith(`teams.${draftTeam.slot}.`))}
            onChange={setDraftTeam}
          />
        ) : null}
      </Modal>

      {/* 9:16 önizleme (statik kart) */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Yayın kartı önizlemesi"
        description="Gerçek 3D önizleme oyun oluşturulduktan sonra Önizleme sayfasında açılır."
        size="sm"
      >
        <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[24px] border-4 border-ink-900 bg-ink-950 shadow-float">
          <div className="relative aspect-[9/16] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold text-white/80">{name || 'Oyun adı'}</p>
              <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[6px] font-bold text-red-300">
                <span className="h-1 w-1 rounded-full bg-red-400" /> CANLI
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {teams.map((team) => (
                <div key={team.slot} className="rounded-md border border-white/10 bg-white/5 p-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px]">{team.symbol}</span>
                    <span className="truncate text-[7px] font-semibold text-white/75">{team.name}</span>
                  </div>
                  <div className="mt-1 h-0.5 rounded-full bg-white/10">
                    <div className="h-full w-3/4 rounded-full" style={{ background: team.primaryColor }} />
                  </div>
                  <p className="mt-0.5 font-mono text-[5px] text-white/35">!{team.joinCommand}</p>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 top-1/2 text-center">
              <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">
                {game?.settings.roundDurationSec ?? 90} sn
              </span>
            </div>
            <div className="absolute inset-x-2 bottom-2 rounded-lg border border-white/10 bg-white/5 p-1.5">
              <p className="text-[6px] font-semibold uppercase tracking-wider text-brand-300">Takımına katıl</p>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {commandPreview.map((command) => (
                  <span key={command} className="rounded bg-black/40 px-1 py-0.5 font-mono text-[5px] text-white/50">
                    !{command}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Oluşturma başarılı */}
      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title="Arena hazır!"
        description="Oyunun ve kalıcı yayın bağlantın oluşturuldu. Şimdi takımlarını inceleyebilir veya yayın bağlantını OBS’e ekleyebilirsin."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate('/panel')}>
              Panele dön
            </Button>
            <Button variant="brand" onClick={() => navigate('/panel/yayin')} icon={<ArrowRight size={15} />}>
              Yayın bağlantıma git
            </Button>
          </>
        }
      >
        {created ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                <Gamepad2 size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{created.gameName}</p>
                <p className="text-[11px] text-ink-500">
                  {created.teamCount} takım · {created.language.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-ink-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Yayın adresin</p>
              <p className="mt-1 break-all font-mono text-[11px] text-ink-700">
                {window.location.origin}/live/{created.publicSlug}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
