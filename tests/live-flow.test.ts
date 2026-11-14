import { afterEach, describe, expect, it } from 'vitest';
import type { BuiltApp } from '../server/src/app';
import {
  LiveClient,
  activatePublisher,
  createGame,
  listen,
  makeApp,
  signLiveEvent,
  waitUntil,
} from './helpers';

let built: BuiltApp | null = null;
let clients: LiveClient[] = [];

async function app(): Promise<BuiltApp> {
  built = await makeApp({ lobbyAutoStartMs: 150, finishedToLobbyMs: 150 });
  return built;
}

afterEach(async () => {
  clients.forEach((client) => client.close());
  clients = [];
  if (built) {
    await built.app.close();
    built = null;
  }
});

async function setupGame(server: BuiltApp['app'], cookie: string) {
  const fixture = await createGame(server, cookie, { teamCount: 2, gameName: 'Canlı Test Arena' });
  const update = await server.inject({
    method: 'PUT',
    url: '/api/game',
    headers: { cookie },
    payload: {
      settings: {
        roundDurationSec: 30,
        commandCooldownMs: 300,
        castleHp: 600,
        giftAttackDamage: 80,
        likeShieldStrength: 0.1,
      },
    },
  });
  expect(update.statusCode).toBe(200);
  return fixture;
}

async function startSession(server: BuiltApp['app'], cookie: string) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/game/session/start',
    headers: { cookie },
    payload: {},
  });
  expect(response.statusCode).toBe(200);
  return response.json() as { sessionId: string; state: any };
}

describe('canlı oyun akışı (WebSocket)', () => {
  it('izleyici komutla katılır, spam engellenir, takım değiştirir', async () => {
    const builtApp = await app();
    const { app: server, runtime } = builtApp;
    const port = await listen(server);
    const user = await activatePublisher(server, 'pkg_pro');
    const fixture = await setupGame(server, user.cookie);
    await startSession(server, user.cookie);

    const client = await LiveClient.connect(port, fixture.slug);
    clients.push(client);
    client.hello('ws_viewer_001', 'WS İzleyici');
    const initial = await client.waitState((state) => state.gameId === fixture.gameId);
    expect(initial.phase).toBe('running');

    client.chat('!gir aslan', 'join-1');
    const joined = await client.waitState((state) =>
      state.players.some((player: any) => player.id === 'ws_viewer_001' && player.teamSlot === 1),
    );
    expect(joined.players[0].teamSlot).toBe(1);
    await client.waitNotice('JOINED');

    // Cooldown içinde ikinci komut spam olarak reddedilir.
    client.chat('!gir kartal', 'join-2');
    const limited = await client.waitNotice('RATE_LIMITED');
    expect(limited.code).toBe('RATE_LIMITED');

    await new Promise((resolve) => setTimeout(resolve, 450));
    client.chat('!takimdegistir kartal', 'switch-1');
    const switched = await client.waitState((state) =>
      state.players.some((player: any) => player.id === 'ws_viewer_001' && player.teamSlot === 2),
    );
    expect(switched.players[0].teamSlot).toBe(2);
    const switchedNotice = await client.waitNotice('SWITCHED');
    expect(switchedNotice.teamName).toBe('Kartal');

    // Aynı oyuncu aynı anda iki takımda görünmez.
    expect(switched.players.filter((player: any) => player.id === 'ws_viewer_001')).toHaveLength(1);
    expect(switched.teams.find((team: any) => team.slot === 1).playerCount).toBe(0);
    expect(switched.teams.find((team: any) => team.slot === 2).playerCount).toBe(1);

    // Test webhook'u: imzalı canlı yayın eventi ve deduplication.
    const giftBody = {
      id: `live_gift_${Date.now()}`,
      type: 'gift',
      teamSlot: 1,
      viewer: { id: 'live_viewer_1', name: 'Hediye İzleyici' },
      amount: 1,
    };
    const signed = signLiveEvent(giftBody);
    const gift1 = await server.inject({
      method: 'POST',
      url: `/api/live/${fixture.slug}/events`,
      payload: signed.body,
      headers: signed.headers,
    });
    expect(gift1.statusCode).toBe(200);
    expect(gift1.json().applied).toBe(true);
    const gift2 = await server.inject({
      method: 'POST',
      url: `/api/live/${fixture.slug}/events`,
      payload: signed.body,
      headers: signed.headers,
    });
    expect(gift2.json().duplicate).toBe(true);

    const badSignature = await server.inject({
      method: 'POST',
      url: `/api/live/${fixture.slug}/events`,
      payload: JSON.stringify({ ...giftBody, id: 'bad' }),
      headers: { 'content-type': 'application/json', 'x-live-signature': 't=1,v1=deadbeef' },
    });
    expect(badSignature.statusCode).toBe(401);

    // Test-event uç noktası aynı externalId ile ikinci kez uygulanmaz.
    const testEvent = await server.inject({
      method: 'POST',
      url: '/api/game/test-event',
      headers: { cookie: user.cookie },
      payload: { type: 'comment', teamSlot: 2, playerName: 'Test İzleyici', externalId: 'same_event_1' },
    });
    expect(testEvent.statusCode).toBe(200);
    expect(testEvent.json().applied).toBe(true);
    const duplicateTestEvent = await server.inject({
      method: 'POST',
      url: '/api/game/test-event',
      headers: { cookie: user.cookie },
      payload: { type: 'comment', teamSlot: 2, playerName: 'Test İzleyici', externalId: 'same_event_1' },
    });
    expect(duplicateTestEvent.statusCode).toBe(200);
    expect(duplicateTestEvent.json().duplicate).toBe(true);

    expect(runtime.isRunning(fixture.gameId)).toBe(true);
  });

  it('maç durdurulunca sonuç, istatistik ve geçmiş yazılır; iki yayıncı izole kalır', async () => {
    const builtApp = await app();
    const { app: server, db } = builtApp;
    const port = await listen(server);
    const publisherA = await activatePublisher(server, 'pkg_pro');
    const publisherB = await activatePublisher(server, 'pkg_pro');
    const gameA = await setupGame(server, publisherA.cookie);
    await createGame(server, publisherB.cookie, { gameName: 'B Arenası', teamCount: 2 });

    // A yayıncısında oyuncu katılımı.
    await startSession(server, publisherA.cookie);
    const client = await LiveClient.connect(port, gameA.slug);
    clients.push(client);
    client.hello('stats_viewer_01', 'İstatistik İzleyici');
    await client.waitState((state) => state.gameId === gameA.gameId);
    client.chat('!gir aslan', 'stats-join-1');
    await client.waitState((state) => state.players.length > 0);

    // Turu elle bitir.
    const stop = await server.inject({
      method: 'POST',
      url: '/api/game/session/stop',
      headers: { cookie: publisherA.cookie },
    });
    expect(stop.statusCode).toBe(200);

    await waitUntil(async () => {
      const stats = await server.inject({
        method: 'GET',
        url: '/api/game/stats',
        headers: { cookie: publisherA.cookie },
      });
      return stats.json().totalMatches === 1;
    }, 4000);

    const statsA = (
      await server.inject({ method: 'GET', url: '/api/game/stats', headers: { cookie: publisherA.cookie } })
    ).json();
    expect(statsA.totalMatches).toBe(1);
    expect(statsA.totalPlayers).toBeGreaterThanOrEqual(1);
    expect(statsA.topPlayers.length).toBeGreaterThanOrEqual(1);
    expect(statsA.recentMatches[0].winnerTeamName ?? null).not.toBeUndefined();

    const sessionsA = (
      await server.inject({ method: 'GET', url: '/api/game/sessions', headers: { cookie: publisherA.cookie } })
    ).json();
    expect(sessionsA.sessions).toHaveLength(1);
    expect(sessionsA.sessions[0].participantCount).toBeGreaterThanOrEqual(1);

    const statsB = (
      await server.inject({ method: 'GET', url: '/api/game/stats', headers: { cookie: publisherB.cookie } })
    ).json();
    expect(statsB.totalMatches).toBe(0);
    expect(statsB.totalPlayers).toBe(0);
    const sessionsB = (
      await server.inject({ method: 'GET', url: '/api/game/sessions', headers: { cookie: publisherB.cookie } })
    ).json();
    expect(sessionsB.sessions).toHaveLength(0);

    // Veritabanında da oturum yalnızca A oyununa bağlı olmalı.
    const sessionRow = db
      .prepare('SELECT game_id FROM game_sessions WHERE game_id = ?')
      .get(gameA.gameId) as { game_id: string };
    expect(sessionRow.game_id).toBe(gameA.gameId);
  });

  it('ilk katılımda lobi otomatik başlar; bağlantı kapatılınca yeni istemci reddedilir', async () => {
    const builtApp = await app();
    const { app: server, runtime } = builtApp;
    const port = await listen(server);
    const user = await activatePublisher(server, 'pkg_pro');
    const fixture = await createGame(server, user.cookie, { teamCount: 2 });
    await server.inject({
      method: 'PUT',
      url: '/api/game',
      headers: { cookie: user.cookie },
      payload: { settings: { roundDurationSec: 30, commandCooldownMs: 250 } },
    });

    const client = await LiveClient.connect(port, fixture.slug);
    clients.push(client);
    client.hello('auto_start_viewer', 'Auto İzleyici');
    await client.waitState((state) => state.gameId === fixture.gameId);
    expect(runtime.isRunning(fixture.gameId)).toBe(false);

    client.chat('!gir aslan', 'auto-join-1');
    await waitUntil(() => runtime.isRunning(fixture.gameId), 4000);
    const running = await client.waitState((state) => state.phase === 'running');
    expect(running.phase).toBe('running');

    const disable = await server.inject({
      method: 'POST',
      url: '/api/game/live',
      headers: { cookie: user.cookie },
      payload: { enabled: false },
    });
    expect(disable.statusCode).toBe(200);
    const rejected = await LiveClient.connect(port, fixture.slug);
    clients.push(rejected);
    await waitUntil(() => rejected.closed, 3000);
    expect(rejected.closeCode).toBe(4004);

    const publicFetch = await server.inject({ method: 'GET', url: `/api/live/${fixture.slug}` });
    expect(publicFetch.statusCode).toBe(404);

    const enable = await server.inject({
      method: 'POST',
      url: '/api/game/live',
      headers: { cookie: user.cookie },
      payload: { enabled: true },
    });
    expect(enable.statusCode).toBe(200);
    expect(enable.json().game.publicSlug).toBe(fixture.slug);
  });

  it('geçersiz yayın slug bağlantısı reddedilir', async () => {
    const builtApp = await app();
    const port = await listen(builtApp.app);
    const client = await LiveClient.connect(port, 'boyle-bir-slug-yok-123');
    clients.push(client);
    await waitUntil(() => client.closed, 3000);
    expect(client.closeCode).toBe(4004);
  });

  it('viewer kimliği olmadan sohbet komutu kabul edilmez', async () => {
    const builtApp = await app();
    const { app: server } = builtApp;
    const port = await listen(server);
    const user = await activatePublisher(server, 'pkg_pro');
    const fixture = await createGame(server, user.cookie, { teamCount: 2 });
    await startSession(server, user.cookie);
    const client = await LiveClient.connect(port, fixture.slug);
    clients.push(client);
    await client.waitState((state) => state.gameId === fixture.gameId);
    client.chat('!gir aslan', 'no-viewer');
    const error = await client.waitFor((message) => message.type === 'error');
    expect(error.error).toContain('izleyici');
  });
});

describe('üretim komut politikası', () => {
  it('allowViewerCommands kapalıyken doğrudan WebSocket komutu reddedilir', async () => {
    built = await makeApp({
      allowViewerCommands: false,
      lobbyAutoStartMs: 150,
      finishedToLobbyMs: 150,
    });
    const { app: server } = built;
    const port = await listen(server);
    const user = await activatePublisher(server, 'pkg_pro');
    const fixture = await createGame(server, user.cookie, { teamCount: 2 });
    await startSession(server, user.cookie);
    const client = await LiveClient.connect(port, fixture.slug);
    clients.push(client);
    client.hello('blocked_viewer_01');
    await client.waitState((state) => state.gameId === fixture.gameId);
    client.chat('!gir aslan', 'blocked-1');
    const notice = await client.waitNotice('COMMAND_DISABLED');
    expect(notice.message).toContain('kapalı');
  });
});
