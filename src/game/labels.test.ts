// src/game/labels.test.ts — UI copy + animal/tile labels (D-13, D-20, D-24, D-25, D-26).
import { describe, it, expect } from 'vitest';
import {
  ANIMAL_EMOJI,
  ANIMAL_NAME,
  DIFF_LABEL,
  FAIL_RULE_LABEL,
  RULES_HINT,
  estimateBasis,
  estimateLine,
  missingNotices,
  rulesSummary,
  startBonusSummary,
  tileAriaLabel,
  tileGlyph,
} from './labels';
import { ANIMALS } from '../engine/animals';
import type { Tile } from '../engine/board';
import type { Event } from '../schema';

const ev = (eff: Event['eff'], steps: number, name = '로켓 점프'): Event => ({
  id: `e-${eff}-${steps}`,
  name,
  eff,
  steps,
  weight: 1,
  label: '',
});

describe('animal mapping (D-24)', () => {
  it('maps every AnimalId to its emoji', () => {
    expect(ANIMAL_EMOJI).toEqual({
      bear: '🐻',
      rabbit: '🐰',
      cat: '🐱',
      dog: '🐶',
      panda: '🐼',
      fox: '🦊',
      pig: '🐷',
      chick: '🐥',
    });
  });
  it('maps every AnimalId to its Korean name', () => {
    expect(ANIMAL_NAME).toEqual({
      bear: '곰',
      rabbit: '토끼',
      cat: '고양이',
      dog: '강아지',
      panda: '판다',
      fox: '여우',
      pig: '돼지',
      chick: '병아리',
    });
    for (const a of ANIMALS) {
      expect(ANIMAL_EMOJI[a]).toBeTruthy();
      expect(ANIMAL_NAME[a]).toBeTruthy();
    }
  });
});

describe('difficulty / fail rule / start bonus labels', () => {
  it('DIFF_LABEL', () => {
    expect(DIFF_LABEL).toEqual({ easy: '쉬움', normal: '보통', hard: '어려움' });
  });
  it('FAIL_RULE_LABEL', () => {
    expect(FAIL_RULE_LABEL).toEqual({
      retrySame: '같은 미션 한 번 더',
      retryNew: '다른 미션으로 한 번 더',
      noStar: '별 없이 다음 차례',
    });
  });
  it('startBonusSummary', () => {
    expect(startBonusSummary(0)).toBe('끔');
    expect(startBonusSummary(1)).toBe('⭐+1');
    expect(startBonusSummary(2)).toBe('⭐+2');
  });
});

describe('rulesSummary + RULES_HINT (D-25)', () => {
  it('summarises board size, start bonus and fail rule', () => {
    expect(rulesSummary({ boardSize: 20, startBonus: 1, failRule: 'retrySame' })).toBe(
      '20칸 보드 · 출발 보너스 ⭐+1 · 실패하면 같은 미션 한 번 더',
    );
    expect(rulesSummary({ boardSize: 16, startBonus: 0, failRule: 'noStar' })).toBe(
      '16칸 보드 · 출발 보너스 끔 · 실패하면 별 없이 다음 차례',
    );
  });
  it('RULES_HINT', () => {
    expect(RULES_HINT).toBe('규칙은 편집기 › ⚙️ 설정에서 바꿀 수 있어요.');
  });
});

describe('missingNotices (D-13)', () => {
  it('one missing difficulty', () => {
    expect(missingNotices({ ok: true, missingDiffs: ['hard'], hasEventTiles: true })).toEqual([
      '💡 어려움 미션이 없어서 어려움 칸 없이 판을 만들어요.',
    ]);
  });
  it('two missing difficulties joined with · plus the event notice', () => {
    expect(missingNotices({ ok: true, missingDiffs: ['normal', 'hard'], hasEventTiles: false })).toEqual([
      '💡 보통·어려움 미션이 없어서 보통·어려움 칸 없이 판을 만들어요.',
      '💡 놓을 수 있는 이벤트가 없어서 이벤트 칸 없이 판을 만들어요.',
    ]);
  });
  it('keeps easy→normal→hard order regardless of input order', () => {
    expect(missingNotices({ ok: true, missingDiffs: ['hard', 'easy'], hasEventTiles: true })).toEqual([
      '💡 쉬움·어려움 미션이 없어서 쉬움·어려움 칸 없이 판을 만들어요.',
    ]);
  });
  it('blocked start (ok=false) → no notices (the guard replaces them)', () => {
    expect(
      missingNotices({ ok: false, missingDiffs: ['easy', 'normal', 'hard'], hasEventTiles: false }),
    ).toEqual([]);
  });
  it('nothing missing → []', () => {
    expect(missingNotices({ ok: true, missingDiffs: [], hasEventTiles: true })).toEqual([]);
  });
});

describe('estimate copy (D-20)', () => {
  it('estimateLine', () => {
    expect(estimateLine(8)).toBe('⏱️ 약 8분');
    expect(estimateLine(12)).toBe('⏱️ 약 12분');
  });
  it('estimateBasis', () => {
    expect(estimateBasis('solo', 2, 5)).toBe('2명 × 5라운드 기준');
    expect(estimateBasis('team', 3, 4)).toBe('3팀 × 4라운드 기준');
  });
});

describe('tileGlyph (D-26)', () => {
  it('start / quest / event glyphs', () => {
    expect(tileGlyph({ kind: 'start' })).toBe('🏁');
    expect(tileGlyph({ kind: 'quest', diff: 'easy' })).toBe('⭐1');
    expect(tileGlyph({ kind: 'quest', diff: 'normal' })).toBe('⭐2');
    expect(tileGlyph({ kind: 'quest', diff: 'hard' })).toBe('⭐3');
    expect(tileGlyph({ kind: 'event', event: ev('forward', 3) })).toBe('➡️3');
    expect(tileGlyph({ kind: 'event', event: ev('backward', 2) })).toBe('⬅️2');
    expect(tileGlyph({ kind: 'event', event: ev('extra', 0) })).toBe('🔁');
  });
});

describe('tileAriaLabel (D-26)', () => {
  it('start tile with no occupants', () => {
    expect(tileAriaLabel(0, { kind: 'start' }, [])).toBe('0번 칸, 출발');
  });
  it('quest tile with occupants', () => {
    const t: Tile = { kind: 'quest', diff: 'normal' };
    expect(tileAriaLabel(3, t, ['bear', 'rabbit'])).toBe('3번 칸, 보통 퀘스트 별 2개, 곰 토끼 있음');
  });
  it('event tiles', () => {
    expect(tileAriaLabel(7, { kind: 'event', event: ev('forward', 3) }, [])).toBe(
      '7번 칸, 이벤트 앞으로 3칸(로켓 점프)',
    );
    expect(tileAriaLabel(5, { kind: 'event', event: ev('backward', 2, '미끄럼') }, [])).toBe(
      '5번 칸, 이벤트 뒤로 2칸(미끄럼)',
    );
    expect(tileAriaLabel(9, { kind: 'event', event: ev('extra', 0, '보너스 점프') }, ['cat'])).toBe(
      '9번 칸, 이벤트 한 번 더(보너스 점프), 고양이 있음',
    );
  });
});
