import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GameDTO, GameStateResponse, LiveSummaryDTO } from '@shared/types';
import type { CommandSettingsDTO } from '@shared/types';
import { api, ApiError } from './api';
import { useAuth } from './auth';

interface StudioContextValue {
  game: GameDTO | null;
  commands: CommandSettingsDTO | null;
  publicUrl: string | null;
  live: LiveSummaryDTO | null;
  pendingApply: boolean;
  loading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  applyGameState: (data: GameStateResponse) => void;
  setGameSilently: (game: GameDTO) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const [game, setGame] = useState<GameDTO | null>(null);
  const [commands, setCommands] = useState<CommandSettingsDTO | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [live, setLive] = useState<LiveSummaryDTO | null>(null);
  const [pendingApply, setPendingApply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    if (!me?.hasPanelAccess) {
      setLoading(false);
      setGame(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<GameStateResponse>('/api/game');
      setGame(data.game);
      setCommands(data.commands);
      setPublicUrl(data.publicUrl);
      setLive(data.live);
      setPendingApply(data.pendingApply);
      setError(null);
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught);
    } finally {
      setLoading(false);
    }
  }, [me?.hasPanelAccess]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyGameState = useCallback((data: GameStateResponse) => {
    setGame(data.game);
    if (data.commands) setCommands(data.commands);
    setPublicUrl(data.publicUrl);
    setPendingApply(data.pendingApply);
    if (data.live !== undefined) setLive(data.live);
  }, []);

  const setGameSilently = useCallback((next: GameDTO) => {
    setGame(next);
  }, []);

  const value = useMemo<StudioContextValue>(
    () => ({
      game,
      commands,
      publicUrl,
      live,
      pendingApply,
      loading,
      error,
      refresh,
      applyGameState,
      setGameSilently,
    }),
    [game, commands, publicUrl, live, pendingApply, loading, error, refresh, applyGameState, setGameSilently],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const context = useContext(StudioContext);
  if (!context) throw new Error('useStudio StudioProvider içinde kullanılmalıdır.');
  return context;
}
