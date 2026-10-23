// src/game/labels.ts — UI copy for the Phase 5 start/play/result screens (UI-SPEC Copywriting Contract).
// The engine knows animal ids only; emoji and Korean display names live here (D-24) so Phase 7
// can attach 3D looks to the same ids. Plain constants/functions — no React needed.
import type { AnimalId } from '../engine/animals';
import { DIFF_ORDER, type Tile } from '../engine/board';
import { starsFor } from '../engine/scoring';
import type { ContentAnalysis } from '../engine/setup';
import type { GameState, MoveResult } from '../engine/state';
import type { Difficulty, Event } from '../schema';
import type { FailRule, Settings } from '../settings';
import { starTier, type BeatKind, type BeatSpec, type StarTier } from './director/timeline';
import { nextUp } from './turnOrder';

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

// D-26: one-line tile glyph (first used by the Phase 5 ring strip, now removed). Kept, with
// tileAriaLabel, for a future DOM tile description (deferred tile-number idea).
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

// ---- Phase 6 HUD copy (06-04, UI-SPEC "Copywriting Contract") ----
// Pure helpers for the DOM HUD over the 3D board. User strings (participant / member / event
// names) are returned verbatim and rendered by React as JSX text only (T-06-08).

// HUD-02 / D-22: who plays after this turn, as a display record.
export interface NextUpView {
  animal: AnimalId;
  name: string;
  member: string | null; // team mode only
  sameAgain: boolean; // an extra turn was granted this turn
}

export function nextUpView(game: GameState): NextUpView | null {
  const n = nextUp(game);
  if (!n) return null;
  const p = game.config.participants.find((x) => x.id === n.pid);
  if (!p) return null;
  return {
    animal: p.animal,
    name: p.name,
    member: game.config.mode === 'team' ? n.member : null,
    sameAgain: n.sameAgain,
  };
}

// null = this turn is the last one of the game.
export function nextUpText(next: NextUpView | null): string {
  if (!next) return '🏁 이번이 마지막 차례!';
  const who = `${ANIMAL_EMOJI[next.animal]} ${next.name}`;
  if (next.sameAgain) return `🔁 한 번 더: ${who}`;
  return next.member ? `${who} · ${next.member}` : who;
}

// ROUND-02 / D-24: round block label and accessible name. Dots only up to ROUND_DOTS_MAX rounds.
export const ROUND_DOTS_MAX = 10;

export function roundLabel(round: number, total: number): string {
  return round >= total ? '마지막 라운드' : '라운드';
}

export function roundAria(round: number, total: number): string {
  return `라운드 ${total}개 중 ${round}번째`;
}

// D-14a: turn pill text while the engine is gameOver (the win beat) — no one is current any more.
export const GAME_OVER_PILL = '🏁 게임 끝';

// D-23 / UI-SPEC S6(a): per-turn status chips. A chip shows only when its source exists in the
// move AND its beat is no longer pending (dice ↔ dice, bonus ↔ startBonus, event ↔ event,
// start tile ↔ hop). Event names never appear in chips (the banner shows them).
export type ChipTone = 'plain' | 'sun' | 'grass' | 'coral' | 'grape';

export interface ChipItem {
  key: 'dice' | 'bonus' | 'event' | 'start';
  text: string;
  tone: ChipTone;
}

export function chipItems(move: MoveResult | null, pending: readonly BeatKind[]): ChipItem[] {
  if (!move) return [];
  const done = (k: BeatKind) => !pending.includes(k);
  const out: ChipItem[] = [];
  if (done('dice')) out.push({ key: 'dice', text: `🎲 ${move.roll}`, tone: 'plain' });
  if (move.startBonus > 0 && done('startBonus')) {
    out.push({ key: 'bonus', text: `🏁 ⭐+${move.startBonus}`, tone: 'sun' });
  }
  const e = move.event;
  if (e && done('event')) {
    if (e.eff === 'forward') out.push({ key: 'event', text: `➡️ 앞으로 ${e.steps}칸`, tone: 'grass' });
    else if (e.eff === 'backward') out.push({ key: 'event', text: `⬅️ 뒤로 ${e.steps}칸`, tone: 'coral' });
    else out.push({ key: 'event', text: move.extraSuppressed ? '🔁 이번엔 넘어가요' : '🔁 한 번 더!', tone: 'grape' });
  }
  if (move.finalKind === 'start' && done('hop')) out.push({ key: 'start', text: '🏁 출발 칸!', tone: 'plain' });
  return out;
}

// D-23 / D-24 / UI-SPEC S6(b): banner copy per banner beat; null for dice / preview / hop. The win
// beat (D-14, UI-SPEC C7d) shows only animal emojis and fixed animal names — never a participant
// name (T-07-02). Phase 8: the stars beat reads "퀘스트 성공!" over "⭐+N" with its star tier (FX-02,
// UI-SPEC F4), and the miss beat — copy-less in Phase 7 D-13 — now shows one gentle soft line
// (D-09, UI-SPEC F6a): never coral, never an X mark, never a scolding word.
export type BannerTone = 'sun' | 'grass' | 'coral' | 'grape' | 'final' | 'soft';

// D-09: the soft miss line — a retry quest follows / no retry left.
export const MISS_COPY = { retry: '괜찮아! 다시 해 보자 💪', last: '다음엔 꼭! 💪' } as const;

export interface BannerCopy {
  top: string | null; // Heading line (event name for event beats)
  big: string | null; // Display line
  sub: string | null; // Body line
  tone: BannerTone;
  label: Event['label']; // 보너스 / 함정 chip, '' for none
  variant?: 'win'; // extra banner class (win banner only)
  bigLabel?: string; // accessible name of an emoji-only big line (win banner only)
  // Win banner only: one fixed animal emoji per winner, in participant order, so the row gets one
  // flex item per animal (IN-01). Never a participant name (T-07-02).
  bigItems?: readonly string[];
  tier?: StarTier; // stars banner only: width / border / pop per tier (D-04)
}

export function bannerCopy(beat: BeatSpec): BannerCopy | null {
  switch (beat.kind) {
    case 'startBonus':
      return { top: '🏁 출발 보너스', big: `⭐+${beat.stars}`, sub: null, tone: 'sun', label: '' };
    case 'event': {
      if (beat.eff === 'extra' && beat.suppressed) {
        return { top: '🔁 한 번 더는 연속 한 번까지!', big: null, sub: '이번엔 넘어가요', tone: 'grape', label: '' };
      }
      if (beat.eff === 'forward') {
        return { top: beat.name, big: `➡️ 앞으로 ${beat.steps}칸!`, sub: null, tone: 'grass', label: beat.label };
      }
      if (beat.eff === 'backward') {
        return { top: beat.name, big: `⬅️ 뒤로 ${beat.steps}칸!`, sub: null, tone: 'coral', label: beat.label };
      }
      return { top: beat.name, big: '🔁 한 번 더!', sub: null, tone: 'grape', label: beat.label };
    }
    case 'stars':
      return { top: '퀘스트 성공!', big: `⭐+${beat.stars}`, sub: null, tone: 'grass', label: '', tier: starTier(beat.stars) };
    case 'miss':
      return { top: beat.retry ? MISS_COPY.retry : MISS_COPY.last, big: null, sub: null, tone: 'soft', label: '' };
    case 'finalRound':
      return { top: null, big: '🔔 마지막 라운드!', sub: '이번 라운드가 마지막이에요', tone: 'final', label: '' };
    case 'win':
      return {
        top: beat.winners.length > 1 ? '🏆 공동 우승!' : '🏆 우승!',
        big: beat.animals.map((a) => ANIMAL_EMOJI[a]).join(' '),
        sub: null,
        tone: 'final',
        label: '',
        variant: 'win',
        bigLabel: beat.animals.map((a) => ANIMAL_NAME[a]).join(', '),
        bigItems: beat.animals.map((a) => ANIMAL_EMOJI[a]),
      };
    default:
      return null;
  }
}

// HUD-01: score cell accessible name; the crown prefix only for a rank-1 cell with stars.
export function scoreAria(rank: number, animal: AnimalId, name: string, stars: number, crowned: boolean): string {
  return `${crowned ? '1등 왕관, ' : ''}${rank}등 ${ANIMAL_NAME[animal]} ${name} 별 ${stars}개`;
}

// Canvas cell accessible name (role="img"). While the engine is gameOver (the win beat) the
// finished game has no "current turn" (UI-SPEC C7f).
export function boardAria(length: number, name: string, over = false): string {
  if (over) return `${length}칸 순환 보드, 게임 끝`;
  return `${length}칸 순환 보드, 지금 ${name} 차례`;
}

// STAB-02 / D-27 / UI-SPEC S7: loading line and recovery overlay copy.
export const CTX_COPY = {
  loading: '판을 준비하고 있어요…',
  lost: { title: '화면이 잠깐 꺼졌어요', body: '별과 위치는 그대로예요. 아래 버튼을 눌러 다시 그려 주세요.' },
  failed: { title: '판을 그리지 못했어요', body: '게임은 그대로예요. 버튼을 눌러 다시 시도해 주세요.' },
} as const;

export const REDRAW_LABEL = '🔄 화면 다시 그리기';
