// src/game/useSetupDraft.ts — the start screen's form draft, kept outside SetupView (WR-03).
//
// The start screen tells the instructor to change the rules in the 편집기 (RULES_HINT). Switching
// views unmounts GameApp and with it SetupView, so component-local state used to wipe the roster
// that had just been typed in. This small in-memory store survives the view switch.
//
// No persist on purpose: a draft is a per-session convenience, it is never saved to localStorage
// and never exported (v1 data and the settings key stay untouched). It is cleared once a game has
// actually started, so 처음으로 still opens a fresh start screen.
import { create } from 'zustand';
import { DEFAULT_PARTICIPANT_COUNT } from '../engine/setup';
import type { AnimalId } from '../engine/animals';

export type SetupMode = 'solo' | 'team';

export interface SetupDraft {
  mode: SetupMode;
  // Raw stepper/input value (may be NaN while the number field is being edited); SetupView clamps it.
  count: number;
  names: string[];
  members: string[];
  picks: (AnimalId | undefined)[];
  // This game's round count. null = not touched yet → the start screen shows the settings default
  // (D-19). Once the instructor uses the stepper, that value is kept for this game.
  rounds: number | null;
}

interface SetupDraftState extends SetupDraft {
  patch: (p: Partial<SetupDraft> | ((d: SetupDraft) => Partial<SetupDraft>)) => void;
  reset: () => void;
}

export function initialSetupDraft(): SetupDraft {
  return { mode: 'solo', count: DEFAULT_PARTICIPANT_COUNT, names: [], members: [], picks: [], rounds: null };
}

export const useSetupDraft = create<SetupDraftState>((set) => ({
  ...initialSetupDraft(),
  patch: (p) => set((s) => (typeof p === 'function' ? p(s) : p)),
  reset: () => set(initialSetupDraft()),
}));
