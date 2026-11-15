import { ARCADE_GAME_LIST } from '../shared/arcade';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import {
  addArcadePlayer,
  arcadeAction,
  arcadeTick,
  arcadeView,
  createArcadeState,
  startArcadeRound,
} from '../shared/arcade';
import type { BuiltApp } from '../server/src/app';
import { listen, makeApp } from './helpers';

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

describe('arcade motoru', () => {
  it('quiz sorusu üretir, doğru cevabı puanlar ve cevabı gizler', () => {
    const state = createArcadeState('quiz', 1_000);
    addArcadePlayer(state, { id: 'p1', name: 'Deniz', now: 1_000 });
    addArcadePlayer(state, { id: 'p2', name: 'Ece', now: 1_000 });
    startArcadeRound(state, 1_000);
    expect(state.phase).toBe('running');
    expect(state.prompt?.kind).toBe('quiz');
    const view = arcadeView(state, 'p1');
    expect(view.prompt?.answerIndex).toBeUndefined();
    const answer = String.fromCharCode(65 + (state.prompt!.answerIndex ?? 0));
    const result = arcadeAction(state, 'p1', 'comment', answer, 1_500);
    expect(result.correct).toBe(true);
    expect(state.players.find((player) => player.id === 'p1')?.score).toBe(100);
    state.prompt!.reveal = true;
    expect(arcadeView(state).prompt?.answerIndex).toBeDefined();
  });

  it('özel quiz havuzundan soru üretir ve doğru cevabı kullanır', () => {
    const state = createArcadeState('quiz', 1_000);
    state.quizPool = [
      {
        id: 'custom-1',
        category: 'Özel',
        question: 'Bu özel soru mu?',
        options: ['Evet', 'Hayır', 'Belki', 'Hiçbiri'],
        answer: 0,
      },
    ];
    addArcadePlayer(state, { id: 'p1', name: 'Deniz', now: 1_000 });
    startArcadeRound(state, 1_000);
    expect(state.prompt?.question).toBe('Bu özel soru mu?');
    expect(state.prompt?.options?.[0]).toBe('Evet');
  });

  it('kelime cevabı yalnızca doğru kategori ve harfte kabul edilir', () => {
    const state = createArcadeState('word', 1_000);
    addArcadePlayer(state, { id: 'p1', name: 'Mert', now: 1_000 });
    startArcadeRound(state, 1_000);
    const prompt = state.prompt!;
    prompt.category = 'Şehir';
    prompt.letter = 'A';
    const correct = arcadeAction(state, 'p1', 'comment', 'ankara', 1_500);
    expect(correct.correct).toBe(true);
    expect(state.players[0]!.score).toBe(100);
  });

  it('yarışta bitişe ulaşan oyuncu turu bitirir', () => {
    const state = createArcadeState('kart', 1_000);
    addArcadePlayer(state, { id: 'p1', name: 'Kaan', now: 1_000 });
    addArcadePlayer(state, { id: 'p2', name: 'Nil', now: 1_000 });
    startArcadeRound(state, 1_000);
    state.players[0]!.progress = 99.9;
    arcadeTick(state, 1_150);
    expect(state.phase).toBe('finished');
    expect(state.winner?.playerId).toBe('p1');
  });

  it('çarkıfelek biletlere göre döner ve kazananı belirler', () => {
    const state = createArcadeState('wheel', 1_000);
    addArcadePlayer(state, { id: 'p1', name: 'Merve', now: 1_000 });
    addArcadePlayer(state, { id: 'p2', name: 'Kaan', now: 1_000 });
    startArcadeRound(state, 1_000);
    state.players[0]!.score = 50;
    state.players[1]!.score = 1;
    state.wheel!.nextSpinAt = 1_001;
    arcadeTick(state, 1_100);
    expect(state.wheel!.spin?.winnerId).toBe('p1');
    expect(state.players[0]!.wins).toBe(1);
    expect(state.wheel!.spin?.segment).toBe(0);
  });

  it('halat çekmede halatı karşıya geçiren takım kazanır', () => {
    const state = createArcadeState('tug', 1_000);
    addArcadePlayer(state, { id: 'p1', name: 'Elif', now: 1_000 });
    addArcadePlayer(state, { id: 'p2', name: 'Deniz', now: 1_000 });
    startArcadeRound(state, 1_000);
    expect(state.players[0]!.side).toBe('red');
    expect(state.players[1]!.side).toBe('blue');
    state.tug!.blue = 100;
    arcadeTick(state, 1_200);
    expect(state.phase).toBe('finished');
    expect(state.tug!.winningSide).toBe('blue');
    expect(state.winner?.label).toContain('Mavi');
  });

  it('kızlar erkekler duvarını karşıya iten takım kazanır', () => {
    const state = createArcadeState('versus', 1_000);
    addArcadePlayer(state, { id: 'p1', name: 'Elif', side: 'girls', now: 1_000 });
    addArcadePlayer(state, { id: 'p2', name: 'Kaan', side: 'boys', now: 1_000 });
    startArcadeRound(state, 1_000);
    expect(state.players[0]!.side).toBe('girls');
    expect(state.players[1]!.side).toBe('boys');
    state.wall!.girls = 20;
    arcadeTick(state, 1_200);
    expect(state.phase).toBe('finished');
    expect(state.wall!.winningSide).toBe('girls');
    expect(state.winner?.label).toContain('Kızlar');
  });

  it('at yarışında jokey hattı bitişe ulaşınca tur biter', () => {
    const state = createArcadeState('horse', 1_000);
    addArcadePlayer(state, { id: 'p1', name: 'Deniz', lane: 1, now: 1_000 });
    addArcadePlayer(state, { id: 'p2', name: 'Kaan', lane: 2, now: 1_000 });
    startArcadeRound(state, 1_000);
    expect(state.players[0]!.lane).toBe(1);
    const lane = state.horse!.lanes.find((entry) => entry.id === 1)!;
    lane.progress = 100;
    arcadeTick(state, 1_300);
    expect(state.phase).toBe('finished');
    expect(state.horse!.winnerLane).toBe(1);
    expect(state.winner?.label).toContain('Deniz');
  });

  it('tepe, grand prix ve animal run yarışlarında bitişe ulaşan kazanır', () => {
    for (const key of ['hill', 'grandprix', 'animal'] as const) {
      const state = createArcadeState(key, 1_000);
      addArcadePlayer(state, { id: 'p1', name: 'Deniz', now: 1_000 });
      startArcadeRound(state, 1_000);
      state.players[0]!.progress = 99.9;
      arcadeTick(state, 1_300);
      expect(state.phase).toBe('finished');
      expect(state.winner?.playerId).toBe('p1');
    }
  });

  it('balon, brick, chest, egg ve manor yeni oyunları çalışır', () => {
    const balloon = createArcadeState('balloon', 1_000);
    addArcadePlayer(balloon, { id: 'p1', name: 'Deniz', now: 1_000 });
    startArcadeRound(balloon, 1_000);
    balloon.players[0]!.progress = 99.9;
    arcadeTick(balloon, 1_300);
    expect(balloon.phase).toBe('finished');

    const brick = createArcadeState('brick', 1_000);
    addArcadePlayer(brick, { id: 'p1', name: 'Elif', now: 1_000 });
    startArcadeRound(brick, 1_000);
    brick.players[0]!.progress = 99.9;
    arcadeTick(brick, 1_300);
    expect(brick.phase).toBe('finished');

    const chest = createArcadeState('chest', 1_000);
    addArcadePlayer(chest, { id: 'p1', name: 'Kaan', now: 1_000 });
    startArcadeRound(chest, 1_000);
    chest.gold!.pulled = 100;
    arcadeTick(chest, 1_300);
    expect(chest.phase).toBe('finished');

    const egg = createArcadeState('egg', 1_000);
    addArcadePlayer(egg, { id: 'p1', name: 'Ece', now: 1_000 });
    startArcadeRound(egg, 1_000);
    egg.melon!.tension = 100;
    arcadeTick(egg, 1_300);
    expect(egg.phase).toBe('finished');

    const manor = createArcadeState('manor', 1_000);
    addArcadePlayer(manor, { id: 'p1', name: 'A', now: 1_000 });
    addArcadePlayer(manor, { id: 'p2', name: 'B', now: 1_000 });
    startArcadeRound(manor, 1_000);
    manor.players[1]!.eliminated = true;
    arcadeTick(manor, 1_300);
    expect(manor.phase).toBe('finished');
  });

  it('karpuz ve altın ortak hedefte, team clash duvarda biter', () => {
    const melon = createArcadeState('melon', 1_000);
    addArcadePlayer(melon, { id: 'p1', name: 'Elif', now: 1_000 });
    startArcadeRound(melon, 1_000);
    melon.melon!.tension = 100;
    arcadeTick(melon, 1_300);
    expect(melon.phase).toBe('finished');

    const gold = createArcadeState('gold', 1_000);
    addArcadePlayer(gold, { id: 'p1', name: 'Kaan', now: 1_000 });
    startArcadeRound(gold, 1_000);
    gold.gold!.pulled = 100;
    arcadeTick(gold, 1_300);
    expect(gold.phase).toBe('finished');

    const clash = createArcadeState('clash', 1_000);
    addArcadePlayer(clash, { id: 'p1', name: 'A', side: 'girls', now: 1_000 });
    startArcadeRound(clash, 1_000);
    clash.wall!.girls = 30;
    arcadeTick(clash, 1_300);
    expect(clash.phase).toBe('finished');
    expect(clash.wall!.winningSide).toBe('girls');
  });

  it('hediye ve beğeni görünür action olayı üretir', () => {
    const egg = createArcadeState('egg', 1_000);
    addArcadePlayer(egg, { id: 'p1', name: 'Ece', now: 1_000 });
    startArcadeRound(egg, 1_000);
    const result = arcadeAction(egg, 'p1', 'gift', '', 1_400);
    expect(result.ok).toBe(true);
    expect(egg.lastAction?.kind).toBe('gift');
    expect(egg.lastAction?.tier).toBe(3);
    expect(egg.lastAction?.combo).toBeGreaterThan(0);
    expect(egg.lastAction?.playerId).toBe('p1');
    expect(egg.melon!.tension).toBeGreaterThan(0);

    const manor = createArcadeState('manor', 2_000);
    addArcadePlayer(manor, { id: 'p2', name: 'Kaan', now: 2_000 });
    startArcadeRound(manor, 2_000);
    manor.players[0]!.hp = 40;
    arcadeAction(manor, 'p2', 'gift', '', 2_400);
    expect(manor.players[0]!.hp).toBeGreaterThan(40);
    expect(manor.lastAction?.kind).toBe('gift');
  });

  it('arenada son kalan oyuncu kazanır', () => {
    const state = createArcadeState('gladiator', 1_000);
    addArcadePlayer(state, { id: 'p1', name: 'Can', now: 1_000 });
    addArcadePlayer(state, { id: 'p2', name: 'Ece', now: 1_000 });
    startArcadeRound(state, 1_000);
    state.players[1]!.hp = 0;
    state.players[1]!.eliminated = true;
    arcadeTick(state, 1_150);
    expect(state.phase).toBe('finished');
    expect(state.winner?.playerId).toBe('p1');
  });
});

describe('arcade API ve WebSocket', () => {
  it('tüm oyunları listeler ve odaya katılımı kabul eder', async () => {
    built = await makeApp();
    const { app: server } = built;
    const games = await server.inject({ method: 'GET', url: '/api/arcade/games' });
    expect(games.statusCode).toBe(200);
    expect(games.json().games).toHaveLength(ARCADE_GAME_LIST.length);
    expect(games.json().games[0].slug).toBe('sahne-90');

    const port = await listen(server);
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/arcade/dance`);
    sockets.push(socket);
    await waitForMessage(socket, (message) => message.type === 'hello');
    const initialState = await waitForMessage(socket, (message) => message.type === 'state');
    expect(initialState.state.players.length).toBeGreaterThan(0);
    socket.send(JSON.stringify({ type: 'join', name: 'Test İzleyici', clientId: 'arcade_test_1' }));
    const joined = await waitForMessage(socket, (message) => message.type === 'joined');
    expect(joined.playerId).toBe('arcade_test_1');
    socket.send(JSON.stringify({ type: 'action', kind: 'like', payload: '' }));
    const noticed = await waitForMessage(
      socket,
      (message) => message.type === 'notice' || message.type === 'state',
    );
    expect(['notice', 'state']).toContain(noticed.type);
  });
});
