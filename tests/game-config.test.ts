import { afterEach, describe, expect, it } from 'vitest';
import type { BuiltApp } from '../server/src/app';
import {
  activatePublisher,
  buyPackage,
  createGame,
  makeApp,
  registerUser,
  type GameFixture,
} from './helpers';

let built: BuiltApp | null = null;

async function app(): Promise<BuiltApp> {
  built = await makeApp();
  return built;
}

afterEach(async () => {
  if (built) {
    await built.app.close();
    built = null;
  }
});

function teamPayload(
  game: any,
  overrides: Record<number, Record<string, unknown>> = {},
): Array<Record<string, unknown>> {
  return game.teams.map((team: any) => ({
    slot: team.slot,
    name: team.name,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    emblemUrl: team.emblemUrl,
    symbol: team.symbol,
    soldierLook: team.soldierLook,
    castleLook: team.castleLook,
    joinCommand: team.joinCommand,
    description: team.description,
    ...(overrides[team.slot] ?? {}),
  }));
}

describe('oyun oluşturma ve paket limitleri', () => {
  it('başlangıç paketi 4 takım oluşturamaz, 2 takım oluşturabilir', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_starter');

    const tooMany = await server.inject({
      method: 'POST',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { gameName: 'Dört Takım', language: 'tr', teamCount: 4 },
    });
    expect(tooMany.statusCode).toBe(403);

    const fixture = await createGame(server, user.cookie, { teamCount: 2 });
    expect(fixture.slug).toMatch(/^[a-z0-9-]+$/);
    const game = await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } });
    expect(game.json().game.teamCount).toBe(2);
    expect(game.json().game.teams).toHaveLength(2);
  });

  it('profesyonel 4, efsane 8 takım oluşturabilir', async () => {
    const { app: server } = await app();
    const pro = await activatePublisher(server, 'pkg_pro');
    const four = await createGame(server, pro.cookie, { teamCount: 4 });
    const gameFour = await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: pro.cookie } });
    expect(gameFour.json().game.teamCount).toBe(4);
    expect(gameFour.json().game.teams).toHaveLength(4);

    const tooMany = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: pro.cookie },
      payload: { teamCount: 8, teams: [] },
    });
    expect(tooMany.statusCode).toBe(403);
    expect(tooMany.json().message).toContain('4 takım');
    expect(four.slug.length).toBeGreaterThan(8);

    const legend = await activatePublisher(server, 'pkg_legend');
    const eight = await createGame(server, legend.cookie, { teamCount: 8 });
    const gameEight = await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: legend.cookie } });
    expect(gameEight.json().game.teamCount).toBe(8);
    expect(gameEight.json().game.teams).toHaveLength(8);
    expect(eight.slug).not.toBe(four.slug);
  });

  it('yayın slug benzersiz, tahmin edilemez ve kullanıcı kimliği içermez', async () => {
    const { app: server } = await app();
    const a = await activatePublisher(server, 'pkg_pro');
    const b = await registerUser(server);
    await buyPackage(server, b.cookie, 'pkg_pro');
    const gameA = await createGame(server, a.cookie, { teamCount: 2, gameName: 'Aslan Arena' });
    const gameB = await createGame(server, b.cookie, { teamCount: 2, gameName: 'Aslan Arena' });
    expect(gameA.slug).not.toBe(gameB.slug);
    expect(gameA.slug).toContain('aslan');
    expect(gameA.slug).not.toContain(a.userId);
    // Rastgele sonek ~10 karakter; tahmin edilebilir sıralı ID yok.
    expect(gameA.slug.split('-').pop()!.length).toBeGreaterThanOrEqual(8);
  });
});

describe('takım, URL ve ayar yönetimi', () => {
  it('takım adı/renk/komut güncellenir ve URL sabit kalır', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_pro');
    const fixture = await createGame(server, user.cookie, { teamCount: 2 });
    const before = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } })).json();

    const teams = teamPayload(before.game, {
      1: {
        name: 'Manchester',
        primaryColor: '#ff0000',
        secondaryColor: '#ffffff',
        joinCommand: 'MANCHESTER',
        symbol: '⚽',
        description: 'Kendi takımım.',
      },
    });
    const update = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { teams },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().game.publicSlug).toBe(fixture.slug);
    expect(update.json().game.teams[0].name).toBe('Manchester');
    expect(update.json().game.teams[0].primaryColor).toBe('#ff0000');
    expect(update.json().game.teams[0].joinCommand).toBe('MANCHESTER');

    const bootstrap = await server.inject({ method: 'GET', url: `/api/live/${fixture.slug}` });
    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json().teams[0].joinCommand).toBe('MANCHESTER');
    expect(bootstrap.json().commands.teams[0].command).toBe('MANCHESTER');
  });

  it('sistem komutuyla çakışan takım komutu reddedilir', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_pro');
    await createGame(server, user.cookie, { teamCount: 2 });
    const current = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } })).json();

    const conflict = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { teams: teamPayload(current.game, { 1: { joinCommand: 'gir' } }) },
    });
    expect(conflict.statusCode).toBe(400);
    expect(JSON.stringify(conflict.json().details)).toContain('çakışıyor');

    const duplicate = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: {
        teams: teamPayload(current.game, {
          1: { joinCommand: 'AYNI' },
          2: { joinCommand: 'ayni' },
        }),
      },
    });
    expect(duplicate.statusCode).toBe(400);
    expect(JSON.stringify(duplicate.json().details)).toContain('zaten');
  });

  it('dil değişince sistem komutları o dile çevrilir; özel yazım kaydedilir', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_pro');
    const fixture = await createGame(server, user.cookie, { teamCount: 2 });

    const english = await server.inject({
      method: 'PUT',
      url: '/api/game/commands',
      headers: { cookie: user.cookie },
      payload: { language: 'en' },
    });
    expect(english.statusCode).toBe(200);
    const sheetEn = english.json().commands.sheet;
    expect(sheetEn.language).toBe('en');
    expect(sheetEn.system.find((row: any) => row.action === 'JOIN_TEAM').command).toBe('join');
    expect(sheetEn.system.find((row: any) => row.action === 'LEAVE_TEAM').command).toBe('leave');

    const bootstrap = await server.inject({ method: 'GET', url: `/api/live/${fixture.slug}` });
    expect(bootstrap.json().locale).toBe('en');
    expect(bootstrap.json().commands.system.find((row: any) => row.action === 'JOIN_TEAM').command).toBe('join');

    // Takım komutunu İngilizce sistem komutuyla çakıştırmak reddedilir.
    const conflict = await server.inject({
      method: 'PUT',
      url: '/api/game/commands',
      headers: { cookie: user.cookie },
      payload: { language: 'en', teams: [{ slot: 1, joinCommand: 'JOIN' }] },
    });
    expect(conflict.statusCode).toBe(400);

    const custom = await server.inject({
      method: 'PUT',
      url: '/api/game/commands',
      headers: { cookie: user.cookie },
      payload: { language: 'en', overrides: { SHOW_SCORE: 'puanim' } },
    });
    expect(custom.statusCode).toBe(200);
    expect(
      custom.json().commands.effective.find((row: any) => row.action === 'SHOW_SCORE').command,
    ).toBe('puanim');

    const publicAfter = await server.inject({ method: 'GET', url: `/api/live/${fixture.slug}` });
    expect(
      publicAfter.json().commands.system.find((row: any) => row.action === 'SHOW_SCORE').command,
    ).toBe('puanim');
    expect(publicAfter.json().teams.map((team: any) => team.joinCommand)).toEqual(['ASLAN', 'KARTAL']);

    const badOverride = await server.inject({
      method: 'PUT',
      url: '/api/game/commands',
      headers: { cookie: user.cookie },
      payload: { language: 'en', overrides: { JOIN_TEAM: 'score' } },
    });
    expect(badOverride.statusCode).toBe(400);
  });

  it('yayın bağlantısı kapatılıp açılabilir, URL değişmez', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_pro');
    const fixture = await createGame(server, user.cookie, { teamCount: 2 });

    const disable = await server.inject({
      method: 'POST',
      url: '/api/game/live',
      headers: { cookie: user.cookie },
      payload: { enabled: false },
    });
    expect(disable.statusCode).toBe(200);
    expect(disable.json().game.liveEnabled).toBe(false);
    expect(disable.json().game.publicSlug).toBe(fixture.slug);
    const off = await server.inject({ method: 'GET', url: `/api/live/${fixture.slug}` });
    expect(off.statusCode).toBe(404);

    const enable = await server.inject({
      method: 'POST',
      url: '/api/game/live',
      headers: { cookie: user.cookie },
      payload: { enabled: true },
    });
    expect(enable.statusCode).toBe(200);
    const on = await server.inject({ method: 'GET', url: `/api/live/${fixture.slug}` });
    expect(on.statusCode).toBe(200);
    expect(on.json().slug).toBe(fixture.slug);
  });

  it('yapılandırma sürümleri listelenir ve geri yüklenebilir', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_pro');
    const fixture = await createGame(server, user.cookie, {
      teamCount: 2,
      gameName: 'İlk İsim',
    });
    const current = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } })).json();
    await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: {
        gameName: 'İkinci İsim',
        teams: teamPayload(current.game, {
          1: { primaryColor: '#123456', joinCommand: 'YENI' },
        }),
      },
    });

    const versions = await server.inject({
      method: 'GET',
      url: '/api/game/versions',
      headers: { cookie: user.cookie },
    });
    expect(versions.json().versions.length).toBeGreaterThanOrEqual(2);
    const restore = await server.inject({
      method: 'POST',
      url: '/api/game/versions/1/restore',
      headers: { cookie: user.cookie },
    });
    expect(restore.statusCode).toBe(200);
    expect(restore.json().game.gameName).toBe('İlk İsim');
    expect(restore.json().game.publicSlug).toBe(fixture.slug);
    expect(restore.json().game.teams[0].primaryColor).toBe(current.game.teams[0].primaryColor);
  });

  it('takım sayısı azaltılıp artırılabilir; mevcut takım kimlikleri korunur', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_pro');
    await createGame(server, user.cookie, { teamCount: 4 });
    const before = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } })).json();
    const originalIds = before.game.teams.map((team: any) => team.id);

    const shrink = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { teamCount: 2, teams: teamPayload(before.game).slice(0, 2) },
    });
    expect(shrink.statusCode).toBe(200);
    expect(shrink.json().game.teams).toHaveLength(2);
    expect(shrink.json().game.teams.map((team: any) => team.id)).toEqual(originalIds.slice(0, 2));

    const expand = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { teamCount: 4 },
    });
    expect(expand.statusCode).toBe(200);
    expect(expand.json().game.teams).toHaveLength(4);
    expect(expand.json().game.publicSlug).toBe(before.game.publicSlug);
  });
});

describe('kiracı izolasyonu', () => {
  it('iki yayıncı yalnızca kendi oyununu ve istatistiklerini görür', async () => {
    const { app: server } = await app();
    const a = await activatePublisher(server, 'pkg_pro');
    const b = await activatePublisher(server, 'pkg_pro');
    const gameA = await createGame(server, a.cookie, { gameName: 'A Arenası', teamCount: 2 });
    await createGame(server, b.cookie, { gameName: 'B Arenası', teamCount: 2 });

    const meA = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: a.cookie } })).json();
    const meB = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: b.cookie } })).json();
    expect(meA.game.gameName).toBe('A Arenası');
    expect(meB.game.gameName).toBe('B Arenası');
    expect(meA.game.publicSlug).toBe(gameA.slug);
    expect(meB.game.publicSlug).not.toBe(gameA.slug);

    const statsA = (await server.inject({ method: 'GET', url: '/api/game/stats', headers: { cookie: a.cookie } })).json();
    const statsB = (await server.inject({ method: 'GET', url: '/api/game/stats', headers: { cookie: b.cookie } })).json();
    expect(statsA.totalMatches).toBe(0);
    expect(statsB.totalMatches).toBe(0);

    const sessionsB = (await server.inject({ method: 'GET', url: '/api/game/sessions', headers: { cookie: b.cookie } })).json();
    expect(sessionsB.sessions).toHaveLength(0);

    // A'nın yayını herkese açıktır (OBS), ancak yönetim uçları kullanıcıya bağlıdır.
    const publicA = await server.inject({ method: 'GET', url: `/api/live/${gameA.slug}` });
    expect(publicA.statusCode).toBe(200);
  });

  it('oyun oluşturmayan kullanıcı oyun uçlarından veri sızdıramaz', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_pro');
    const empty = await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } });
    expect(empty.json().game).toBeNull();

    const stats = await server.inject({ method: 'GET', url: '/api/game/stats', headers: { cookie: user.cookie } });
    expect(stats.statusCode).toBe(404);
    const stop = await server.inject({
      method: 'POST',
      url: '/api/game/session/stop',
      headers: { cookie: user.cookie },
    });
    expect(stop.statusCode).toBe(404);
  });
});
