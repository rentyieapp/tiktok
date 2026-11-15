import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import type { BuiltApp } from '../server/src/app';
import { mapYouTubeChatItem, normalizeTikTokEvent, parseTwitchLine } from '../server/src/platforms/hub';
import { activatePublisher, listen, makeApp, registerUser } from './helpers';

let built: BuiltApp | null = null;
let sockets: WebSocket[] = [];

afterEach(async () => {
  sockets.forEach((socket) => socket.close());
  sockets = [];
  if (built) {
    await built.app.close();
    built = null;
  }
});

function waitForMessage(socket: WebSocket, predicate: (message: any) => boolean, timeout = 4000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('WebSocket mesajı zaman aşımına uğradı.'));
    }, timeout);
    const onMessage = (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString());
      if (predicate(message)) {
        clearTimeout(timer);
        socket.off('message', onMessage);
        resolve(message);
      }
    };
    socket.on('message', onMessage);
  });
}


async function buyGame(server: BuiltApp['app'], cookie: string, offerId: string): Promise<void> {
  const checkout = await server.inject({
    method: 'POST',
    url: '/api/billing/checkout',
    headers: { cookie },
    payload: { packageId: offerId },
  });
  expect(checkout.statusCode).toBe(201);
  const paymentId = checkout.json().payment.id as string;
  const paid = await server.inject({
    method: 'POST',
    url: `/api/test-payments/${paymentId}/pay`,
    headers: { cookie },
    payload: { outcome: 'success' },
  });
  expect(paid.statusCode).toBe(200);
  expect(paid.json().webhook.licenseCreated).toBe(true);
}

describe('yayıncıya özel arcade odaları', () => {
  it('lisanslı yayıncı oda açar, TikTok olayı oyuna işlenir', async () => {
    built = await makeApp();
    const { app: server } = built;
    const publisher = await activatePublisher(server, 'pkg_pro');
    await buyGame(server, publisher.cookie, 'offer_dance_1d');

    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: publisher.cookie },
      payload: { gameKey: 'dance' },
    });
    expect(created.statusCode).toBe(201);
    const room = created.json().room;
    expect(room.publicUrl).toContain('/canli/');

    const publicRoom = await server.inject({
      method: 'GET',
      url: `/api/arcade/rooms/${room.slug}/public`,
    });
    expect(publicRoom.statusCode).toBe(200);
    expect(publicRoom.json().licensed).toBe(true);
    expect(publicRoom.json().game.key).toBe('dance');

    const connection = await server.inject({
      method: 'POST',
      url: `/api/platforms/rooms/${room.id}/connect`,
      headers: { cookie: publisher.cookie },
      payload: { platform: 'tiktok', channel: 'testchannel' },
    });
    expect(connection.statusCode).toBe(201);
    const connectorUrl = connection.json().connection.connectorUrl as string;
    expect(connectorUrl).toContain('/api/webhooks/tiktok/');
    const token = connectorUrl.split('/').pop()!;

    // Odaya web test izleyicisi katıp turu başlat.
    const port = await listen(server);
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/arcade/room/${room.slug}`);
    sockets.push(socket);
    await waitForMessage(socket, (message) => message.type === 'hello');
    await waitForMessage(socket, (message) => message.type === 'state');
    socket.send(JSON.stringify({ type: 'join', name: 'Oda Testi', clientId: 'room_test_1' }));
    await waitForMessage(socket, (message) => message.type === 'joined');
    socket.send(JSON.stringify({ type: 'start' }));
    await waitForMessage(socket, (message) => message.type === 'state' && message.state.phase === 'running');

    const webhook = await server.inject({
      method: 'POST',
      url: `/api/webhooks/tiktok/${token}`,
      payload: {
        event: 'comment',
        user: { uniqueId: 'tt_1', nickname: 'TikTok İzleyici' },
        comment: 'selam',
      },
    });
    expect(webhook.statusCode).toBe(200);
    expect(webhook.json().ok).toBe(true);

    const updated = await server.inject({
      method: 'GET',
      url: `/api/arcade/rooms/${room.slug}/public`,
    });
    expect(updated.json().activePlayers).toBeGreaterThanOrEqual(2);
    expect(updated.json().connections[0].platform).toBe('tiktok');
  });

  it('başka yayıncı odaya ve bağlantıya erişemez', async () => {
    built = await makeApp();
    const { app: server } = built;
    const owner = await activatePublisher(server, 'pkg_pro');
    const other = await activatePublisher(server, 'pkg_pro');
    await buyGame(server, owner.cookie, 'offer_quiz_1d');
    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: owner.cookie },
      payload: { gameKey: 'quiz' },
    });
    const room = created.json().room;
    const update = await server.inject({
      method: 'PUT',
      url: `/api/arcade/rooms/${room.id}`,
      headers: { cookie: other.cookie },
      payload: { status: 'disabled' },
    });
    expect(update.statusCode).toBe(403);
    const connect = await server.inject({
      method: 'POST',
      url: `/api/platforms/rooms/${room.id}/connect`,
      headers: { cookie: other.cookie },
      payload: { platform: 'tiktok', channel: 'x' },
    });
    expect(connect.statusCode).toBe(403);
  });

  it('lisanssız yayıncı oda açamaz; süre bitince oda kapanır', async () => {
    built = await makeApp();
    const { app: server, db } = built;
    const free = await registerUser(server);
    const denied = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: free.cookie },
      payload: { gameKey: 'dance' },
    });
    expect(denied.statusCode).toBe(403);

    const publisher = await activatePublisher(server, 'pkg_pro');
    await buyGame(server, publisher.cookie, 'offer_kart_1d');
    const wrongGame = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: publisher.cookie },
      payload: { gameKey: 'dance' },
    });
    expect(wrongGame.statusCode).toBe(403);
    await buyGame(server, publisher.cookie, 'offer_kart_1d');
    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: publisher.cookie },
      payload: { gameKey: 'kart' },
    });
    const room = created.json().room;
    db.prepare('UPDATE game_licenses SET expires_at = ? WHERE user_id = ?').run(
      '2000-01-01T00:00:00.000Z',
      publisher.userId,
    );
    const publicRoom = await server.inject({
      method: 'GET',
      url: `/api/arcade/rooms/${room.slug}/public`,
    });
    expect(publicRoom.json().licensed).toBe(false);
  });

  it('oda duraklatıldığında public erişim kapalı görünür', async () => {
    built = await makeApp();
    const { app: server } = built;
    const publisher = await activatePublisher(server, 'pkg_pro');
    await buyGame(server, publisher.cookie, 'offer_word_1d');
    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: publisher.cookie },
      payload: { gameKey: 'word' },
    });
    const room = created.json().room;
    const paused = await server.inject({
      method: 'PUT',
      url: `/api/arcade/rooms/${room.id}`,
      headers: { cookie: publisher.cookie },
      payload: { status: 'disabled' },
    });
    expect(paused.statusCode).toBe(200);
    const publicRoom = await server.inject({
      method: 'GET',
      url: `/api/arcade/rooms/${room.slug}/public`,
    });
    expect(publicRoom.json().licensed).toBe(false);
  });

  it('moderatör canlı odadaki web oyuncusunu çıkarabilir', async () => {
    built = await makeApp();
    const { app: server } = built;
    const owner = await registerUser(server);
    await buyGame(server, owner.cookie, 'offer_dance_1d');
    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: owner.cookie },
      payload: { gameKey: 'dance' },
    });
    const room = created.json().room;
    const port = await listen(server);
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/arcade/room/${room.slug}`);
    sockets.push(socket);
    await waitForMessage(socket, (message) => message.type === 'hello');
    socket.send(JSON.stringify({ type: 'join', name: 'Mod Testi', clientId: 'mod_test_1' }));
    await waitForMessage(socket, (message) => message.type === 'joined');

    const live = await server.inject({
      method: 'GET',
      url: `/api/arcade/rooms/${room.id}/live`,
      headers: { cookie: owner.cookie },
    });
    expect(live.json().players.some((player: any) => player.name === 'Mod Testi')).toBe(true);
    const kicked = await server.inject({
      method: 'POST',
      url: `/api/arcade/rooms/${room.id}/kick`,
      headers: { cookie: owner.cookie },
      payload: { playerId: 'mod_test_1' },
    });
    expect(kicked.statusCode).toBe(200);
    expect(kicked.json().ok).toBe(true);
    expect(kicked.json().players.some((player: any) => player.name === 'Mod Testi')).toBe(false);
  });

  it('özel dil ve katılım komutu platform sohbetinde uygulanır', async () => {
    built = await makeApp();
    const { app: server } = built;
    const owner = await registerUser(server);
    await buyGame(server, owner.cookie, 'offer_dance_1d');
    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: owner.cookie },
      payload: { gameKey: 'dance' },
    });
    const room = created.json().room;
    const updated = await server.inject({
      method: 'PUT',
      url: `/api/arcade/rooms/${room.id}`,
      headers: { cookie: owner.cookie },
      payload: {
        settings: {
          language: 'en',
          commands: { join: 'gel', leave: 'git', red: 'kirmizi', blue: 'mavi', girls: 'kizlar', boys: 'erkekler', requireJoin: true },
        },
      },
    });
    expect(updated.statusCode).toBe(200);
    const connection = await server.inject({
      method: 'POST',
      url: `/api/platforms/rooms/${room.id}/connect`,
      headers: { cookie: owner.cookie },
      payload: { platform: 'tiktok', channel: 'command_test' },
    });
    const token = (connection.json().connection.connectorUrl as string).split('/').pop()!;
    await server.inject({
      method: 'POST',
      url: `/api/webhooks/tiktok/${token}`,
      payload: { event: 'comment', user: { uniqueId: 'cmd_1', nickname: 'Komut Bir' }, comment: 'gel' },
    });
    const afterJoin = await server.inject({ method: 'GET', url: `/api/arcade/rooms/${room.slug}/public` });
    expect(afterJoin.json().activePlayers).toBeGreaterThanOrEqual(1);

    await server.inject({
      method: 'POST',
      url: `/api/webhooks/tiktok/${token}`,
      payload: { event: 'comment', user: { uniqueId: 'cmd_2', nickname: 'Komut İki' }, comment: 'selam' },
    });
    const afterIgnored = await server.inject({ method: 'GET', url: `/api/arcade/rooms/${room.slug}/public` });
    expect(afterIgnored.json().activePlayers).toBe(afterJoin.json().activePlayers);
    expect(afterIgnored.json().room.settings.commands.join).toBe('gel');
  });

  it('yayıncı Bilgi Arenası için özel soru havuzu kaydeder', async () => {
    built = await makeApp();
    const { app: server } = built;
    const owner = await registerUser(server);
    await buyGame(server, owner.cookie, 'offer_quiz_1d');
    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: owner.cookie },
      payload: { gameKey: 'quiz' },
    });
    const room = created.json().room;
    const question = {
      id: 'custom-test',
      category: 'Özel',
      question: 'Özel soru çalışıyor mu?',
      options: ['Evet', 'Hayır', 'Belki', 'Sonra'],
      answer: 0,
    };
    const saved = await server.inject({
      method: 'PUT',
      url: `/api/arcade/rooms/${room.id}/quiz`,
      headers: { cookie: owner.cookie },
      payload: { questions: [question] },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().room.settings.quizQuestions).toHaveLength(1);
    const publicRoom = await server.inject({
      method: 'GET',
      url: `/api/arcade/rooms/${room.slug}/public`,
    });
    expect(publicRoom.json().room.settings.quizQuestions).toBeUndefined();

    const invalid = await server.inject({
      method: 'PUT',
      url: `/api/arcade/rooms/${room.id}/quiz`,
      headers: { cookie: owner.cookie },
      payload: { questions: [{ category: 'X' }] },
    });
    expect(invalid.statusCode).toBe(400);
  });

  it('kalıcı ban aynı izleyicinin odaya yeniden girmesini engeller', async () => {
    built = await makeApp();
    const { app: server } = built;
    const owner = await registerUser(server);
    await buyGame(server, owner.cookie, 'offer_dance_1d');
    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: owner.cookie },
      payload: { gameKey: 'dance' },
    });
    const room = created.json().room;
    const port = await listen(server);
    const first = new WebSocket(`ws://127.0.0.1:${port}/ws/arcade/room/${room.slug}`);
    sockets.push(first);
    await waitForMessage(first, (message) => message.type === 'hello');
    first.send(JSON.stringify({ type: 'join', name: 'Ban Testi', clientId: 'ban_test_1' }));
    await waitForMessage(first, (message) => message.type === 'joined');

    const banned = await server.inject({
      method: 'POST',
      url: `/api/arcade/rooms/${room.id}/kick`,
      headers: { cookie: owner.cookie },
      payload: { playerId: 'ban_test_1', ban: true, reason: 'Test' },
    });
    expect(banned.statusCode).toBe(200);
    expect(banned.json().bans).toHaveLength(1);

    const second = new WebSocket(`ws://127.0.0.1:${port}/ws/arcade/room/${room.slug}`);
    sockets.push(second);
    await waitForMessage(second, (message) => message.type === 'hello');
    second.send(JSON.stringify({ type: 'join', name: 'Ban Testi', clientId: 'ban_test_1' }));
    const blocked = await waitForMessage(second, (message) => message.type === 'error');
    expect(blocked.error).toContain('kalıcı');

    const unbanned = await server.inject({
      method: 'DELETE',
      url: `/api/arcade/rooms/${room.id}/bans/ban_test_1`,
      headers: { cookie: owner.cookie },
    });
    expect(unbanned.statusCode).toBe(200);
    expect(unbanned.json().bans).toHaveLength(0);
  });

  it('ortak yayıncı davet edilir, odayı yönetir ve kendi platformunu bağlar', async () => {
    built = await makeApp();
    const { app: server } = built;
    const owner = await registerUser(server);
    const cohost = await registerUser(server);
    await buyGame(server, owner.cookie, 'offer_dance_1d');
    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: owner.cookie },
      payload: { gameKey: 'dance' },
    });
    expect(created.statusCode).toBe(201);
    const room = created.json().room;

    const invited = await server.inject({
      method: 'POST',
      url: `/api/arcade/rooms/${room.id}/hosts`,
      headers: { cookie: owner.cookie },
      payload: { email: cohost.email },
    });
    expect(invited.statusCode).toBe(201);
    expect(invited.json().hosts).toHaveLength(1);

    const list = await server.inject({
      method: 'GET',
      url: '/api/arcade/rooms',
      headers: { cookie: cohost.cookie },
    });
    expect(list.json().rooms.some((entry: any) => entry.id === room.id && entry.isOwner === false)).toBe(true);

    const updated = await server.inject({
      method: 'PUT',
      url: `/api/arcade/rooms/${room.id}`,
      headers: { cookie: cohost.cookie },
      payload: { name: 'Ortak Sahne' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().room.name).toBe('Ortak Sahne');

    const connection = await server.inject({
      method: 'POST',
      url: `/api/platforms/rooms/${room.id}/connect`,
      headers: { cookie: cohost.cookie },
      payload: { platform: 'tiktok', channel: 'cohost_channel' },
    });
    expect(connection.statusCode).toBe(201);

    const forbidden = await server.inject({
      method: 'POST',
      url: `/api/arcade/rooms/${room.id}/hosts`,
      headers: { cookie: cohost.cookie },
      payload: { email: owner.email },
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it('günde 30 dakikalık ücretsiz deneme lisansı açar ve tekrarı engeller', async () => {
    built = await makeApp();
    const { app: server, db } = built;
    const user = await registerUser(server);
    const first = await server.inject({
      method: 'POST',
      url: '/api/arcade/trial',
      headers: { cookie: user.cookie },
      payload: { gameKey: 'dance' },
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().minutes).toBe(30);
    expect(first.json().trial.active).toBe(true);
    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: user.cookie } });
    expect(me.json().licenses.some((license: any) => license.gameKey === 'dance')).toBe(true);

    const second = await server.inject({
      method: 'POST',
      url: '/api/arcade/trial',
      headers: { cookie: user.cookie },
      payload: { gameKey: 'quiz' },
    });
    expect(second.statusCode).toBe(409);

    const room = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: user.cookie },
      payload: { gameKey: 'dance' },
    });
    expect(room.statusCode).toBe(201);
    db.prepare("UPDATE game_licenses SET expires_at = '2000-01-01T00:00:00.000Z' WHERE user_id = ?").run(
      user.userId,
    );
    const publicRoom = await server.inject({
      method: 'GET',
      url: `/api/arcade/rooms/${room.json().room.slug}/public`,
    });
    expect(publicRoom.json().licensed).toBe(false);
  });

  it('public liderlik tablosu yayıncı ve oyun özeti döner', async () => {
    built = await makeApp();
    const { app: server } = built;
    const response = await server.inject({ method: 'GET', url: '/api/leaderboard' });
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.json().publishers)).toBe(true);
    expect(Array.isArray(response.json().games)).toBe(true);
    expect(typeof response.json().totals.rounds).toBe('number');
  });

  it('kupon kodu ödeme tutarını düşürür ve tüm oyun paketini açar', async () => {
    built = await makeApp();
    const { app: server } = built;
    const user = await registerUser(server);
    const checkout = await server.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { cookie: user.cookie },
      payload: { packageId: 'offer_bundle_all_1d', couponCode: 'MEYDAN10' },
    });
    expect(checkout.statusCode).toBe(201);
    expect(checkout.json().payment.amountCents).toBe(17910);
    const paid = await server.inject({
      method: 'POST',
      url: `/api/test-payments/${checkout.json().payment.id}/pay`,
      headers: { cookie: user.cookie },
      payload: { outcome: 'success' },
    });
    expect(paid.statusCode).toBe(200);
    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: user.cookie } });
    expect(me.json().licenses).toHaveLength(30);
  });

  it('tüm oyunlar paketi 30 oyun lisansını birlikte açar', async () => {
    built = await makeApp();
    const { app: server } = built;
    const user = await registerUser(server);
    await buyGame(server, user.cookie, 'offer_bundle_all_1d');

    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: user.cookie } });
    expect(me.json().licenses).toHaveLength(30);
    expect(new Set(me.json().licenses.map((license: any) => license.gameKey)).size).toBe(30);

    const room = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: user.cookie },
      payload: { gameKey: 'horse' },
    });
    expect(room.statusCode).toBe(201);
  });

  it('oyun bazlı lisans yalnızca satın alınan oyunu açar ve oda özelleştirilebilir', async () => {
    built = await makeApp();
    const { app: server } = built;
    const user = await registerUser(server);
    await buyGame(server, user.cookie, 'offer_dance_30d');

    const me = await server.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: user.cookie } });
    expect(me.json().licenses.some((license: any) => license.gameKey === 'dance')).toBe(true);
    expect(me.json().licenses.some((license: any) => license.gameKey === 'quiz')).toBe(false);

    const roomResponse = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: user.cookie },
      payload: { gameKey: 'dance' },
    });
    expect(roomResponse.statusCode).toBe(201);
    const room = roomResponse.json().room;

    const denied = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: user.cookie },
      payload: { gameKey: 'quiz' },
    });
    expect(denied.statusCode).toBe(403);

    const customized = await server.inject({
      method: 'PUT',
      url: `/api/arcade/rooms/${room.id}`,
      headers: { cookie: user.cookie },
      payload: {
        name: 'Gece Sahnesi',
        settings: { welcomeText: 'Bu gece sahne bizim.', accent: '#e0558f' },
      },
    });
    expect(customized.statusCode).toBe(200);
    const publicRoom = await server.inject({
      method: 'GET',
      url: `/api/arcade/rooms/${room.slug}/public`,
    });
    expect(publicRoom.json().room.name).toBe('Gece Sahnesi');
    expect(publicRoom.json().room.settings.welcomeText).toBe('Bu gece sahne bizim.');
  });
});

describe('platform normalizasyonu', () => {
  it('Twitch IRC mesajını yorum ve bits hediyesine çevirir', () => {
    const comment = parseTwitchLine(
      '@badges=;color=#fff;display-name=Deniz;user-id=42;id=abc123 :deniz!deniz@deniz.tmi.twitch.tv PRIVMSG #kanal :merhaba',
    );
    expect(comment?.kind).toBe('comment');
    expect(comment?.viewer.name).toBe('Deniz');
    expect(comment?.text).toBe('merhaba');
    const bits = parseTwitchLine(
      '@bits=100;display-name=Deniz;user-id=42;id=abc124 :deniz!deniz@deniz.tmi.twitch.tv PRIVMSG #kanal :cheer100',
    );
    expect(bits?.kind).toBe('gift');
    expect(bits?.amount).toBe(100);
  });

  it('YouTube Super Chat ve TikTok esnek gövdesini normalize eder', () => {
    const youtube = mapYouTubeChatItem({
      id: 'yt1',
      snippet: {
        type: 'superChatEvent',
        displayMessage: 'Harika yayın',
        superChatDetails: { amountMicros: '25000000' },
      },
      authorDetails: { channelId: 'UC1', displayName: 'Ayşe' },
    });
    expect(youtube?.kind).toBe('gift');
    expect(youtube?.amount).toBe(25);
    expect(youtube?.viewer.name).toBe('Ayşe');

    const tiktok = normalizeTikTokEvent({
      event: 'gift',
      user: { uniqueId: 'tt9', nickname: 'Ece' },
      giftName: 'Gül',
      giftCount: 4,
    });
    expect(tiktok?.platform).toBe('tiktok');
    expect(tiktok?.kind).toBe('gift');
    expect(tiktok?.amount).toBe(4);

    const tikfinity = normalizeTikTokEvent({
      content: 'TikTok Comment Webhook',
      commandParams: 'merhaba',
      userId: '6915',
      username: 'user123',
      nickname: 'User 123',
    });
    expect(tikfinity?.kind).toBe('comment');
    expect(tikfinity?.text).toBe('merhaba');
    expect(tikfinity?.viewer.name).toBe('User 123');
  });
});

describe('ilk platform olayı', () => {
  it('TikTok yorumu odayı başlatır ve yorum oyuna işlenir', async () => {
    built = await makeApp();
    const { app: server, db, arcade } = built;
    const publisher = await activatePublisher(server, 'pkg_pro');
    await buyGame(server, publisher.cookie, 'offer_word_1d');
    const created = await server.inject({
      method: 'POST',
      url: '/api/arcade/rooms',
      headers: { cookie: publisher.cookie },
      payload: { gameKey: 'word' },
    });
    const room = created.json().room;
    const connection = await server.inject({
      method: 'POST',
      url: `/api/platforms/rooms/${room.id}/connect`,
      headers: { cookie: publisher.cookie },
      payload: { platform: 'tiktok', channel: 'testchannel' },
    });
    const token = (connection.json().connection.connectorUrl as string).split('/').pop()!;
    const webhook = await server.inject({
      method: 'POST',
      url: `/api/webhooks/tiktok/${token}`,
      payload: {
        event: 'comment',
        user: { uniqueId: 'tt_first', nickname: 'İlk İzleyici' },
        comment: 'ankara',
      },
    });
    expect(webhook.statusCode).toBe(200);
    expect(webhook.json().ok).toBe(true);
    const row = db.prepare('SELECT * FROM arcade_rooms WHERE id = ?').get(room.id) as any;
    const summary = arcade.getRoomSummary(row);
    expect(summary?.phase).toBe('running');
    expect(summary?.players).toBe(1);
  });
});
