import { useState } from 'react';
import type { ArcadeGameDef, ArcadeStateView } from '@shared/arcade';
import { Arcade3DStage } from './Arcade3DStage';
import { ArcadeStage } from './ArcadeStage';

/**
 * WebGL varsa premium 3D sahne, yoksa mevcut 2D sahne.
 */
export function ArcadeLiveStage({
  game,
  state,
  fitHeight = false,
  demo = true,
}: {
  game: ArcadeGameDef;
  state: ArcadeStateView | null;
  fitHeight?: boolean;
  demo?: boolean;
}) {
  const [fallback, setFallback] = useState(false);

  if (fallback) {
    return <ArcadeStage game={game} state={state} fitHeight={fitHeight} demo={demo} />;
  }

  return (
    <Arcade3DStage
      game={game}
      state={state}
      fitHeight={fitHeight}
      demo={demo}
      onError={() => setFallback(true)}
    />
  );
}
