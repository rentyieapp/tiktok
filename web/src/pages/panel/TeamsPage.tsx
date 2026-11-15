import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Copy,
  Info,
  Save,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import type { TeamConfig } from '@shared/types';
import { validateCommandConfig, type CommandIssue } from '@shared/commands';
import { useStudio } from '../../lib/studio';
import { useAuth } from '../../lib/auth';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Modal, PageHeader, SectionCard, TeamCrest } from '../../components/ui';
import { TeamEditor, TeamSummaryCard } from '../../components/TeamEditor';
import { copyText } from '../../lib/clipboard';

export function TeamsPage() {
  const { game, commands, refresh, pendingApply } = useStudio();
  const { me } = useAuth();
  const { success, error: toastError } = useToast();
  const [teams, setTeams] = useState<TeamConfig[]>([]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [draft, setDraft] = useState<TeamConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<CommandIssue[]>([]);

  useEffect(() => {
    if (!game) return;
    setTeams(game.teams.map(({ id: _id, ...team }) => team));
  }, [game]);

  const overrides = commands?.overrides ?? {};
  const localIssues = useMemo(
    () =>
      game
        ? validateCommandConfig({ language: game.language, overrides, teams })
        : [],
    [game, overrides, teams],
  );
  const allIssues = [...localIssues, ...issues];
  const dirty = useMemo(() => {
    if (!game) return false;
    const base = game.teams.map(({ id: _id, ...team }) => JSON.stringify(team)).join('|');
    return teams.map((team) => JSON.stringify(team)).join('|') !== base;
  }, [game, teams]);

  const updateTeam = (next: TeamConfig) => {
    setTeams((current) => current.map((team) => (team.slot === next.slot ? next : team)));
    setIssues([]);
  };

  const openEditor = (slot: number) => {
    const team = teams.find((candidate) => candidate.slot === slot);
    if (!team) return;
    setDraft({ ...team });
    setEditingSlot(slot);
  };

  const save = async () => {
    if (!game) return;
    if (allIssues.length > 0) {
      toastError('Komut çakışmalarını çöz', allIssues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      const result = await api.put<{ game: typeof game; publicUrl: string; pendingApply: boolean }>(
        '/api/game',
        {
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
        },
      );
      await refresh();
      success(
        'Takımlar kaydedildi',
        result.pendingApply
          ? 'Aktif maç var. Yeni takımlar bir sonraki turda uygulanacak.'
          : 'Takım kimlikleri ve komutları güncellendi.',
      );
    } catch (caught) {
      const apiError = caught as ApiError;
      if (apiError.details) {
        setIssues(
          Object.entries(apiError.details).flatMap(([field, messages]) =>
            messages.map((message) => ({ field, code: 'SERVER', message })),
          ),
        );
      }
      toastError(
        'Takımlar kaydedilemedi',
        caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Tekrar dene.',
      );
    } finally {
      setSaving(false);
    }
  };

  const copyCommands = async () => {
    const text = teams
      .map((team) => `${team.name}: !${team.joinCommand}`)
      .join('\n');
    try {
      await copyText(text);
      success('Komutlar kopyalandı', 'Yayın açıklamasına ekleyebilirsin.');
    } catch {
      toastError('Kopyalanamadı', 'Tarayıcı izinlerini kontrol et.');
    }
  };

  if (!game) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Stüdyo"
        title="Takım yönetimi"
        description="Her takımın adı, renkleri, arması, sembolü, asker/kale görünümü ve katılma komutunu düzenle. Tüm alanlar veritabanında saklanır."
        actions={
          <>
            <Button variant="secondary" icon={<Copy size={15} />} onClick={() => void copyCommands()}>
              Komutları kopyala
            </Button>
            <Link to="/panel/oyun">
              <Button variant="secondary" icon={<Users size={15} />}>
                Takım sayısını değiştir
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card card-pad flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Shield size={18} />
          </span>
          <div>
            <p className="text-[11px] text-ink-400">Takım sayısı</p>
            <p className="text-lg font-semibold text-ink-900">{teams.length}</p>
          </div>
        </div>
        <div className="card card-pad flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-100 text-ink-600">
            <Sparkles size={18} />
          </span>
          <div>
            <p className="text-[11px] text-ink-400">Oyun dili</p>
            <p className="text-lg font-semibold uppercase text-ink-900">{game.language}</p>
          </div>
        </div>
        <div className="card card-pad flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Save size={18} />
          </span>
          <div>
            <p className="text-[11px] text-ink-400">Paket takım hakkı</p>
            <p className="text-lg font-semibold text-ink-900">{me?.subscription?.maxTeams ?? 2}</p>
          </div>
        </div>
      </div>

      {pendingApply ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12px] leading-relaxed text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          Şu anda canlı bir maç var. Takım değişikliklerini kaydettiğinde mevcut maç bozulmaz;
          yeni ayarlar bir sonraki turda uygulanır.
        </div>
      ) : null}

      {allIssues.length > 0 ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-red-800">
            <AlertTriangle size={13} /> Komut çakışması
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-red-700">
            {allIssues.map((issue, index) => (
              <li key={`${issue.field}-${issue.code}-${index}`}>• {issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => (
          <TeamSummaryCard
            key={team.slot}
            team={team}
            language={game.language}
            onEdit={() => openEditor(team.slot)}
            onCopy={() => {
              void copyText(`!${team.joinCommand}`).then((ok) =>
                ok
                  ? success('Komut kopyalandı', `!${team.joinCommand}`)
                  : toastError('Kopyalanamadı'),
              );
            }}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <div className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-500">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-600" />
          <span>
            Takım kimlikleri ve yayın URL’si sabit kalır. Emblem olarak yalnızca kullanım hakkına
            sahip olduğun görselleri yükle.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? <span className="text-[11px] font-medium text-amber-600">Kaydedilmemiş değişiklik</span> : null}
          <Button
            variant="brand"
            icon={<Save size={15} />}
            loading={saving}
            disabled={!dirty || allIssues.length > 0}
            onClick={() => void save()}
          >
            Değişiklikleri kaydet
          </Button>
        </div>
      </div>

      <SectionCard className="mt-6" title="Takım komutları" description="İzleyicilerin takımlara katılmak için yazacağı komutlar.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((team) => (
            <div key={team.slot} className="flex items-center gap-2 rounded-xl border border-ink-100 p-2.5">
              <TeamCrest symbol={team.symbol} emblemUrl={team.emblemUrl} color={team.primaryColor} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-ink-800">{team.name}</p>
                <p className="truncate font-mono text-[10px] text-ink-500">!{team.joinCommand}</p>
              </div>
              <Check size={12} className={localIssues.some((issue) => issue.field.startsWith(`teams.${team.slot}.`)) ? 'text-red-500' : 'text-brand-500'} />
            </div>
          ))}
        </div>
      </SectionCard>

      <Modal
        open={editingSlot !== null && draft !== null}
        onClose={() => {
          setEditingSlot(null);
          setDraft(null);
        }}
        title={draft ? `Takım ${draft.slot} düzenle` : 'Takım düzenle'}
        description="Takımın yayın ekranındaki görünümünü ve katılma komutunu özelleştir."
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setEditingSlot(null);
                setDraft(null);
              }}
            >
              Vazgeç
            </Button>
            <Button
              variant="brand"
              icon={<Check size={15} />}
              disabled={Boolean(
                draft &&
                  allIssues.some((issue) => issue.field.startsWith(`teams.${draft.slot}.`)),
              )}
              onClick={() => {
                if (draft) updateTeam(draft);
                setEditingSlot(null);
                setDraft(null);
              }}
            >
              Takımı uygula
            </Button>
          </>
        }
      >
        {draft ? (
          <TeamEditor
            key={draft.slot}
            team={draft}
            language={game.language}
            issues={allIssues.filter((issue) => issue.field.startsWith(`teams.${draft.slot}.`))}
            onChange={setDraft}
          />
        ) : null}
      </Modal>
    </div>
  );
}