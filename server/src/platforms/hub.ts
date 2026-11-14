import WebSocket from 'ws';
import type { AppConfig } from '../config.js';
import type { DB } from '../db/index.js';
import {
  findActiveGameLicense,
  findArcadeRoomById,
  findPlatformConnectionByToken,
  markPlatformConnectionEvent,
  updatePlatformConnectionStatus,
  type ArcadeRoomRow,
  type PlatformConnectionRow,
} from '../db/repo.js';
import { nowIso } from '../db/index.js';
import type { ArcadeRuntime, NormalizedPlatformEvent } from '../arcade/runtime.js';
import { randomId } from '../lib/tokens.js';

interface ConnectionRunner {
  stop: () => void;
}

interface TwitchParsed {
  kind: NormalizedPlatformEvent['kind'];
  viewer: { id: string; name: string; avatar?: string };
  text?: string;
  giftName?: string;
  amount?: number;
  eventId: string;
}

type Logger = Pick<Console, 'info' | 'error'>;

/**
 * TikTok / YouTube / Twitch köprüsü.
 *
 * - Twitch: anonim IRC WebSocket ile public sohbeti okur (OAuth gerekmez).
 * - YouTube: Data API v3 anahtarı ile aktif canlı yayının sohbetini poll eder.
 * - TikTok: resmî canlı sohbet API'si olmadığı için TikFinity/TikTools/Streamer.bot
 *   gibi bir köprünün POST edebileceği imzalı/anahtarlı connector webhook'u.
 */
export class PlatformHub {
  private runners = new Map<string, ConnectionRunner>();
  private stopped = false;

  constructor(
    private readonly db: DB,
    private readonly config: AppConfig,
    private readonly arcade: ArcadeRuntime,
    private readonly logger: Logger = console,
  ) {}

  start(connections: PlatformConnectionRow[]): void {
    for (const connection of connections) {
      if (connection.status === 'disconnected') continue;
      this.startConnection(connection);
    }
  }

  startConnection(connection: PlatformConnectionRow): void {
    this.stopConnection(connection.id);
    if (this.stopped) return;
    if (connection.platform === 'twitch') {
      this.runners.set(connection.id, this.startTwitch(connection));
      return;
    }
    if (connection.platform === 'youtube') {
      if (!this.config.youtubeApiKey) {
        this.setStatus(connection, 'error', 'YOUTUBE_API_KEY tanımlı değil.');
        return;
      }
      this.runners.set(connection.id, this.startYouTube(connection));
      return;
    }
    // TikTok webhook tabanlı: bağlantı kurulduğunda olay beklenir.
    this.setStatus(connection, 'connected', null);
  }

  stopConnection(id: string): void {
    const runner = this.runners.get(id);
    if (runner) {
      runner.stop();
      this.runners.delete(id);
    }
  }

  disconnect(id: string): void {
    this.stopConnection(id);
  }

  shutdown(): void {
    this.stopped = true;
    for (const runner of this.runners.values()) runner.stop();
    this.runners.clear();
  }

  /** TikTok connector webhook'undan gelen esnek gövdeyi normalize eder. */
  handleTikTokWebhook(token: string, body: unknown): { ok: boolean; reason?: string } {
    const connection = findPlatformConnectionByToken(this.db, token);
    if (!connection || connection.platform !== 'tiktok') {
      return { ok: false, reason: 'Connector bulunamadı.' };
    }
    const event = normalizeTikTokEvent(body);
    if (!event) return { ok: false, reason: 'Olay verisi tanınamadı.' };
    const room = this.licensedRoom(connection.room_id);
    if (!room) return { ok: false, reason: 'Oda kapalı veya lisans süresi dolmuş.' };
    const result = this.arcade.ingestPlatformEvent(room, event);
    if (result.accepted) markPlatformConnectionEvent(this.db, connection.id, nowIso());
    return { ok: result.accepted, reason: result.reason };
  }

  private startTwitch(connection: PlatformConnectionRow): ConnectionRunner {
    const channel = normalizeTwitchChannel(connection.channel);
    let socket: WebSocket | null = null;
    let retry: NodeJS.Timeout | null = null;
    let disposed = false;
    const connect = () => {
      if (disposed) return;
      try {
        socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      } catch (error) {
        this.setStatus(connection, 'error', `Twitch bağlantısı kurulamadı: ${String(error)}`);
        return;
      }
      socket.on('open', () => {
        if (disposed || !socket) return;
        socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        socket.send('PASS SCHMOOPIIE');
        socket.send(`NICK justinfan${Math.floor(Math.random() * 90000) + 10000}`);
        socket.send(`JOIN #${channel}`);
        this.setStatus(connection, 'connected', null);
      });
      socket.on('message', (raw) => {
        const text = raw.toString();
        for (const line of text.split('\r\n')) {
          if (line.startsWith('PING')) {
            socket?.send('PONG :tmi.twitch.tv');
            continue;
          }
          const parsed = parseTwitchLine(line);
          if (!parsed) continue;
          const event: NormalizedPlatformEvent = {
            id: parsed.eventId,
            platform: 'twitch',
            kind: parsed.kind,
            viewer: parsed.viewer,
            text: parsed.text,
            giftName: parsed.giftName,
            amount: parsed.amount,
          };
          const room = this.licensedRoom(connection.room_id);
          if (room) {
            const result = this.arcade.ingestPlatformEvent(room, event);
            if (result.accepted) markPlatformConnectionEvent(this.db, connection.id, nowIso());
          }
        }
      });
      socket.on('error', () => {
        this.setStatus(connection, 'error', 'Twitch sohbet bağlantısı hata verdi.');
      });
      socket.on('close', () => {
        if (disposed) return;
        this.setStatus(connection, 'error', 'Twitch bağlantısı kapandı; yeniden deneniyor.');
        retry = setTimeout(connect, 6000);
      });
    };
    connect();
    return {
      stop: () => {
        disposed = true;
        if (retry) clearTimeout(retry);
        socket?.close();
      },
    };
  }

  private startYouTube(connection: PlatformConnectionRow): ConnectionRunner {
    let timer: NodeJS.Timeout | null = null;
    let stopped = false;
    let liveChatId: string | null = null;
    let pageToken: string | null = null;
    let channelId: string | null = null;

    const poll = async () => {
      if (stopped) return;
      try {
        if (!channelId) {
          const resolved = await resolveYouTubeChannel(connection.channel, this.config.youtubeApiKey);
          channelId = resolved.id;
        }
        if (!liveChatId) {
          const live = await findYouTubeLiveChat(channelId, this.config.youtubeApiKey);
          if (!live) {
            this.setStatus(connection, 'connected', 'Kanal bağlı; canlı yayın bekleniyor.');
            return;
          }
          liveChatId = live.liveChatId;
        }
        const result = await fetchYouTubeChat(
          liveChatId,
          pageToken,
          this.config.youtubeApiKey,
        );
        pageToken = result.nextPageToken ?? pageToken;
        for (const item of result.items) {
          const event = mapYouTubeChatItem(item);
          if (!event) continue;
          const room = this.licensedRoom(connection.room_id);
          if (room) {
            const result = this.arcade.ingestPlatformEvent(room, { ...event, platform: 'youtube' });
            if (result.accepted) markPlatformConnectionEvent(this.db, connection.id, nowIso());
          }
        }
        this.setStatus(connection, 'connected', null);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('liveChatEnded') || message.includes('notFound')) {
          liveChatId = null;
          pageToken = null;
        }
        this.setStatus(connection, 'error', message.slice(0, 180));
      }
    };

    void poll();
    timer = setInterval(() => void poll(), 4000);
    return {
      stop: () => {
        stopped = true;
        if (timer) clearInterval(timer);
      },
    };
  }

  private licensedRoom(roomId: string): ArcadeRoomRow | null {
    const room = findArcadeRoomById(this.db, roomId);
    if (!room || room.status !== 'live') return null;
    if (!findActiveGameLicense(this.db, room.user_id, room.game_key, nowIso())) return null;
    return room;
  }

  private setStatus(
    connection: PlatformConnectionRow,
    status: PlatformConnectionRow['status'],
    error: string | null,
  ): void {
    try {
      updatePlatformConnectionStatus(this.db, connection.id, status, error, nowIso());
    } catch (dbError) {
      this.logger.error(`Platform durumu güncellenemedi: ${String(dbError)}`);
    }
  }
}

function normalizeTwitchChannel(value: string): string {
  return value
    .trim()
    .replace(/^#/, '')
    .replace(/^https?:\/\/[^/]+\//i, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 25);
}

export function parseTwitchLine(line: string): TwitchParsed | null {
  if (!line.trim()) return null;
  let rest = line.trim();
  const tags: Record<string, string> = {};
  if (rest.startsWith('@')) {
    const end = rest.indexOf(' ');
    if (end < 0) return null;
    for (const part of rest.slice(1, end).split(';')) {
      const [key, value] = part.split('=');
      if (key) tags[key] = value ?? '';
    }
    rest = rest.slice(end + 1).trim();
  }
  if (!rest.startsWith(':')) return null;
  const prefixEnd = rest.indexOf(' ');
  if (prefixEnd < 0) return null;
  const prefix = rest.slice(1, prefixEnd);
  rest = rest.slice(prefixEnd + 1).trim();
  const commandEnd = rest.indexOf(' ');
  const command = commandEnd < 0 ? rest : rest.slice(0, commandEnd);
  const params = commandEnd < 0 ? '' : rest.slice(commandEnd + 1);
  const nick = prefix.split('!')[0] ?? 'twitch';
  const viewerId = tags['user-id'] || nick;
  const viewerName = tags['display-name'] || nick;

  if (command === 'PRIVMSG') {
    const messageIndex = params.indexOf(' :');
    const text = messageIndex >= 0 ? params.slice(messageIndex + 2) : '';
    const bits = Number(tags.bits ?? 0);
    if (bits > 0) {
      return {
        kind: 'gift',
        viewer: { id: viewerId, name: viewerName },
        text,
        giftName: 'Twitch Bits',
        amount: bits,
        eventId: tags.id || `twitch-${randomId('evt')}`,
      };
    }
    return {
      kind: 'comment',
      viewer: { id: viewerId, name: viewerName },
      text,
      eventId: tags.id || `twitch-${randomId('evt')}`,
    };
  }

  if (command === 'USERNOTICE') {
    const msgId = tags['msg-id'] ?? 'notice';
    const kind: NormalizedPlatformEvent['kind'] =
      msgId === 'sub' || msgId === 'resub' || msgId === 'subgift' || msgId === 'bitsbadgetier'
        ? 'gift'
        : 'follow';
    return {
      kind,
      viewer: { id: viewerId, name: viewerName },
      text: `Twitch ${msgId}`,
      giftName: msgId,
      eventId: tags.id || `twitch-${randomId('evt')}`,
    };
  }
  return null;
}

export function normalizeTikTokEvent(body: unknown): NormalizedPlatformEvent | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, any>;
  const nested = (data.data && typeof data.data === 'object' ? data.data : {}) as Record<string, any>;
  const merged = { ...data, ...nested };
  const user = (merged.user ?? merged.viewer ?? merged.author ?? {}) as Record<string, any>;
  const viewerId =
    String(
      user.uniqueId ??
        user.userId ??
        user.id ??
        merged.uniqueId ??
        merged.userId ??
        merged.username ??
        '',
    ).trim() || 'tiktok_viewer';
  const viewerName =
    String(
      user.nickname ??
        user.displayName ??
        user.uniqueId ??
        merged.nickname ??
        merged.userName ??
        merged.username ??
        viewerId,
    ).trim() || 'TikTok izleyici';
  const viewerAvatar = String(
    user.profilePictureUrl ??
      user.profilePicture ??
      user.avatarUrl ??
      user.avatar ??
      merged.profilePictureUrl ??
      merged.avatarUrl ??
      '',
  ).trim();
  const rawType = String(
    merged.eventType ??
      merged.event ??
      merged.type ??
      merged.eventName ??
      merged.content ??
      '',
  ).toLowerCase();
  const giftPresent = Boolean(
    merged.giftName ?? merged.giftId ?? user.giftName ?? (merged.gift && typeof merged.gift === 'object'),
  );
  const kind: NormalizedPlatformEvent['kind'] = rawType.includes('gift') || giftPresent
    ? 'gift'
    : rawType.includes('like')
      ? 'like'
      : rawType.includes('follow') || rawType.includes('member')
        ? 'follow'
        : rawType.includes('share')
          ? 'share'
          : 'comment';
  const gift = (merged.gift && typeof merged.gift === 'object' ? merged.gift : {}) as Record<string, any>;
  const text = String(
    merged.comment ??
      merged.message ??
      merged.text ??
      merged.commandParams ??
      merged.chatMessage ??
      '',
  ).slice(0, 200);
  const eventId = String(
    merged.eventId ?? merged.msgId ?? merged.messageId ?? merged.id ?? `tiktok-${randomId('evt')}`,
  );
  return {
    id: eventId,
    platform: 'tiktok',
    kind,
    viewer: { id: viewerId, name: viewerName, avatar: viewerAvatar || undefined },
    text,
    giftName: String(merged.giftName ?? gift.name ?? gift.id ?? 'TikTok hediyesi'),
    amount: Number(merged.giftCount ?? merged.repeatCount ?? merged.count ?? 1) || 1,
  };
}

async function resolveYouTubeChannel(
  value: string,
  apiKey: string,
): Promise<{ id: string; title: string }> {
  const clean = value.trim();
  const params = new URLSearchParams({ part: 'snippet', key: apiKey });
  if (clean.startsWith('UC') && clean.length > 20) params.set('id', clean);
  else if (clean.startsWith('@')) params.set('forHandle', clean);
  else params.set('forUsername', clean);
  const result = await ytFetch(`channels?${params.toString()}`);
  const item = result.items?.[0];
  if (!item?.id) throw new Error('YouTube kanalı bulunamadı.');
  return { id: item.id, title: item.snippet?.title ?? value };
}

async function findYouTubeLiveChat(
  channelId: string,
  apiKey: string,
): Promise<{ liveChatId: string; videoId: string } | null> {
  const searchParams = new URLSearchParams({
    part: 'snippet',
    channelId,
    eventType: 'live',
    type: 'video',
    maxResults: '1',
    key: apiKey,
  });
  const search = await ytFetch(`search?${searchParams.toString()}`);
  const videoId = search.items?.[0]?.id?.videoId as string | undefined;
  if (!videoId) return null;
  const videos = await ytFetch(
    `videos?part=liveStreamingDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`,
  );
  const liveChatId = videos.items?.[0]?.liveStreamingDetails?.activeLiveChatId as string | undefined;
  if (!liveChatId) return null;
  return { liveChatId, videoId };
}

async function fetchYouTubeChat(
  liveChatId: string,
  pageToken: string | null,
  apiKey: string,
): Promise<{ items: any[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    liveChatId,
    part: 'id,snippet,authorDetails',
    maxResults: '200',
    key: apiKey,
  });
  if (pageToken) params.set('pageToken', pageToken);
  return ytFetch(`liveChat/messages?${params.toString()}`);
}

async function ytFetch(path: string): Promise<any> {
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${path}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason ?? data?.error?.message ?? 'YouTube API hatası';
    throw new Error(`${response.status}: ${reason}`);
  }
  return data;
}

export function mapYouTubeChatItem(item: any): Omit<NormalizedPlatformEvent, 'platform'> | null {
  const snippet = item?.snippet;
  const author = item?.authorDetails;
  if (!snippet || !author) return null;
  const viewer = {
    id: String(author.channelId ?? author.displayName ?? 'youtube_viewer'),
    name: String(author.displayName ?? 'YouTube izleyici').slice(0, 30),
    avatar: typeof author.profileImageUrl === 'string' ? author.profileImageUrl : undefined,
  };
  const id = String(item.id ?? `youtube-${randomId('evt')}`);
  if (snippet.type === 'textMessageEvent') {
    const text = String(snippet.displayMessage ?? '').trim();
    if (!text) return null;
    return { id, kind: 'comment', viewer, text };
  }
  if (snippet.type === 'superChatEvent' || snippet.type === 'superStickerEvent') {
    const amountMicros = Number(
      snippet.superChatDetails?.amountMicros ?? snippet.superStickerDetails?.amountMicros ?? 0,
    );
    return {
      id,
      kind: 'gift',
      viewer,
      text: String(snippet.displayMessage ?? 'Super Chat').slice(0, 200),
      giftName: 'YouTube Super Chat',
      amount: Math.max(1, Math.round(amountMicros / 1_000_000)),
    };
  }
  if (
    snippet.type === 'newSponsorEvent' ||
    snippet.type === 'memberMilestoneChatEvent' ||
    snippet.type === 'membershipGiftingEvent' ||
    snippet.type === 'giftMembershipReceivedEvent'
  ) {
    return {
      id,
      kind: 'follow',
      viewer,
      text: 'YouTube üyelik',
      giftName: 'YouTube üyelik',
      amount: 1,
    };
  }
  return null;
}
