import { useCallback, useEffect, useRef, useState } from 'react';
import type { BattleStateView, WsNoticeCode, WsServerMessage } from '@shared/types';
import { liveUi } from '@shared/languages';
import type { Locale } from '@shared/types';

interface LiveNotice {
  code: WsNoticeCode;
  message?: string;
}

export interface LiveSocketOptions {
  enabled: boolean;
  locale: Locale;
  viewerName?: string;
}

export interface LiveSocketResult {
  state: BattleStateView | null;
  connected: boolean;
  myTeamSlot: number | null;
  notice: LiveNotice | null;
  clearNotice: () => void;
  sendCommand: (text: string) => boolean;
  viewerId: string | null;
}

function getViewerIdentity(nameOverride?: string): { id: string; name: string } {
  let id = '';
  try {
    id = window.localStorage.getItem('tt.viewer.id') ?? '';
  } catch {
    id = '';
  }
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = `viewer_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    try {
      window.localStorage.setItem('tt.viewer.id', id);
    } catch {
      /* yoksay */
    }
  }
  let name = nameOverride?.trim();
  if (!name) {
    try {
      name = window.localStorage.getItem('tt.viewer.name') ?? 'İzleyici';
    } catch {
      name = 'İzleyici';
    }
  }
  return { id, name: name.slice(0, 32) || 'İzleyici' };
}

export function useLiveSocket(slug: string | undefined, options: LiveSocketOptions): LiveSocketResult {
  const [state, setState] = useState<BattleStateView | null>(null);
  const [connected, setConnected] = useState(false);
  const [myTeamSlot, setMyTeamSlot] = useState<number | null>(null);
  const [notice, setNotice] = useState<LiveNotice | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const reconnectTimer = useRef<number | null>(null);
  const closedByUs = useRef(false);
  const identityRef = useRef<{ id: string; name: string } | null>(null);
  const ui = liveUi(options.locale);

  if (!identityRef.current) identityRef.current = getViewerIdentity(options.viewerName);

  const showNotice = useCallback((next: LiveNotice) => {
    setNotice(next);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const connect = useCallback(() => {
    if (!slug || !options.enabled) return;
    const identity = identityRef.current!;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let socket: WebSocket;
    try {
      socket = new WebSocket(`${protocol}//${window.location.host}/ws/game/${slug}`);
    } catch {
      return;
    }
    socketRef.current = socket;

    socket.onopen = () => {
      retryRef.current = 0;
      setConnected(true);
      socket.send(JSON.stringify({ type: 'viewer', externalId: identity.id, displayName: identity.name }));
    };

    socket.onmessage = (event) => {
      let message: WsServerMessage;
      try {
        message = JSON.parse(String(event.data)) as WsServerMessage;
      } catch {
        return;
      }
      if (message.type === 'state' && message.state) {
        setState(message.state);
        const mine = message.state.players.find((player) => player.id === identity.id);
        setMyTeamSlot(mine?.teamSlot ?? null);
      } else if (message.type === 'notice' && message.notice) {
        const code = message.notice.code;
        let text = message.notice.message;
        if (!text) {
          if (code === 'HELP_SHEET') text = ui.helpNotice;
          else if (code === 'SCORE_SHEET') text = ui.scoreNotice;
          else text = code;
        }
        showNotice({ code, message: text });
        if (code === 'JOINED' || code === 'SWITCHED') {
          if (message.notice.teamSlot) setMyTeamSlot(message.notice.teamSlot);
        } else if (code === 'LEFT') {
          setMyTeamSlot(null);
        }
      } else if (message.type === 'error' && message.error) {
        showNotice({ code: 'UNKNOWN_COMMAND', message: message.error });
      }
    };

    socket.onclose = () => {
      setConnected(false);
      socketRef.current = null;
      if (closedByUs.current) return;
      const delay = Math.min(1000 * 2 ** retryRef.current, 10000);
      retryRef.current += 1;
      reconnectTimer.current = window.setTimeout(() => {
        connect();
      }, delay);
    };

    socket.onerror = () => {
      try {
        socket.close();
      } catch {
        /* yoksay */
      }
    };
  }, [slug, options.enabled, showNotice, ui.helpNotice, ui.scoreNotice]);

  useEffect(() => {
    closedByUs.current = false;
    if (!options.enabled || !slug) return;
    connect();
    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, options.enabled]);

  const sendCommand = useCallback((text: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return false;
    socket.send(JSON.stringify({ type: 'chat', text: trimmed, msgId: crypto.randomUUID() }));
    return true;
  }, []);

  const clearNotice = useCallback(() => {
    setNotice(null);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  return {
    state,
    connected,
    myTeamSlot,
    notice,
    clearNotice,
    sendCommand,
    viewerId: identityRef.current?.id ?? null,
  };
}
