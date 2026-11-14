import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Globe2,
  Info,
  Languages,
  AlertCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  Swords,
  Terminal,
} from 'lucide-react';
import type { Locale, SystemCommand, TeamConfig } from '@shared/types';
import { LOCALES } from '@shared/types';
import {
  COMMAND_DICTIONARY,
  LOCALE_LABELS,
  SYSTEM_COMMAND_ORDER,
  defaultPhrasesFor,
  liveUi,
} from '@shared/languages';
import {
  buildCommandSheet,
  effectiveSystemCommands,
  validateCommandConfig,
  type CommandIssue,
} from '@shared/commands';
import { useStudio } from '../../lib/studio';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, PageHeader, SectionCard, TeamCrest } from '../../components/ui';

function issuesFor(issues: CommandIssue[], field: string): string | undefined {
  return issues.find((issue) => issue.field === field)?.message;
}

export function CommandsPage() {
  const { game, commands, refresh, pendingApply } = useStudio();
  const { success, error: toastError, toast } = useToast();
  const [language, setLanguage] = useState<Locale>(game?.language ?? 'tr');
  const [values, setValues] = useState<Record<string, string>>({});
  const [teamCommands, setTeamCommands] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverIssues, setServerIssues] = useState<CommandIssue[]>([]);

  useEffect(() => {
    if (!game) return;
    setLanguage(game.language);
    const effective = effectiveSystemCommands(game.language, commands?.overrides ?? {});
    const initial: Record<string, string> = {};
    for (const action of SYSTEM_COMMAND_ORDER) initial[action] = effective[action].command;
    setValues(initial);
    const commandsBySlot: Record<number, string> = {};
    for (const team of game.teams) commandsBySlot[team.slot] = team.joinCommand;
    setTeamCommands(commandsBySlot);
  }, [game, commands]);

  const defaultFor = (action: SystemCommand, locale: Locale) =>
    defaultPhrasesFor(locale, action)[0] ?? '';

  const overrides = useMemo(() => {
    const result: Partial<Record<SystemCommand, string>> = {};
    for (const action of SYSTEM_COMMAND_ORDER) {
      const value = values[action]?.trim() ?? '';
      if (value && value !== defaultFor(action, language)) {
        result[action] = value;
      }
    }
    return result;
  }, [values, language]);

  const teams: TeamConfig[] = useMemo(
    () =>
      (game?.teams ?? []).map((team) => ({
        slot: team.slot,
        name: team.name,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        emblemUrl: team.emblemUrl,
        symbol: team.symbol,
        soldierLook: team.soldierLook,
        castleLook: team.castleLook,
        joinCommand: teamCommands[team.slot] ?? team.joinCommand,
        description: team.description,
      })),
    [game, teamCommands],
  );

  const emptyFields = SYSTEM_COMMAND_ORDER.filter((action) => !values[action]?.trim());
  const localIssues = useMemo(
    () => validateCommandConfig({ language, overrides, teams }),
    [language, overrides, teams],
  );
  const allIssues = [...localIssues, ...serverIssues];
  const ui = liveUi(language);

  const sheet = useMemo(
    () => buildCommandSheet(language, teams, overrides),
    [language, teams, overrides],
  );

  const dirty = useMemo(() => {
    if (!game) return false;
    const languageChanged = language !== game.language;
    const baseOverrides = commands?.overrides ?? {};
    const overridesChanged = JSON.stringify(overrides) !== JSON.stringify(baseOverrides);
    const teamsChanged = teams.some((team) => {
      const original = game.teams.find((candidate) => candidate.slot === team.slot);
      return original?.joinCommand !== team.joinCommand;
    });
    return languageChanged || overridesChanged || teamsChanged;
  }, [game, commands, language, overrides, teams]);

  const switchLanguage = (next: Locale) => {
    if (!game || next === language) return;
    setLanguage(next);
    const effective = effectiveSystemCommands(next, {});
    const nextValues: Record<string, string> = {};
    for (const action of SYSTEM_COMMAND_ORDER) nextValues[action] = effective[action].command;
    setValues(nextValues);
    setServerIssues([]);
    toast('Dil değiştirildi', {
      kind: 'info',
      description: 'Sistem komutları yeni dile çevrildi. Özel yazımlar sıfırlandı; kaydetmeyi unutma.',
    });
  };

  const save = async () => {
    if (!game) return;
    if (emptyFields.length > 0) {
      toastError('Boş komut var', 'Sistem komutları boş bırakılamaz.');
      return;
    }
    if (allIssues.length > 0) {
      toastError('Komut çakışmasını çöz', allIssues[0]?.message);
      return;
    }
    setSaving(true);
    setServerIssues([]);
    try {
      const result = await api.put<{ pendingApply: boolean }>('/api/game/commands', {
        language,
        overrides,
        teams: teams.map((team) => ({ slot: team.slot, joinCommand: team.joinCommand.trim() })),
      });
      await refresh();
      success(
        'Komutlar kaydedildi',
        result.pendingApply
          ? 'Canlı maç var. Yeni komutlar sonraki turda geçerli olacak.'
          : 'Sistem ve takım komutları güncellendi.',
      );
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.details) {
        setServerIssues(
          Object.entries(apiError.details).flatMap(([field, messages]) =>
            messages.map((message) => ({ field, code: 'SERVER', message })),
          ),
        );
      }
      toastError(
        'Komutlar kaydedilemedi',
        caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Tekrar dene.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!game) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Stüdyo"
        title="Dil ve komut ayarları"
        description="Sistem işlemleri sabittir; izleyicinin gördüğü komut yazımları dile göre değişir. Yayıncı, kendi komutlarını ve takım komutlarını özelleştirebilir."
        actions={
          <span className="badge-neutral">
            <Globe2 size={11} /> {LOCALE_LABELS[language].native}
          </span>
        }
      />

      {pendingApply ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12px] leading-relaxed text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          Canlı maç sürerken komut değişiklikleri kaydedilebilir; mevcut maç etkilenmez ve yeni
          komutlar sonraki turda devreye girer.
        </div>
      ) : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            title="Oyun dili"
            description="Seçilen dil yayın ekranındaki komutları ve sistem mesajlarını çevirir."
            icon={<Languages size={17} />}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {LOCALES.map((locale) => {
                const info = LOCALE_LABELS[locale];
                const active = language === locale;
                return (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => switchLanguage(locale)}
                    className={`relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition ${
                      active
                        ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
                        : 'border-ink-200 bg-white hover:border-ink-300'
                    }`}
                  >
                    <span className="text-xl">{info.flag}</span>
                    <span className="text-[11px] font-semibold text-ink-800">{info.native}</span>
                    <span className="text-[9px] uppercase tracking-wider text-ink-400">{info.code}</span>
                    {active ? (
                      <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-white">
                        <Check size={9} strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">
              <Info size={13} className="mt-0.5 shrink-0 text-brand-600" />
              Dil değişince sistem komutları o dilin varsayılanlarına döner. Özel yazımlarını
              korumak istiyorsan dili en son değiştir.
            </div>
          </SectionCard>

          <SectionCard
            title="Sistem komutları"
            description="Bu beş işlem silinemez. Yalnızca izleyicinin yazacağı komutu değiştirebilirsin."
            icon={<Terminal size={17} />}
          >
            <div className="space-y-2.5">
              {SYSTEM_COMMAND_ORDER.map((action) => {
                const definition = COMMAND_DICTIONARY[language][action];
                const field = `system.${action}`;
                const error = issuesFor(allIssues, field);
                const isCustom = overrides[action] !== undefined;
                const value = values[action] ?? '';
                const empty = !value.trim();
                return (
                  <div
                    key={action}
                    className="rounded-xl border border-ink-100 bg-white p-3.5 transition hover:border-ink-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-ink-900 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-white">
                            {action}
                          </span>
                          {isCustom ? (
                            <span className="badge-warn text-[9px]">Özel</span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-[12px] font-medium text-ink-800">{definition.label}</p>
                        <p className="mt-0.5 text-[10px] text-ink-400">
                          Varsayılan: <span className="font-mono">!{defaultFor(action, language)}</span>
                          {definition.phrases.length > 1
                            ? ` · Alternatif: ${definition.phrases.slice(1).map((phrase) => `!${phrase}`).join(', ')}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex w-full items-start gap-2 sm:w-auto">
                        <div className="min-w-0 flex-1">
                          <div
                            className={`flex items-center rounded-lg border bg-white ${
                              error || empty ? 'border-red-300' : 'border-ink-200'
                            } focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10`}
                          >
                            <span className="grid h-9 w-7 place-items-center rounded-l-lg bg-ink-50 font-mono text-xs text-ink-500">
                              !
                            </span>
                            <input
                              className="w-full min-w-0 rounded-r-lg border-0 bg-transparent px-2 py-2 font-mono text-xs text-ink-900 outline-none sm:w-[140px]"
                              value={value}
                              maxLength={24}
                              onChange={(event) => {
                                setValues((current) => ({ ...current, [action]: event.target.value }));
                                setServerIssues([]);
                              }}
                              aria-label={`${definition.label} komutu`}
                            />
                          </div>
                          {error || empty ? (
                            <p className="mt-1 max-w-[220px] text-[10px] text-red-600">
                              {error ?? 'Komut boş olamaz.'}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={!isCustom}
                          onClick={() =>
                            setValues((current) => ({
                              ...current,
                              [action]: defaultFor(action, language),
                            }))
                          }
                          className="mt-1 rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
                          title="Varsayılana dön"
                          aria-label={`${definition.label} komutunu sıfırla`}
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-[11px] leading-relaxed text-ink-500">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-brand-600" />
              İşlem kimlikleri (JOIN_TEAM, LEAVE_TEAM, HELP, SHOW_SCORE, CHANGE_TEAM) sabittir.
              Komutlar normalize edilir: büyük/küçük harf, Türkçe I/İ, aksan ve boşluk farkları
              yok sayılır.
            </div>
          </SectionCard>

          <SectionCard
            title="Takım komutları"
            description="Her takımın katılma komutu benzersiz olmalı ve sistem komutlarıyla çakışmamalı."
            icon={<Swords size={17} />}
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              {teams.map((team) => {
                const field = `teams.${team.slot}.joinCommand`;
                const error = issuesFor(allIssues, field);
                return (
                  <div key={team.slot} className="rounded-xl border border-ink-100 p-3">
                    <div className="flex items-center gap-2.5">
                      <TeamCrest symbol={team.symbol} emblemUrl={team.emblemUrl} color={team.primaryColor} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-ink-800">{team.name}</p>
                        <p className="text-[10px] text-ink-400">Takım {team.slot}</p>
                      </div>
                    </div>
                    <div
                      className={`mt-2.5 flex items-center rounded-lg border bg-white ${
                        error ? 'border-red-300' : 'border-ink-200'
                      } focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10`}
                    >
                      <span className="grid h-9 w-7 place-items-center rounded-l-lg bg-ink-50 font-mono text-xs text-ink-500">
                        !
                      </span>
                      <input
                        className="min-w-0 flex-1 rounded-r-lg border-0 bg-transparent px-2 py-2 font-mono text-xs uppercase text-ink-900 outline-none"
                        value={teamCommands[team.slot] ?? ''}
                        maxLength={24}
                        onChange={(event) =>
                          setTeamCommands((current) => ({
                            ...current,
                            [team.slot]: event.target.value.toLocaleUpperCase('tr-TR'),
                          }))
                        }
                        aria-label={`${team.name} katılma komutu`}
                      />
                    </div>
                    {error ? <p className="mt-1 text-[10px] text-red-600">{error}</p> : null}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white/95 p-4 shadow-float backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] text-ink-500">
              {dirty ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Kaydedilmemiş komut değişikliği
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Komutlar güncel
                </>
              )}
            </div>
            <Button
              variant="brand"
              icon={<Save size={15} />}
              loading={saving}
              disabled={!dirty}
              onClick={() => void save()}
            >
              Komutları kaydet
            </Button>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-950 text-white shadow-float">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">
                <Terminal size={11} /> Yayın ekranı önizlemesi
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                {LOCALE_LABELS[language].flag} {LOCALE_LABELS[language].native} · {ui.commands}
              </p>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/30">
                  Takıma katıl
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {sheet.teams.map((team) => (
                    <div
                      key={team.slot}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
                      style={{ boxShadow: `inset 0 -2px 0 ${team.color}` }}
                    >
                      <p className="truncate text-[10px] font-semibold text-white/70">{team.teamName}</p>
                      <p className="truncate font-mono text-[9px] text-white/35">!{team.command}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 border-t border-white/10 pt-3">
                {sheet.system.map((row) => (
                  <div key={row.action} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white/40">{row.label}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                      !{row.command}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-1.5 rounded-lg bg-brand-400/10 p-2 text-[9px] leading-relaxed text-brand-200/70">
                <Info size={10} className="mt-0.5 shrink-0" />
                Ekranda yalnızca izleyicinin kullanabileceği komutlar gösterilir.
              </div>
            </div>
          </div>

          <SectionCard
            title="Çakışma kontrolü"
            icon={allIssues.length > 0 ? <AlertCircle size={16} /> : <Check size={16} />}
          >
            {allIssues.length === 0 ? (
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-700">
                <Check size={13} className="mt-0.5 shrink-0" />
                Tüm komutlar benzersiz. Aynı normalize edilmiş yazım iki işleve bağlı değil.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {allIssues.map((issue, index) => (
                  <li
                    key={`${issue.field}-${index}`}
                    className="flex items-start gap-1.5 text-[11px] leading-relaxed text-red-600"
                  >
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Komut kuralları" icon={<ShieldCheck size={16} />}>
            <ul className="space-y-2 text-[11px] leading-relaxed text-ink-500">
              {[
                'Komutlar 2-24 karakter; harf, rakam, tire ve alt çizgi.',
                'Büyük/küçük harf, aksan, Türkçe I/İ ve boşluk normalize edilir.',
                'Takım komutları sistem komutlarıyla çakışamaz.',
                'Aynı izleyici aynı anda yalnızca bir takımda olabilir.',
                'Spam koruması ve komut bekleme süresi sunucuda uygulanır.',
              ].map((rule) => (
                <li key={rule} className="flex items-start gap-2">
                  <Check size={11} className="mt-0.5 shrink-0 text-brand-600" />
                  {rule}
                </li>
              ))}
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
