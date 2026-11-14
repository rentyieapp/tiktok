import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock,
  Gift,
  Heart,
  History,
  MessageSquare,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Swords,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import type { GameSettings, GameVersionDTO } from '@shared/types';
import { DEFAULT_SETTINGS, WIN_CONDITION_LABELS } from '@shared/defaults';
import { useStudio } from '../../lib/studio';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { formatDateTime } from '../../lib/format';
import { Button, Modal, PageHeader, SectionCard, Toggle } from '../../components/ui';
import { RangeField, SettingsGroup, WinConditionPicker } from '../../components/SettingsControls';

function reasonLabel(reason: string): string {
  if (reason === 'create') return 'İlk oluşturma';
  if (reason === 'save') return 'Ayarlar kaydedildi';
  if (reason === 'commands') return 'Komutlar güncellendi';
  if (reason.startsWith('restore:')) return `Sürüm ${reason.split(':')[1]} geri yüklendi`;
  return reason;
}

export function SettingsPage() {
  const { game, refresh, pendingApply } = useStudio();
  const { success, error: toastError } = useToast();
  const [settings, setSettings] = useState<GameSettings>(game?.settings ?? DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<GameVersionDTO[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<GameVersionDTO | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (game) setSettings(game.settings);
  }, [game]);

  const loadVersions = async () => {
    setVersionsLoading(true);
    try {
      const result = await api.get<{ versions: GameVersionDTO[] }>('/api/game/versions');
      setVersions(result.versions);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => {
    void loadVersions();
  }, []);

  const dirty = useMemo(
    () => Boolean(game && JSON.stringify(settings) !== JSON.stringify(game.settings)),
    [game, settings],
  );

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!game) return;
    setSaving(true);
    try {
      const result = await api.put<{ pendingApply: boolean }>('/api/game', { settings });
      await refresh();
      await loadVersions();
      success(
        'Oyun ayarları kaydedildi',
        result.pendingApply
          ? 'Aktif maç var. Yeni denge ayarları bir sonraki turda uygulanacak.'
          : 'Değişiklikler sunucuya ve veritabanına yazıldı.',
      );
    } catch (caught) {
      toastError(
        'Ayarlar kaydedilemedi',
        caught instanceof ApiError ? caught.firstDetail() ?? caught.message : 'Tekrar dene.',
      );
    } finally {
      setSaving(false);
    }
  };

  const restore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      await api.post(`/api/game/versions/${restoreTarget.version}/restore`);
      await refresh();
      await loadVersions();
      setRestoreTarget(null);
      success('Sürüm geri yüklendi', `Yapılandırma v${restoreTarget.version} değerlerine döndü.`);
    } catch (caught) {
      toastError(
        'Geri yüklenemedi',
        caught instanceof ApiError ? caught.message : 'Lütfen tekrar dene.',
      );
    } finally {
      setRestoring(false);
    }
  };

  const estimate = useMemo(() => {
    const assumedPlayers = 4;
    const avgSoldiers =
      settings.startingSoldiers +
      settings.soldierProductionRate * settings.roundDurationSec * 0.5 +
      settings.joinSoldierBonus * assumedPlayers;
    const attackBonus = 1 + Math.min(1, assumedPlayers * settings.playerAttackBonusPercent / 100);
    const damagePerSecond =
      avgSoldiers * settings.attackPower * 0.02 * attackBonus *
      (1 - Math.min(0.6, settings.defensePower * 0.02));
    const totalDamage = damagePerSecond * settings.roundDurationSec;
    return {
      avgSoldiers: Math.round(avgSoldiers),
      dps: Number(damagePerSecond.toFixed(1)),
      totalDamage: Math.round(totalDamage),
      castleRatio: Math.round((settings.castleHp / Math.max(1, totalDamage)) * 100),
    };
  }, [settings]);

  if (!game) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Stüdyo"
        title="Oyun ayarları"
        description="Tur süresi, ordu üretimi, kale canı ve etkileşim desteklerini yönet. Tüm değerler sunucu tarafında doğrulanır; istemciden gelen değerlerle maç sonucu değiştirilemez."
        actions={
          <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => setResetOpen(true)}>
            Varsayılanlara dön
          </Button>
        }
      />

      {pendingApply ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12px] leading-relaxed text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          Canlı maç devam ediyor. Kaydettiğin yeni ayarlar mevcut maçı etkilemez; sonraki turda
          uygulanır.
        </div>
      ) : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SettingsGroup
            title="Tur ve tempo"
            description="Bir turun ne kadar süreceğini ve asker üretim hızını belirle."
            icon={<Clock size={17} />}
          >
            <RangeField
              label="Tur süresi"
              hint="Varsayılan 90 saniye. Süre bitince kazanma koşuluna göre kazanan belirlenir."
              value={settings.roundDurationSec}
              min={30}
              max={300}
              step={5}
              unit="sn"
              onChange={(value) => update('roundDurationSec', value)}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <RangeField
                label="Başlangıç asker sayısı"
                hint="Her takımın tur başında sahip olduğu asker."
                value={settings.startingSoldiers}
                min={5}
                max={100}
                step={1}
                onChange={(value) => update('startingSoldiers', value)}
              />
              <RangeField
                label="Asker üretim hızı"
                hint="Saniyede eklenen asker miktarı."
                value={settings.soldierProductionRate}
                min={0.5}
                max={10}
                step={0.5}
                unit="asker/sn"
                onChange={(value) => update('soldierProductionRate', value)}
              />
            </div>
            <RangeField
              label="Katılım bonusu"
              hint="Her yeni izleyici takıma katıldığında eklenecek asker. 0 yaparsan katılım yalnızca puan kazandırır."
              value={settings.joinSoldierBonus}
              min={0}
              max={20}
              step={1}
              unit="asker"
              onChange={(value) => update('joinSoldierBonus', value)}
            />
          </SettingsGroup>

          <SettingsGroup
            title="Savaş dengesi"
            description="Kale dayanıklılığı ve saldırı gücü turun gidişatını belirler."
            icon={<Swords size={17} />}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <RangeField
                label="Kale canı"
                hint="Bir takımın elenmesi için kalesinin canının sıfıra inmesi gerekir."
                value={settings.castleHp}
                min={200}
                max={5000}
                step={50}
                onChange={(value) => update('castleHp', value)}
              />
              <RangeField
                label="Saldırı gücü"
                hint="Asker başına verilen hasarı ölçekler."
                value={settings.attackPower}
                min={1}
                max={20}
                step={1}
                onChange={(value) => update('attackPower', value)}
              />
              <RangeField
                label="Savunma gücü"
                hint="Gelen hasarı azaltır. Yüksek değer maçları uzatır."
                value={settings.defensePower}
                min={0}
                max={20}
                step={1}
                onChange={(value) => update('defensePower', value)}
              />
              <RangeField
                label="Oyuncu başına saldırı bonusu"
                hint="Her izleyici takımına ekstra saldırı gücü kazandırır."
                value={settings.playerAttackBonusPercent}
                min={0}
                max={10}
                step={1}
                unit="%"
                onChange={(value) => update('playerAttackBonusPercent', value)}
              />
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-800">
                <Target size={14} /> Kazanma koşulu
              </p>
              <WinConditionPicker
                value={settings.winCondition}
                onChange={(value) => update('winCondition', value)}
              />
            </div>
          </SettingsGroup>

          <SettingsGroup
            title="İzleyici etkileşimleri"
            description="Hediye, beğeni ve yorumları oyun içi desteğe dönüştür."
            icon={<Gift size={17} />}
          >
            <div className="rounded-xl border border-ink-100 p-3.5">
              <Toggle
                checked={settings.enableGifts}
                onChange={(value) => update('enableGifts', value)}
                label="Hediye → özel saldırı"
                description="İzleyici hediye gönderdiğinde tüm rakip kalelere özel saldırı hasarı verilir."
              />
              <div className="mt-4">
                <RangeField
                  label="Hediye saldırı hasarı"
                  value={settings.giftAttackDamage}
                  min={0}
                  max={500}
                  step={10}
                  onChange={(value) => update('giftAttackDamage', value)}
                  format={(value) => `${value} hasar`}
                />
              </div>
            </div>

            <div className="rounded-xl border border-ink-100 p-3.5">
              <Toggle
                checked={settings.enableLikes}
                onChange={(value) => update('enableLikes', value)}
                label="Beğeni → savunma kalkanı"
                description="Beğeniler takım kalesine geçici hasar azaltan kalkan ekler."
              />
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <RangeField
                  label="Kalkan gücü"
                  value={Math.round(settings.likeShieldStrength * 100)}
                  min={0}
                  max={50}
                  step={1}
                  unit="%"
                  onChange={(value) => update('likeShieldStrength', value / 100)}
                />
                <RangeField
                  label="Kalkan süresi"
                  value={settings.likeShieldDurationSec}
                  min={0}
                  max={30}
                  step={1}
                  unit="sn"
                  onChange={(value) => update('likeShieldDurationSec', value)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-ink-100 p-3.5">
              <Toggle
                checked={settings.enableComments}
                onChange={(value) => update('enableComments', value)}
                label="Yorum → asker desteği"
                description="Yorum başına takıma ek asker gönderilir."
              />
              <div className="mt-4">
                <RangeField
                  label="Yorum başına asker"
                  value={settings.commentSoldierBonus}
                  min={0}
                  max={20}
                  step={1}
                  unit="asker"
                  onChange={(value) => update('commentSoldierBonus', value)}
                />
              </div>
            </div>
          </SettingsGroup>

          <SettingsGroup
            title="Komut ve katılım"
            description="Spam koruması ve takım kapasiteleri."
            icon={<ShieldCheck size={17} />}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <RangeField
                label="Komut bekleme süresi"
                hint="Aynı izleyici bu süre dolmadan yeni komut gönderemez."
                value={Number((settings.commandCooldownMs / 1000).toFixed(1))}
                min={0.3}
                max={10}
                step={0.1}
                unit="sn"
                onChange={(value) => update('commandCooldownMs', Math.round(value * 1000))}
              />
              <RangeField
                label="Takım başına maksimum oyuncu"
                hint="0 = sınırsız. Dolu takıma katılım reddedilir."
                value={settings.maxPlayersPerTeam}
                min={0}
                max={500}
                step={10}
                onChange={(value) => update('maxPlayersPerTeam', value)}
              />
            </div>
          </SettingsGroup>

          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white/95 p-4 shadow-float backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] text-ink-500">
              {dirty ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Kaydedilmemiş değişiklikler var
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Tüm ayarlar kayıtlı
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setSettings(game.settings)}
                disabled={!dirty || saving}
              >
                Geri al
              </Button>
              <Button
                variant="brand"
                icon={<Save size={15} />}
                loading={saving}
                disabled={!dirty}
                onClick={() => void save()}
              >
                Ayarları kaydet
              </Button>
            </div>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="card overflow-hidden">
            <div className="bg-ink-950 p-5 text-white">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                <BarChart3 size={12} /> Tahmini denge
              </p>
              <p className="mt-2 text-sm text-white/70">
                {settings.roundDurationSec} saniyelik turda, {game.teams.length} takım ve
                ortalama {estimate.avgSoldiers} askerle.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="font-display text-2xl font-bold">{estimate.dps}</p>
                  <p className="text-[10px] text-white/35">hasar / saniye</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">{estimate.totalDamage}</p>
                  <p className="text-[10px] text-white/35">tur başına hasar</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-500">Kale canı</span>
                <span className="font-semibold text-ink-900">{settings.castleHp}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-500">Kazanma koşulu</span>
                <span className="font-semibold text-ink-900">
                  {WIN_CONDITION_LABELS[settings.winCondition].title}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-ink-500">Tur sonu ordu</span>
                <span className="font-semibold text-ink-900">~{estimate.avgSoldiers} asker</span>
              </div>
              <div className="rounded-xl bg-ink-50 p-3 text-[10px] leading-relaxed text-ink-500">
                Tahmini değerlerdir; oyuncu katılımı, hediyeler ve beğeni kalkanları sonucu
                değiştirebilir. Nihai hesap sunucuda yapılır.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900">
                <History size={14} /> Sürüm geçmişi
              </p>
              <span className="text-[10px] text-ink-400">v{game.configVersion}</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2">
              {versionsLoading ? (
                <p className="p-3 text-xs text-ink-400">Yükleniyor...</p>
              ) : versions.length === 0 ? (
                <p className="p-3 text-xs text-ink-400">Henüz sürüm kaydı yok.</p>
              ) : (
                <ul className="space-y-1">
                  {versions.slice(0, 12).map((version) => (
                    <li key={version.version} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-ink-50">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink-100 text-[9px] font-bold text-ink-600">
                        v{version.version}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-ink-700">
                          {reasonLabel(version.reason)}
                        </p>
                        <p className="text-[9px] text-ink-400">{formatDateTime(version.createdAt)}</p>
                      </div>
                      {version.version !== game.configVersion ? (
                        <button
                          type="button"
                          onClick={() => setRestoreTarget(version)}
                          className="rounded-md p-1 text-ink-400 hover:bg-white hover:text-brand-600"
                          title="Bu sürüme dön"
                          aria-label={`Sürüm ${version.version}'e dön`}
                        >
                          <RotateCcw size={12} />
                        </button>
                      ) : (
                        <span className="badge-ok text-[8px]">Güncel</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-ink-100 p-3 text-[10px] leading-relaxed text-ink-400">
              Her kayıt tam yapılandırma anlık görüntüsü saklar. Geri yükleme yeni bir sürüm
              oluşturur.
            </div>
          </div>

          <SectionCard title="Sunucu otoritesi" icon={<ShieldCheck size={16} />}>
            <p className="text-[11px] leading-relaxed text-ink-500">
              Maç simülasyonu her 250 ms’de sunucuda çalışır. İstemci yalnızca görüntüyü alır;
              skor, kale canı ve kazanan sunucuda hesaplanır.
            </p>
          </SectionCard>
        </aside>
      </div>

      <Modal
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        title="Sürümü geri yükle"
        description={
          restoreTarget
            ? `v${restoreTarget.version} (${reasonLabel(restoreTarget.reason)}) ayarlarına dönmek istiyor musun? Mevcut ayarlar yeni bir sürüm olarak saklanır.`
            : ''
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRestoreTarget(null)}>
              Vazgeç
            </Button>
            <Button variant="brand" loading={restoring} onClick={() => void restore()} icon={<RotateCcw size={14} />}>
              Geri yükle
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-ink-500">
          Yayın URL’n ve takım kimliklerin değişmez. Canlı maç varsa geri yükleme bir sonraki turda
          uygulanır.
        </p>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Varsayılan ayarlara dön"
        description="90 saniyelik tur, dengeli kale canı ve varsayılan etkileşim değerleri uygulanır."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="brand"
              onClick={() => {
                setSettings({ ...DEFAULT_SETTINGS });
                setResetOpen(false);
              }}
            >
              Varsayılanları uygula
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-ink-500">
          Değişiklikleri kaydetmeden önce istediğin değerleri yeniden düzenleyebilirsin.
        </p>
      </Modal>
    </div>
  );
}
