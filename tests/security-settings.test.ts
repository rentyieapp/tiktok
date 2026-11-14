import { afterEach, describe, expect, it } from 'vitest';
import type { BuiltApp } from '../server/src/app';
import {
  activatePublisher,
  createGame,
  listen,
  makeApp,
  registerUser,
  waitUntil,
} from './helpers';

let built: BuiltApp | null = null;

async function app(overrides: Parameters<typeof makeApp>[0] = {}): Promise<BuiltApp> {
  built = await makeApp(overrides);
  return built;
}

afterEach(async () => {
  if (built) {
    await built.app.close();
    built = null;
  }
});

describe('hesap güvenliği', () => {
  it('şifreler scrypt ile hashlenir ve oturum çerezi HttpOnly olur', async () => {
    const { app: server, db } = await app();
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'hash@example.com', password: 'GizliSifre1', displayName: 'Hash Test' },
    });
    expect(response.statusCode).toBe(201);
    const setCookie = String(response.headers['set-cookie']);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('hash@example.com') as {
      password_hash: string;
    };
    expect(row.password_hash.startsWith('scrypt$')).toBe(true);
    expect(row.password_hash).not.toContain('GizliSifre1');
  });

  it('profil ve şifre güncellenebilir, eski şifre geçersiz olur', async () => {
    const { app: server } = await app();
    const user = await registerUser(server, 'profile@example.com');

    const profile = await server.inject({
      method: 'PATCH',
      url: '/api/account/profile',
      headers: { cookie: user.cookie },
      payload: { displayName: 'Yeni Ad' },
    });
    expect(profile.statusCode).toBe(200);
    expect(profile.json().user.displayName).toBe('Yeni Ad');

    const password = await server.inject({
      method: 'POST',
      url: '/api/account/password',
      headers: { cookie: user.cookie },
      payload: { currentPassword: 'Test1234', newPassword: 'YeniSifre123' },
    });
    expect(password.statusCode).toBe(200);

    const oldLogin = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'profile@example.com', password: 'Test1234' },
    });
    expect(oldLogin.statusCode).toBe(401);
    const newLogin = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'profile@example.com', password: 'YeniSifre123' },
    });
    expect(newLogin.statusCode).toBe(200);
  });

  it('yabancı Origin ile çerez tabanlı istek reddedilir', async () => {
    const { app: server } = await app();
    await registerUser(server, 'csrf@example.com');
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: 'https://kotu-site.example' },
      payload: { email: 'csrf@example.com', password: 'Test1234' },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toBe('CSRF_ORIGIN');
  });
});

describe('ayar doğrulama ve maç sırasında uygulama', () => {
  it('sunucu aralık dışı ve geçersiz ayarları reddeder', async () => {
    const { app: server } = await app();
    const user = await activatePublisher(server, 'pkg_pro');
    await createGame(server, user.cookie, { teamCount: 2 });
    const current = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: user.cookie } })).json();

    for (const settings of [
      { roundDurationSec: 10 },
      { attackPower: 999 },
      { castleHp: 50 },
      { soldierProductionRate: -1 },
      { winCondition: 'her_sey' },
      { likeShieldStrength: 5 },
    ]) {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/game',
        headers: { cookie: user.cookie },
        payload: { settings },
      });
      expect(response.statusCode).toBe(400);
    }

    const teams = current.game.teams.map((team: any) => ({
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
    }));
    const badColor = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { teams: [{ ...teams[0], primaryColor: 'mavi' }, teams[1]] },
    });
    expect(badColor.statusCode).toBe(400);

    const tooLong = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { teams: [{ ...teams[0], joinCommand: 'C' .repeat(30) }, teams[1]] },
    });
    expect(tooLong.statusCode).toBe(400);

    const valid = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { settings: { roundDurationSec: 90, attackPower: 5 } },
    });
    expect(valid.statusCode).toBe(200);
  });

  it('aktif maçtaki kritik ayar değişikliği mevcut turu etkilemez, sonraki turda uygulanır', async () => {
    const builtApp = await app({ lobbyAutoStartMs: 1000, finishedToLobbyMs: 100 });
    const { app: server } = builtApp;
    await listen(server);
    const user = await activatePublisher(server, 'pkg_pro');
    const fixture = await createGame(server, user.cookie, { teamCount: 2 });
    await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { settings: { roundDurationSec: 60 } },
    });

    const start = await server.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: user.cookie },
      payload: {},
    });
    expect(start.statusCode).toBe(200);
    expect(start.json().state.settings.roundDurationSec).toBe(60);

    const update = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { settings: { roundDurationSec: 120, castleHp: 1500 } },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().pendingApply).toBe(true);

    const during = await server.inject({
      method: 'GET',
      url: '/api/game/live-state',
      headers: { cookie: user.cookie },
    });
    expect(during.json().state.settings.roundDurationSec).toBe(60);
    expect(during.json().state.settings.castleHp).toBe(1000);
    expect(during.json().state.phase).toBe('running');

    await server.inject({
      method: 'POST',
      url: '/api/game/session/stop',
      headers: { cookie: user.cookie },
    });
    await waitUntil(async () => {
      const state = await server.inject({
        method: 'GET',
        url: '/api/game/live-state',
        headers: { cookie: user.cookie },
      });
      return state.json().state?.phase !== 'running';
    }, 3000);

    const next = await server.inject({
      method: 'POST',
      url: '/api/game/session/start',
      headers: { cookie: user.cookie },
      payload: {},
    });
    expect(next.statusCode).toBe(200);
    expect(next.json().state.settings.roundDurationSec).toBe(120);
    expect(next.json().state.settings.castleHp).toBe(1500);
    expect(next.json().state.gameId).toBe(fixture.gameId);
    expect(next.json().state.publicSlug).toBe(fixture.slug);
  });

  it('bir yayıncı başka yayıncının takım/ayar verisini değiştiremez', async () => {
    const { app: server } = await app();
    const a = await activatePublisher(server, 'pkg_pro');
    const b = await activatePublisher(server, 'pkg_pro');
    await createGame(server, a.cookie, { gameName: 'A Oyunu', teamCount: 2 });
    await createGame(server, b.cookie, { gameName: 'B Oyunu', teamCount: 2 });
    const gameA = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: a.cookie } })).json();
    const gameB = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: b.cookie } })).json();

    const attempt = await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: b.cookie },
      payload: {
        teams: gameB.game.teams.map((team: any, index: number) => ({
          slot: team.slot,
          name: index === 0 ? 'Ele Geçirildi' : team.name,
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
          emblemUrl: team.emblemUrl,
          symbol: team.symbol,
          soldierLook: team.soldierLook,
          castleLook: team.castleLook,
          joinCommand: team.joinCommand,
          description: team.description,
        })),
      },
    });
    expect(attempt.statusCode).toBe(200);

    const afterA = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: a.cookie } })).json();
    const afterB = (await server.inject({ method: 'GET', url: '/api/game', headers: { cookie: b.cookie } })).json();
    expect(afterA.game.gameName).toBe('A Oyunu');
    expect(afterA.game.teams[0].name).toBe(gameA.game.teams[0].name);
    expect(afterB.game.teams[0].name).toBe('Ele Geçirildi');
  });
});
