// src/engine/types.ts — the pure headless engine data model (D-09).
// PHASE 2/3 CONTRACT: this file (and all of src/engine) MUST stay free of any
// React/DOM imports and any wall-clock time (Date.now/setInterval) — see engine.ts.
// Mission/Event/Effect are the Phase 1 contract; re-used here, never re-declared.
import type { Mission, Event, Effect } from '../schema';

// Turn FSM phases. Each maps to the LOOP requirement it serves.
export type Phase =
  | 'awaitingDraw' // 현재 차례, 카드 뽑기 대기 (LOOP-01)
  | 'awaitingJudgement' // 카드 뽑힘, 강사 성공/실패 판정 대기 (LOOP-02/03)
  | 'awaitingRoll' // 성공 판정됨, 주사위 대기 (LOOP-05)
  | 'turnResolved' // 이동·이벤트 적용됨, 다음 진행 대기 (LOOP-07/08)
  | 'gameOver'; // 승리 또는 시간종료 (LOOP-09)

export interface Participant {
  id: string;
  name: string;
  character: 'boy' | 'girl'; // SETUP-05 placeholder (real art Phase 3~4)
  // 0 = start square, boardLength = finish. Unbounded on the high side:
  // overshoot is allowed and never clamped (D-03).
  position: number;
  // Team model (D-01): a team is ONE Participant sharing ONE token; the members
  // rotate turns. Solo → memberNames = [name]. Team → the team's members.
  memberNames: string[];
  memberTurnIndex: number; // whose turn it is this round (rotates per team turn)
}

export interface GameConfig {
  mode: 'solo' | 'team'; // SETUP-02 / D-01
  participants: Participant[]; // built from SETUP-03/04/05
  boardLength: number; // finish index (square count) — D-02 preset
  timeLimitMs: number | null; // D-04 default 20*60*1000; null = unlimited. DOM-owned clock reads this.
}

export interface DrawnCard {
  mission: Mission;
}

// Result of a roll+landing, for the harness/UI to render (LOOP-07/08).
export interface LandingResult {
  eventId: string | null;
  eff: Effect | null; // 'forward' | 'backward' | 'extra' (Phase 1 schema)
  label: string; // '보너스' | '함정' | ''
  from: number;
  to: number;
  extraTurn: boolean; // eff === 'extra' → same participant/member repeats (LOOP-08)
}

export type EndReason = 'reached-finish' | 'timeout' | 'manual';

export interface GameState {
  phase: Phase;
  config: GameConfig;
  boardEvents: (string | null)[]; // length boardLength+1; eventId per square (EVENT-06)
  currentIndex: number; // index into config.participants
  card: DrawnCard | null;
  lastRoll: number | null;
  lastLanding: LandingResult | null;
  winners: string[]; // normal win = 1; timeout tie = n co-winners (D-05)
  endReason: EndReason | null;
}

// Re-export the Phase 1 content types so engine consumers have one import surface.
export type { Mission, Event, Effect };
