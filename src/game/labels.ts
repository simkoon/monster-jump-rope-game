// src/game/labels.ts — UI copy for the Phase 5 start/play/result screens (UI-SPEC Copywriting Contract).
// The engine knows animal ids only; emoji and Korean display names live here (D-24) so Phase 7
// can attach 3D looks to the same ids. Plain constants/functions — no React needed.
import type { AnimalId } from '../engine/animals';
import { DIFF_ORDER, type Tile } from '../engine/board';
import { starsFor } from '../engine/scoring';
import type { ContentAnalysis } from '../engine/setup';
import type { Difficulty } from '../schema';
import type { FailRule, Settings } from '../settings';

export const ANIMAL_EMOJI: Record<AnimalId, string> = {
  bear: '🐻',
  rabbit: '🐰',
  cat: '🐱',
  dog: '🐶',
  panda: '🐼',
  fox: '🦊',
  pig: '🐷',
  chick: '🐥',
};

export const ANIMAL_NAME: Record<AnimalId, string> = {
  bear: '곰',
  rabbit: '토끼',
  cat: '고양이',
  dog: '강아지',
  panda: '판다',
  fox: '여우',
  pig: '돼지',
  chick: '병아리',
};

export const DIFF_LABEL: Record<Difficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export const FAIL_RULE_LABEL: Record<FailRule, string> = {
  retrySame: '같은 미션 한 번 더',
  retryNew: '다른 미션으로 한 번 더',
  noStar: '별 없이 다음 차례',
};

// D-25: start-bonus wording in the rules summary.
export function startBonusSummary(n: number): string {
  return n > 0 ? `⭐+${n}` : '끔';
}

// D-25: read-only "this game's rules" line on the start screen.
export function rulesSummary(s: Pick<Settings, 'boardSize' | 'startBonus' | 'failRule'>): string {
  return `${s.boardSize}칸 보드 · 출발 보너스 ${startBonusSummary(s.startBonus)} · 실패하면 ${FAIL_RULE_LABEL[s.failRule]}`;
}

export const RULES_HINT = '규칙은 편집기 › ⚙️ 설정에서 바꿀 수 있어요.';

// D-13: informational notices (never block). A blocked start (ok=false) shows the guard instead.
export function missingNotices(a: Pick<ContentAnalysis, 'ok' | 'missingDiffs' | 'hasEventTiles'>): string[] {
  if (!a.ok) return [];
  const out: string[] = [];
  const missing = DIFF_ORDER.filter((d) => a.missingDiffs.includes(d));
  if (missing.length > 0) {
    const names = missing.map((d) => DIFF_LABEL[d]).join('·');
    out.push(`💡 ${names} 미션이 없어서 ${names} 칸 없이 판을 만들어요.`);
  }
  if (!a.hasEventTiles) out.push('💡 놓을 수 있는 이벤트가 없어서 이벤트 칸 없이 판을 만들어요.');
  return out;
}

// D-20: estimated play time copy.
export function estimateLine(minutes: number): string {
  return `⏱️ 약 ${minutes}분`;
}

export function estimateBasis(mode: 'solo' | 'team', n: number, rounds: number): string {
  return `${n}${mode === 'team' ? '팀' : '명'} × ${rounds}라운드 기준`;
}

// D-26: one-line tile glyph for the temporary ring strip.
export function tileGlyph(tile: Tile): string {
  switch (tile.kind) {
    case 'start':
      return '🏁';
    case 'quest':
      return `⭐${starsFor(tile.diff)}`;
    case 'event': {
      const e = tile.event;
      if (e.eff === 'forward') return `➡️${e.steps}`;
      if (e.eff === 'backward') return `⬅️${e.steps}`;
      return '🔁';
    }
  }
}

function tileDescription(tile: Tile): string {
  switch (tile.kind) {
    case 'start':
      return '출발';
    case 'quest':
      return `${DIFF_LABEL[tile.diff]} 퀘스트 별 ${starsFor(tile.diff)}개`;
    case 'event': {
      const e = tile.event;
      if (e.eff === 'forward') return `이벤트 앞으로 ${e.steps}칸(${e.name})`;
      if (e.eff === 'backward') return `이벤트 뒤로 ${e.steps}칸(${e.name})`;
      return `이벤트 한 번 더(${e.name})`;
    }
  }
}

// D-26: accessible tile name — the tile number lives here only, never as on-screen text.
export function tileAriaLabel(index: number, tile: Tile, occupants: readonly AnimalId[]): string {
  const base = `${index}번 칸, ${tileDescription(tile)}`;
  if (occupants.length === 0) return base;
  return `${base}, ${occupants.map((a) => ANIMAL_NAME[a]).join(' ')} 있음`;
}
