import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Castle,
  Check,
  Copy,
  ImagePlus,
  Loader2,
  Palette,
  Shield,
  Sword,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Locale, SoldierLook, CastleLook, TeamConfig } from '@shared/types';
import { liveUi } from '@shared/languages';
import { CASTLE_LOOK_LABELS, SOLDIER_LOOK_LABELS, SYMBOL_OPTIONS } from '@shared/defaults';
import type { CommandIssue } from '@shared/commands';
import { api, ApiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { Button, Field, TeamCrest } from './ui';

const SOLDIER_OPTIONS: SoldierLook[] = ['knight', 'warrior', 'archer', 'guard'];
const CASTLE_OPTIONS: CastleLook[] = ['classic', 'tower', 'fortress'];

function issuesFor(issues: CommandIssue[], slot: number, field: string): string | undefined {
  return issues.find((issue) => issue.field === `teams.${slot}.${field}`)?.message;
}

export function TeamEditor({
  team,
  language,
  issues,
  onChange,
}: {
  team: TeamConfig;
  language: Locale;
  issues: CommandIssue[];
  onChange: (team: TeamConfig) => void;
}) {
  const ui = liveUi(language);
  const { success, error } = useToast();
  const [uploading, setUploading] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameError = issuesFor(issues, team.slot, 'name');
  const commandError = issuesFor(issues, team.slot, 'joinCommand');

  const update = (patch: Partial<TeamConfig>) => {
    onChange({ ...team, ...patch });
  };

  const upload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      error('Görsel çok büyük', 'Amblem en fazla 2 MB olabilir.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await api.upload<{ url: string }>('/api/uploads/emblem', form);
      update({ emblemUrl: result.url });
      success('Amblem yüklendi', 'Görsel takımına kaydedildi.');
    } catch (caught) {
      error(
        'Amblem yüklenemedi',
        caught instanceof ApiError ? caught.message : 'PNG, JPEG veya WebP dene.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div
        className="relative overflow-hidden rounded-2xl border border-ink-100 p-4"
        style={{
          background: `linear-gradient(120deg, ${team.primaryColor}22, transparent 55%), linear-gradient(300deg, ${team.secondaryColor}18, transparent 60%)`,
        }}
      >
        <div className="flex items-center gap-3">
          <TeamCrest symbol={team.symbol} emblemUrl={team.emblemUrl} color={team.primaryColor} size={52} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Takım {team.slot}
            </p>
            <p className="truncate text-base font-semibold text-ink-900">{team.name || 'İsimsiz takım'}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[11px] text-ink-500">
              <span className="rounded bg-ink-900 px-1.5 py-0.5 text-[9px] font-bold text-white">!</span>
              {team.joinCommand || 'komut'}
            </p>
          </div>
          <div className="ml-auto hidden items-center gap-1.5 sm:flex">
            <span className="h-6 w-6 rounded-lg ring-1 ring-inset ring-black/10" style={{ background: team.primaryColor }} />
            <span className="h-6 w-6 rounded-lg ring-1 ring-inset ring-black/10" style={{ background: team.secondaryColor }} />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-ink-500">
          Bu kart, OBS ekranındaki takım görünümünü temsil eder: {team.symbol} {team.name} · {ui.joinWith}{' '}
          <span className="font-mono">
            !{team.joinCommand || '...'}
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Takım adı" error={nameError}>
          <input
            className="input"
            value={team.name}
            maxLength={40}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="Örn. Aslan"
          />
        </Field>
        <Field
          label="Katılma komutu"
          error={commandError}
          hint="İzleyici bu komutu yazarak takıma katılır. Boşluk yerine tire kullan."
        >
          <div className="flex items-center rounded-xl border border-ink-200 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10">
            <span className="grid h-[42px] w-9 place-items-center rounded-l-xl bg-ink-50 font-mono text-sm text-ink-500">
              !
            </span>
            <input
              className="min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-2.5 py-2.5 font-mono text-sm text-ink-900 outline-none placeholder:text-ink-400"
              value={team.joinCommand}
              maxLength={24}
              onChange={(event) => update({ joinCommand: event.target.value.toLocaleUpperCase('tr-TR') })}
              placeholder="ASLAN"
            />
          </div>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField
          label="Ana renk"
          value={team.primaryColor}
          onChange={(value) => update({ primaryColor: value })}
        />
        <ColorField
          label="İkincil renk"
          value={team.secondaryColor}
          onChange={(value) => update({ secondaryColor: value })}
        />
      </div>

      <Field label="Takım simgesi / hayvan sembolü">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSymbols((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-200 bg-ink-50 text-xl transition hover:border-ink-300"
            aria-label="Sembol seç"
          >
            {team.symbol || '⭐'}
          </button>
          <input
            className="input max-w-[110px] text-center text-lg"
            value={team.symbol}
            maxLength={8}
            onChange={(event) => update({ symbol: event.target.value })}
            aria-label="Özel sembol"
          />
          <span className="text-[11px] text-ink-400">Emoji veya tek karakter yazabilirsin.</span>
        </div>
        {showSymbols ? (
          <div className="mt-3 grid grid-cols-8 gap-1.5 rounded-xl border border-ink-100 bg-ink-50/60 p-2.5 sm:grid-cols-12">
            {SYMBOL_OPTIONS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => {
                  update({ symbol });
                  setShowSymbols(false);
                }}
                className={`grid h-9 w-9 place-items-center rounded-lg text-lg transition hover:bg-white ${
                  team.symbol === symbol ? 'bg-white shadow ring-1 ring-brand-400' : ''
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        ) : null}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="label flex items-center gap-1.5">
            <Sword size={13} /> Asker görünümü
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SOLDIER_OPTIONS.map((look) => (
              <button
                key={look}
                type="button"
                onClick={() => update({ soldierLook: look })}
                className={`rounded-xl border px-2.5 py-2 text-[12px] font-medium transition ${
                  team.soldierLook === look
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                }`}
              >
                {SOLDIER_LOOK_LABELS[look]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label flex items-center gap-1.5">
            <Castle size={13} /> Kale görünümü
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CASTLE_OPTIONS.map((look) => (
              <button
                key={look}
                type="button"
                onClick={() => update({ castleLook: look })}
                className={`rounded-xl border px-2 py-2 text-[11px] font-medium transition ${
                  team.castleLook === look
                    ? 'border-ink-900 bg-ink-900 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                }`}
              >
                {CASTLE_LOOK_LABELS[look]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Field
        label="Takım arması"
        hint="Kendi tasarımını yükle veya https:// ile başlayan bir görsel adresi gir. Lisans gerektiren resmî kulüp armalarını kullanma."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <TeamCrest
              symbol={team.symbol}
              emblemUrl={team.emblemUrl}
              color={team.primaryColor}
              size={56}
              className="border border-ink-100"
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Yükleniyor...' : 'Görsel yükle'}
                </Button>
                {team.emblemUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={13} />}
                    onClick={() => update({ emblemUrl: null })}
                  >
                    Kaldır
                  </Button>
                ) : null}
              </div>
              <p className="text-[10px] text-ink-400">PNG, JPEG, WebP · en fazla 2 MB</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />
          <div className="flex-1">
            <input
              className="input text-xs"
              value={team.emblemUrl ?? ''}
              onChange={(event) => update({ emblemUrl: event.target.value.trim() || null })}
              placeholder="https://... veya yüklenen görsel yolu"
            />
            <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-400">
              <ImagePlus size={11} /> Görselin kullanım hakkı sana ait olmalı.
            </p>
          </div>
        </div>
      </Field>

      <Field label="Takım açıklaması" hint="İzleyicilere takımını tanıtan kısa bir metin.">
        <textarea
          className="textarea"
          rows={2}
          maxLength={200}
          value={team.description}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Örn. Sahaya kükreyerek çıkan cesur taraftarlar."
        />
      </Field>

      {issues.filter((issue) => issue.field.startsWith(`teams.${team.slot}.`)).length > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] leading-relaxed text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            {issues
              .filter((issue) => issue.field.startsWith(`teams.${team.slot}.`))
              .map((issue) => (
                <p key={`${issue.field}-${issue.code}`}>{issue.message}</p>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const [error, setError] = useState(false);
  useEffect(() => {
    setText(value);
    setError(false);
  }, [value]);
  const commit = (next: string) => {
    const normalized = next.startsWith('#') ? next : `#${next}`;
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      setError(false);
      setText(normalized);
      onChange(normalized);
    } else {
      setError(true);
      setText(next);
    }
  };
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        <Palette size={13} /> {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-ink-200 shadow-sm">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#10b981'}
            onChange={(event) => {
              setText(event.target.value);
              setError(false);
              onChange(event.target.value);
            }}
            className="absolute -inset-1 h-14 w-14 cursor-pointer"
            aria-label={`${label} seç`}
          />
        </div>
        <input
          className={`input font-mono text-xs ${error ? 'border-red-400' : ''}`}
          value={text}
          maxLength={7}
          onChange={(event) => commit(event.target.value)}
          aria-label={`${label} hex değeri`}
        />
      </div>
      {error ? <p className="field-error">#RRGGBB biçiminde gir.</p> : null}
    </div>
  );
}

export function TeamSummaryCard({
  team,
  language,
  onEdit,
  onCopy,
}: {
  team: TeamConfig;
  language: Locale;
  onEdit: () => void;
  onCopy?: () => void;
}) {
  const ui = liveUi(language);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-float">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-60"
        style={{ background: `linear-gradient(120deg, ${team.primaryColor}33, transparent 70%)` }}
      />
      <div className="relative flex items-start gap-3">
        <TeamCrest symbol={team.symbol} emblemUrl={team.emblemUrl} color={team.primaryColor} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-ink-950">{team.name}</p>
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-ink-400">
              Takım {team.slot}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-500">
            {team.description || 'Açıklama eklenmedi.'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-ink-50 px-2 py-1 font-mono text-[10px] text-ink-600">
              <span className="text-ink-400">!</span>
              {team.joinCommand}
            </span>
            {onCopy ? (
              <button
                type="button"
                onClick={onCopy}
                className="rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                aria-label="Komutu kopyala"
              >
                <Copy size={12} />
              </button>
            ) : null}
            <span className="ml-auto h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10" style={{ background: team.primaryColor }} />
            <span className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10" style={{ background: team.secondaryColor }} />
          </div>
        </div>
      </div>
      <div className="relative mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
        <span className="inline-flex items-center gap-1 text-[10px] text-ink-400">
          <Shield size={11} /> {ui.joinWith}: {team.joinCommand}
          <Check size={10} className="text-brand-500" />
        </span>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Düzenle
        </Button>
      </div>
    </div>
  );
}
