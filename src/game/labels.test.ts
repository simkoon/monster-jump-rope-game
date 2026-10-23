// src/game/labels.test.ts — UI copy + animal/tile labels (D-13, D-20, D-24, D-25, D-26).
import { describe, it, expect } from 'vitest';
import {
  ANIMAL_EMOJI,
  ANIMAL_NAME,
  CTX_COPY,
  DIFF_LABEL,
  FAIL_RULE_LABEL,
  MISS_COPY,
  REDRAW_LABEL,
  ROUND_DOTS_MAX,
  RULES_HINT,
  SOUND_OPTIONS,
  SOUND_SETTING_HINTS,
  SOUND_SETTING_LABEL,
  SOUND_TOGGLE_EMOJI,
  bannerCopy,
  soundToggleLabel,
  boardAria,
  chipItems,
  nextUpText,
  nextUpView,
  roundAria,
  roundLabel,
  scoreAria,
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
import { makeGame, player } from '../engine/testkit';
import type { MoveResult } from '../engine/state';
import type { BeatSpec } from './director/timeline';

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

// ---- Phase 6 HUD copy (06-04: D-22, D-23, D-24, D-25, D-27, ROUND-02, STAB-02) ----

const mv = (over: Partial<MoveResult> = {}): MoveResult => ({
  roll: 4,
  dicePath: [1, 2, 3, 4],
  landed: 4,
  event: null,
  eventPath: [],
  extraSuppressed: false,
  to: 4,
  finalKind: 'quest',
  startBonus: 0,
  ...over,
});

describe('nextUpText / nextUpView (HUD-02, D-22)', () => {
  it('formats null, sameAgain, team and solo', () => {
    expect(nextUpText(null)).toBe('🏁 이번이 마지막 차례!');
    expect(nextUpText({ animal: 'bear', name: '하늘', member: null, sameAgain: true })).toBe('🔁 한 번 더: 🐻 하늘');
    expect(nextUpText({ animal: 'fox', name: 'A팀', member: '민수', sameAgain: false })).toBe('🦊 A팀 · 민수');
    expect(nextUpText({ animal: 'rabbit', name: '별이', member: null, sameAgain: false })).toBe('🐰 별이');
  });

  it('renders user names verbatim (no escaping or HTML parsing in the helper)', () => {
    expect(nextUpText({ animal: 'pig', name: '<b>x</b>', member: null, sameAgain: false })).toBe('🐷 <b>x</b>');
  });

  it('nextUpView maps the next participant (solo: member null)', () => {
    const g = makeGame();
    expect(nextUpView(g)).toEqual({ animal: 'rabbit', name: 'P2', member: null, sameAgain: false });
  });

  it('nextUpView: team mode carries the member; null when the game ends after this turn', () => {
    const g = makeGame({
      mode: 'team',
      participants: [
        player('t1', 'A팀', 'fox', { memberNames: ['민수', '지아'] }),
        player('t2', 'B팀', 'pig', { memberNames: ['하준', '서윤'] }),
      ],
    });
    expect(nextUpView(g)).toEqual({ animal: 'pig', name: 'B팀', member: '하준', sameAgain: false });
    expect(nextUpView({ ...g, currentIndex: 1, round: 3 })).toBeNull();
  });
});

describe('round copy (ROUND-02, D-24)', () => {
  it('label switches to 마지막 라운드 from the last round; aria reads R then r', () => {
    expect(roundLabel(2, 5)).toBe('라운드');
    expect(roundLabel(5, 5)).toBe('마지막 라운드');
    expect(roundAria(2, 5)).toBe('라운드 5개 중 2번째');
    expect(ROUND_DOTS_MAX).toBe(10);
  });
});

describe('chipItems (D-23, UI-SPEC S6a)', () => {
  const texts = (m: MoveResult | null, p: Parameters<typeof chipItems>[1]) => chipItems(m, p).map((c) => c.text);
  const evMove = mv({ startBonus: 1, event: ev('forward', 3, '점프대'), finalKind: 'quest' });

  it('no move → no chips', () => {
    expect(chipItems(null, [])).toEqual([]);
  });

  it('all beats done → dice, bonus, event in order with tones', () => {
    const items = chipItems(evMove, []);
    expect(items.map((c) => c.text)).toEqual(['🎲 4', '🏁 ⭐+1', '➡️ 앞으로 3칸']);
    expect(items.map((c) => c.tone)).toEqual(['plain', 'sun', 'grass']);
  });

  it('chips appear only after their beat is no longer pending', () => {
    expect(texts(evMove, ['preview', 'hop', 'startBonus', 'event'])).toEqual(['🎲 4']);
    expect(texts(evMove, ['dice', 'preview', 'hop', 'startBonus', 'event'])).toEqual([]);
  });

  it('backward / extra / suppressed extra', () => {
    const back = chipItems(mv({ event: ev('backward', 2, '미끄럼') }), []);
    expect(back[1]).toMatchObject({ text: '⬅️ 뒤로 2칸', tone: 'coral' });
    const extra = chipItems(mv({ event: ev('extra', 0, '보너스 점프'), finalKind: 'event' }), []);
    expect(extra[1]).toMatchObject({ text: '🔁 한 번 더!', tone: 'grape' });
    const sup = chipItems(mv({ event: ev('extra', 0, '보너스 점프'), finalKind: 'event', extraSuppressed: true }), []);
    expect(sup[1]).toMatchObject({ text: '🔁 이번엔 넘어가요', tone: 'grape' });
  });

  it('start tile chip only once no hop is pending; event names never appear', () => {
    expect(texts(mv({ to: 0, finalKind: 'start' }), []).at(-1)).toBe('🏁 출발 칸!');
    expect(texts(mv({ to: 0, finalKind: 'start' }), ['hop'])).not.toContain('🏁 출발 칸!');
    expect(texts(evMove, []).join(' ')).not.toContain('점프대');
  });
});

describe('bannerCopy (D-23, D-24, UI-SPEC S6b)', () => {
  const evBeat = (eff: 'forward' | 'backward' | 'extra', steps: number, suppressed = false): BeatSpec => ({
    kind: 'event',
    pid: 'p1',
    eff,
    steps,
    suppressed,
    name: '점프대',
    label: '보너스',
    ms: 1000,
  });

  it('startBonus', () => {
    expect(bannerCopy({ kind: 'startBonus', pid: 'p1', stars: 2, ms: 800 })).toMatchObject({
      top: '🏁 출발 보너스',
      big: '⭐+2',
      tone: 'sun',
    });
  });

  it('event forward / backward / extra / suppressed', () => {
    expect(bannerCopy(evBeat('forward', 3))).toMatchObject({
      top: '점프대',
      big: '➡️ 앞으로 3칸!',
      tone: 'grass',
      label: '보너스',
    });
    expect(bannerCopy(evBeat('backward', 2))).toMatchObject({ big: '⬅️ 뒤로 2칸!', tone: 'coral' });
    expect(bannerCopy(evBeat('extra', 0))).toMatchObject({ big: '🔁 한 번 더!', tone: 'grape' });
    expect(bannerCopy(evBeat('extra', 0, true))).toMatchObject({
      top: '🔁 한 번 더는 연속 한 번까지!',
      big: null,
      sub: '이번엔 넘어가요',
      tone: 'grape',
    });
  });

  it('stars (Phase 8 FX-02, UI-SPEC F4) and finalRound', () => {
    expect(bannerCopy({ kind: 'stars', pid: 'p1', stars: 2, ms: 1900 })).toEqual({
      top: '퀘스트 성공!',
      big: '⭐+2',
      sub: null,
      tone: 'grass',
      label: '',
      tier: 2,
    });
    expect(bannerCopy({ kind: 'stars', pid: 'p1', stars: 3, ms: 2200 })).toMatchObject({
      top: '퀘스트 성공!',
      big: '⭐+3',
      tone: 'grass',
      tier: 3,
    });
    expect(bannerCopy({ kind: 'stars', pid: 'p1', stars: 1, ms: 1600 })?.tier).toBe(1);
    expect(bannerCopy({ kind: 'stars', pid: 'p1', stars: 5, ms: 2200 })?.tier).toBe(3); // clamped
    expect(bannerCopy({ kind: 'finalRound', ms: 1500 })).toMatchObject({
      big: '🔔 마지막 라운드!',
      sub: '이번 라운드가 마지막이에요',
      tone: 'final',
    });
  });

  it('non-banner beats → null', () => {
    expect(bannerCopy({ kind: 'dice', pid: 'p1', face: 3, ms: 1000 })).toBeNull();
    expect(bannerCopy({ kind: 'preview', pid: 'p1', path: [1], ms: 500 })).toBeNull();
    expect(bannerCopy({ kind: 'hop', pid: 'p1', path: [1], by: 'dice', ms: 250 })).toBeNull();
  });

  it('miss → the soft one-liner: retry vs last (Phase 8 D-09, FX-05, UI-SPEC F6a)', () => {
    expect(bannerCopy({ kind: 'miss', pid: 'p1', retry: true, ms: 700 })).toEqual({
      top: '괜찮아! 다시 해 보자 💪',
      big: null,
      sub: null,
      tone: 'soft',
      label: '',
    });
    expect(bannerCopy({ kind: 'miss', pid: 'p1', retry: false, ms: 700 })).toMatchObject({
      top: '다음엔 꼭! 💪',
      big: null,
      tone: 'soft',
    });
    // absent retry = false
    expect(bannerCopy({ kind: 'miss', pid: 'p1', ms: 700 })?.top).toBe('다음엔 꼭! 💪');
  });

  it('miss copy never scolds: no ❌ / ✕ / X / 틀렸어요 / 실패! (D-09)', () => {
    expect(MISS_COPY).toEqual({ retry: '괜찮아! 다시 해 보자 💪', last: '다음엔 꼭! 💪' });
    for (const text of Object.values(MISS_COPY)) {
      expect(text).not.toMatch(/❌|✕|✖|X|x|틀렸어요|실패!/);
    }
  });

  it('win: one winner → 🏆 우승! with the animal emoji only (D-14, UI-SPEC C7d)', () => {
    expect(bannerCopy({ kind: 'win', winners: ['p1'], animals: ['bear'], ms: 1500 })).toEqual({
      top: '🏆 우승!',
      big: '🐻',
      sub: null,
      tone: 'final',
      label: '',
      variant: 'win',
      bigLabel: '곰',
      bigItems: ['🐻'],
    });
  });

  it('win: co-winners → 🏆 공동 우승! with the emojis in participant order', () => {
    expect(
      bannerCopy({ kind: 'win', winners: ['p1', 'p2'], animals: ['bear', 'rabbit'], ms: 1500 }),
    ).toMatchObject({
      top: '🏆 공동 우승!',
      big: '🐻 🐰',
      bigItems: ['🐻', '🐰'],
      bigLabel: '곰, 토끼',
      variant: 'win',
    });
  });

  it('banner beats carry no win variant', () => {
    const copy = bannerCopy({ kind: 'stars', pid: 'p1', stars: 1, ms: 900 });
    expect(copy?.variant).toBeUndefined();
    expect(copy?.bigLabel).toBeUndefined();
  });
});

describe('scoreAria / boardAria / recovery copy (HUD-01, STAB-02)', () => {
  it('score cell aria with and without the crown', () => {
    expect(scoreAria(1, 'bear', '하늘', 3, true)).toBe('1등 왕관, 1등 곰 하늘 별 3개');
    expect(scoreAria(2, 'cat', '별이', 1, false)).toBe('2등 고양이 별이 별 1개');
  });

  it('board aria', () => {
    expect(boardAria(20, '하늘')).toBe('20칸 순환 보드, 지금 하늘 차례');
    expect(boardAria(20, '하늘', true)).toBe('20칸 순환 보드, 게임 끝'); // UI-SPEC C7f
  });

  it('recovery copy', () => {
    expect(CTX_COPY.loading).toBe('판을 준비하고 있어요…');
    expect(CTX_COPY.lost).toEqual({
      title: '화면이 잠깐 꺼졌어요',
      body: '별과 위치는 그대로예요. 아래 버튼을 눌러 다시 그려 주세요.',
    });
    expect(CTX_COPY.failed).toEqual({
      title: '판을 그리지 못했어요',
      body: '게임은 그대로예요. 버튼을 눌러 다시 시도해 주세요.',
    });
    expect(REDRAW_LABEL).toBe('🔄 화면 다시 그리기');
  });
});

describe('sound copy (AUDIO-02, D-20, UI-SPEC F8 / Copywriting)', () => {
  it('settings group label, options and hints', () => {
    expect(SOUND_SETTING_LABEL).toBe('효과음');
    expect(SOUND_OPTIONS).toEqual([
      { value: 'on', label: '🔊 켜기' },
      { value: 'off', label: '🔇 끄기' },
    ]);
    expect(SOUND_SETTING_HINTS).toEqual([
      '바로 적용돼요. 게임 화면 오른쪽 위 🔊 버튼으로도 켜고 끌 수 있어요.',
      '아이폰·아이패드는 무음 모드를 켜면 소리가 나지 않아요.',
      '성공 축하는 화면을 한 번 톡 치면 바로 넘어가요.',
    ]);
  });

  it('toggle label says what a tap will do; emoji shows the current state', () => {
    expect(soundToggleLabel(true)).toBe('효과음 끄기');
    expect(soundToggleLabel(false)).toBe('효과음 켜기');
    expect(SOUND_TOGGLE_EMOJI).toEqual({ on: '🔊', off: '🔇' });
  });
});
