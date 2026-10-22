// src/game/director/displayed.ts — the display state model (D-01).
// PHASE 6 CONTRACT: this file MUST stay
//   - free of React/DOM imports and of src/store.ts / src/settings,
//   - CLOCK-FREE (no wall-clock reads, no timers), and
//   - pure: every function returns new values and never mutates its inputs.
// The scene and the scoreboard draw `displayed`, not the engine: it follows the engine beat by
// beat and is re-synced from the engine whenever the beat queue drains.
import type { GameState } from '../../engine/state';
import type { BeatSpec } from './timeline';

export interface Displayed {
  positions: Record<string, number>;
  stars: Record<string, number>;
}

export const EMPTY_DISPLAYED: Displayed = { positions: {}, stars: {} };

export function displayedFrom(game: GameState): Displayed {
  const positions: Record<string, number> = {};
  const stars: Record<string, number> = {};
  for (const p of game.config.participants) {
    positions[p.id] = p.position;
    stars[p.id] = p.stars;
  }
  return { positions, stars };
}

// Returns a new object only when the beat changes something; otherwise the same object.
export function applyBeat(displayed: Displayed, beat: BeatSpec): Displayed {
  switch (beat.kind) {
    case 'hop': {
      if (beat.path.length === 0) return displayed;
      const to = beat.path[beat.path.length - 1];
      if (displayed.positions[beat.pid] === to) return displayed;
      return { ...displayed, positions: { ...displayed.positions, [beat.pid]: to } };
    }
    case 'startBonus':
    case 'stars': {
      if (beat.stars === 0) return displayed;
      const now = displayed.stars[beat.pid] ?? 0;
      return { ...displayed, stars: { ...displayed.stars, [beat.pid]: now + beat.stars } };
    }
    default:
      return displayed;
  }
}
