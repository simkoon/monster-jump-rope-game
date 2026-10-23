// src/settings.ts — 강사 설정 persist 스토어 (CFG-01~04, DATA-07).
// PHASE 5 CONTRACT: no React/DOM imports; settings live in their own persist key and
// are never part of the content backup (D-04, DATA-07).
// 콘텐츠 스토어(store.ts)·백업(io.ts)과 완전히 분리된다 — 여기서 그 모듈을 참조하지 않는다.
// Phase 8 D-20: soundOn is read live by the sound module (src/game/sfx), never snapshotted into a
// game — it applies at once, unlike the rule settings that start with the next game.
import { z } from 'zod';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// D-03: 실패 규칙 3택 (순서 = UI 순서, 기본 retrySame).
export const FailRule = z.enum(['retrySame', 'retryNew', 'noStar']);
export type FailRule = z.infer<typeof FailRule>;

// D-19: 기본 라운드 수 범위.
export const ROUNDS_MIN = 1;
export const ROUNDS_MAX = 20;
export const DEFAULT_ROUNDS = 5;

export type StartBonusValue = 0 | 1 | 2;
export type BoardSizeValue = 16 | 20 | 24;

// 필드별 .catch: 손상된 필드만 기본값으로 복구하고, 정상 필드는 유지한다.
// z.object는 모르는 키를 버린다. 비객체(null/문자열/배열)는 safeParse 실패 → merge가 기본값 유지.
export const SettingsSchema = z.object({
  failRule: FailRule.catch('retrySame'),
  defaultRounds: z.number().int().min(ROUNDS_MIN).max(ROUNDS_MAX).catch(DEFAULT_ROUNDS),
  startBonus: z.union([z.literal(0), z.literal(1), z.literal(2)]).catch(1), // D-06
  boardSize: z.union([z.literal(16), z.literal(20), z.literal(24)]).catch(20), // D-06
  soundOn: z.boolean().catch(true), // D-20: missing (older save) or corrupted → on
});
export type Settings = z.infer<typeof SettingsSchema>;
export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

export const SETTINGS_KEY = 'powerjumping_settings_v1';

export interface SettingsStore extends Settings {
  setFailRule: (v: FailRule) => void;
  setDefaultRounds: (n: number) => void;
  setStartBonus: (v: StartBonusValue) => void;
  setBoardSize: (v: BoardSizeValue) => void;
  setSoundOn: (v: boolean) => void;
}

function clampRounds(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_ROUNDS;
  return Math.min(ROUNDS_MAX, Math.max(ROUNDS_MIN, Math.round(n)));
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setFailRule: (failRule) => set({ failRule }),
      setDefaultRounds: (n) => set({ defaultRounds: clampRounds(n) }),
      setStartBonus: (startBonus) => set({ startBonus }),
      setBoardSize: (boardSize) => set({ boardSize }),
      setSoundOn: (soundOn) => set({ soundOn }),
    }),
    {
      name: SETTINGS_KEY,
      storage: createJSONStorage(() => localStorage),
      // Stays 1 for soundOn: merge's safeParse fills the missing field from its .catch (no migration).
      version: 1,
      partialize: (s): Settings => ({
        failRule: s.failRule,
        defaultRounds: s.defaultRounds,
        startBonus: s.startBonus,
        boardSize: s.boardSize,
        soundOn: s.soundOn,
      }),
      migrate: (persisted) => persisted as Settings,
      // merge는 저장분이 없을 때(undefined)도 호출된다 — 절대 throw하지 않는다.
      merge: (persisted, current) => {
        const r = SettingsSchema.safeParse(persisted);
        return r.success ? { ...current, ...r.data } : current;
      },
    },
  ),
);
