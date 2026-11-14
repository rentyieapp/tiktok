import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArcadeActionKind, ArcadeKey, ArcadePlayer, ArcadeStateView } from '@shared/arcade';

type ServerMessage =
  | { type: 'hello'; gameKey: string; roomSlug?: string; demo?: boolean; serverTime: number }
  | { type: 'state'; state: ArcadeStateView; serverTime: number }
  | { type: 'joined'; playerId: string; state: ArcadeStateView; serverTime: number }
  | { type: 'pong'; serverTime: number }
  | { type: 'notice'; message: string }
  | { type: 'answer'; correct: boolean; message: string }
  | { type: 'error'; error: string };

function clientId(): string {
  const key = 'arcade_client_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `viewer_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `viewer_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function useArcadeSocket(key: ArcadeKey, roomSlug?: string) {
  const [state, setState] = useState<ArcadeStateView | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<{ correct: boolean; message: string } | null>(
    null,
  );
  const [isDemo, setIsDemo] = useState(true);
  const socketRef = useRef<WebSocket | null>(null);
  const nameRef = useRef<string | null>(null);
  const sideRef = useRef<ArcadePlayer['side']>(undefined);
  const laneRef = useRef<number | undefined>(undefined);
  const joinedRef = useRef(false);
  const retryRef = useRef<number | null>(null);

  const send = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }, []);

  useEffect(() => {
    let disposed = false;
    let retry: number | null = null;
    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const path = roomSlug ? `/ws/arcade/room/${roomSlug}` : `/ws/arcade/${key}`;
      const socket = new WebSocket(`${protocol}//${window.location.host}${path}`);
      socketRef.current = socket;
      socket.onopen = () => {
        if (disposed) return;
        setConnected(true);
        if (nameRef.current) {
          socket.send(
            JSON.stringify({
              type: 'join',
              name: nameRef.current,
              clientId: clientId(),
              side: sideRef.current,
              lane: laneRef.current,
            }),
          );
        }
      };
      socket.onmessage = (event) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(event.data as string) as ServerMessage;
        } catch {
          return;
        }
        if (message.type === 'hello' && typeof message.demo === 'boolean') setIsDemo(message.demo);
        if (message.type === 'state') setState(message.state);
        if (message.type === 'joined') {
          setPlayerId(message.playerId);
          setState(message.state);
          joinedRef.current = true;
        }
        if (message.type === 'notice') {
          setNotice(message.message);
          window.setTimeout(() => setNotice(null), 2800);
        }
        if (message.type === 'answer') {
          setAnswerFeedback({ correct: message.correct, message: message.message });
          window.setTimeout(() => setAnswerFeedback(null), 2400);
        }
        if (message.type === 'error') {
          setNotice(message.error);
          window.setTimeout(() => setNotice(null), 2800);
        }
      };
      socket.onclose = (event) => {
        setConnected(false);
        if (disposed) return;
        if (event.code === 4003 || event.code === 4004) {
          setNotice(event.code === 4003 ? 'Yayıncı lisansı sona erdi.' : 'Oda kapatıldı.');
          return;
        }
        retry = window.setTimeout(connect, 1800);
        retryRef.current = retry;
      };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => {
      disposed = true;
      if (retry) window.clearTimeout(retry);
      if (retryRef.current) window.clearTimeout(retryRef.current);
      socketRef.current?.close();
    };
  }, [key, roomSlug]);

  const join = useCallback(
    (name: string, side?: ArcadePlayer['side'], lane?: number) => {
      const clean = name.trim().slice(0, 18);
      if (clean.length < 2) {
        setNotice('En az 2 karakterlik bir ad yaz.');
        return;
      }
      nameRef.current = clean;
      sideRef.current = side;
      laneRef.current = lane;
      try {
        localStorage.setItem('arcade_name', clean);
      } catch {
        /* yoksay */
      }
      send({ type: 'join', name: clean, clientId: clientId(), side, lane });
    },
    [send],
  );

  const action = useCallback(
    (kind: ArcadeActionKind, payload = '') => {
      if (!joinedRef.current) {
        setNotice('Önce oyuna katıl.');
        return;
      }
      send({ type: 'action', kind, payload });
    },
    [send],
  );

  const start = useCallback(() => send({ type: 'start' }), [send]);
  const reset = useCallback(() => send({ type: 'reset' }), [send]);

  return {
    state,
    connected,
    playerId,
    notice,
    answerFeedback,
    isDemo,
    join,
    action,
    start,
    reset,
    savedName: (() => {
      try {
        return localStorage.getItem('arcade_name') ?? '';
      } catch {
        return '';
      }
    })(),
  };
}
