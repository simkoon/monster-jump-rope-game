// src/game/hud/ceremony.test.tsx — the ceremony parts (Phase 8 08-10; END-01, END-02, END-03,
// D-11 ~ D-16, UI-SPEC F7): CeremonyHead, CeremonyPanel (winner line, 모두의 별 cards, praise badge
// chips, 🔁 다시 하기 / 처음으로), the DOM podium fallback and the intro state hook. These replace the
// temporary result screen tests (RESEARCH Pitfall 1). jsdom; finished games are built with the testkit
// + engine transitions and placed into useGameStore.
import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CeremonyHead, CeremonyPanel } from './CeremonyView';
import DomPodium from './DomPodium';
import { useCeremonyIntro } from './useCeremonyIntro';
import { useGameStore } from '../../harness/useGameStore';
import { useStore } from '../../store';
import { useSettings, DEFAULT_SETTINGS } from '../../settings';
import { advanceTurn, endGame } from '../../engine/game';
import { EMPTY_STATS } from '../../engine/stats';
import { makeGame, mission, patchParticipant, player } from '../../engine/testkit';
import type { GameState, PlayerStats } from '../../engine/state';
import { awardBadges, displayBadges } from '../awards';
import { BADGE_COPY, ceremonyCardAria } from '../labels';
import { CEREMONY_INTRO_MS } from '../layout/podiumLayout';
import sfx, { __resetSfxForTests } from '../sfx/sfx';
import { installFakeAudio } from '../../test/fakeAudio';
import { INPUT_LOCK_MS, lockInputFor, resetSharedInputLock, SKIP_LOCK_MS, useInputLock } from '../useInputLock';
import gameCss from '../styles/game.css?raw';

const stats = (over: Partial<PlayerStats>): PlayerStats => ({ ...EMPTY_STATS, ...over });

function withStars(g: GameState, stars: number[]): GameState {
  return stars.reduce((s, n, i) => patchParticipant(s, i, { stars: n }), g);
}

function setGame(g: GameState) {
  useGameStore.setState({ game: g, startBlockedReason: null });
}

// a ⭐5 (🔥 고수왕, 🏃 도전왕), b ⭐3 (three badges → the first two shown), c ⭐1 (🍀), d ⭐0 (🌏).
function fourDone(): GameState {
  let g = makeGame({
    participants: [
      player('a', '하늘', 'bear'),
      player('b', '바다', 'cat'),
      player('c', '숲', 'fox'),
      player('d', '별이', 'pig'),
    ],
  });
  g = withStars(g, [5, 3, 1, 0]);
  // createGame starts everybody at travel 0; d went around the board the furthest.
  g = [5, 3, 2, 12].reduce((s, travel, i) => patchParticipant(s, i, { travel }), g);
  g = {
    ...g,
    stats: {
      a: stats({ attempts: 5, successes: 3, hardSuccesses: 2 }),
      b: stats({ attempts: 5, successes: 3, retrySuccesses: 1, luckyCount: 1 }),
      c: stats({ attempts: 2, successes: 1, luckyCount: 1 }),
      d: stats({ attempts: 1, failures: 1 }),
    },
  };
  return endGame(g, 'manual');
}

const three = () => [player('p1', '하늘', 'bear'), player('p2', '바다', 'cat'), player('p3', '숲', 'fox')];

function threeDone(stars: number[]): GameState {
  return endGame(withStars(makeGame({ participants: three() }), stars), 'manual');
}

const cards = () => within(screen.getByRole('list', { name: '모두의 별' })).getAllByRole('listitem');

beforeEach(() => {
  resetSharedInputLock(); // module scope: 🔁 다시 하기 takes it (CR-01)
  localStorage.clear();
  useSettings.setState({ ...DEFAULT_SETTINGS });
  useStore.setState({
    version: 1,
    categories: [],
    missions: [mission('e', 'easy'), mission('n', 'normal'), mission('h', 'hard')],
    events: [],
  });
  useGameStore.setState({ game: null, startBlockedReason: null });
});

afterEach(() => {
  cleanup();
  resetSharedInputLock();
  useGameStore.setState({ game: null, startBlockedReason: null });
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('CeremonyHead (END-01, UI-SPEC F7)', () => {
  it('title 게임 끝! and the manual end reason', () => {
    render(<CeremonyHead game={fourDone()} />);
    expect(screen.getByRole('heading', { name: '게임 끝!' })).toBeInTheDocument();
    expect(screen.getByText('게임을 일찍 마쳤어요!')).toHaveClass('ceremony-reason');
  });

  it('rounds-complete names the round count', () => {
    let g = makeGame({ rules: { rounds: 2 }, patch: (s) => ({ ...s, phase: 'turnResolved', round: 2 }) });
    g = advanceTurn(g); // P1 → P2
    g = { ...g, phase: 'turnResolved' };
    g = advanceTurn(g); // last turn of the last round → rounds-complete
    expect(g.endReason).toBe('rounds-complete');
    render(<CeremonyHead game={g} />);
    expect(screen.getByText('2라운드를 모두 마쳤어요!')).toBeInTheDocument();
  });
});

describe('CeremonyPanel — winner line and 모두의 별 cards (END-01, D-12, D-13)', () => {
  it('single winner: 🏆 우승! line as a status; cards in star order; only the winner is gold', () => {
    const g = fourDone();
    setGame(g);
    const { container } = render(<CeremonyPanel game={g} introActive={false} />);
    const line = screen.getByText('🏆 우승! 🐻 하늘');
    expect(line).toHaveAttribute('role', 'status');
    expect(line).toHaveClass('ceremony-winner');

    const li = cards();
    expect(li).toHaveLength(4);
    expect(li.map((c) => c.querySelector('.ceremony-name')!.textContent)).toEqual(['하늘', '바다', '숲', '별이']);
    expect(li.map((c) => c.querySelector('.ceremony-stars')!.textContent)).toEqual(['⭐5', '⭐3', '⭐1', '⭐0']);
    expect(li[0]).toHaveClass('ceremony-card', 'is-winner');
    expect(li[0].querySelector('.ceremony-trophy')!.textContent).toBe('🏆');
    for (const c of li.slice(1)) {
      expect(c).not.toHaveClass('is-winner');
      expect(c.querySelector('.ceremony-trophy')).toBeNull();
    }
    // D-13: the last card looks exactly like every other non-winner card.
    expect(li[1].className).toBe(li[2].className);
    expect(li[2].className).toBe(li[3].className);
    expect(container.querySelectorAll('.ceremony-trophy')).toHaveLength(1);
    // No rank number anywhere (UI-SPEC banned words).
    expect(container.textContent).not.toMatch(/\d+\s*등/);
    expect(container.textContent).not.toContain('꼴찌');
  });

  it('co-winners: 🏆 공동 우승! line; ties keep the participant order; both cards gold', () => {
    const g = threeDone([4, 4, 1]);
    setGame(g);
    render(<CeremonyPanel game={g} introActive={false} />);
    expect(screen.getByText('🏆 공동 우승! 🐻 하늘, 🐱 바다')).toHaveAttribute('role', 'status');
    const li = cards();
    expect(li.map((c) => c.querySelector('.ceremony-name')!.textContent)).toEqual(['하늘', '바다', '숲']);
    expect(li.filter((c) => c.classList.contains('is-winner'))).toHaveLength(2);
    expect(li[2]).not.toHaveClass('is-winner');
  });

  it('a stable tie-break by participant order for non-winners too', () => {
    const g = threeDone([5, 1, 1]);
    setGame(g);
    render(<CeremonyPanel game={g} introActive={false} />);
    expect(cards().map((c) => c.querySelector('.ceremony-name')!.textContent)).toEqual(['하늘', '바다', '숲']);
  });

  it('cards carry the participant color and their stagger index', () => {
    const g = fourDone();
    setGame(g);
    render(<CeremonyPanel game={g} introActive={false} />);
    const li = cards();
    expect(li[0].style.getPropertyValue('--pc')).not.toBe('');
    expect(li.map((c) => c.style.getPropertyValue('--i'))).toEqual(['0', '1', '2', '3']);
  });

  it('is-intro on the panel only while the intro runs', () => {
    const g = fourDone();
    setGame(g);
    const { container, rerender } = render(<CeremonyPanel game={g} introActive />);
    expect(container.querySelector('.ceremony-panel')).toHaveClass('is-intro');
    rerender(<CeremonyPanel game={g} introActive={false} />);
    expect(container.querySelector('.ceremony-panel')).not.toHaveClass('is-intro');
  });
});

describe('CeremonyPanel — praise badges (END-02, D-14)', () => {
  it('every card shows 1–2 chips from displayBadges(awardBadges(...)) with the title text', () => {
    const g = fourDone();
    setGame(g);
    render(<CeremonyPanel game={g} introActive={false} />);
    const awarded = awardBadges(g.stats, g.config.participants);
    const byName: Record<string, string> = { 하늘: 'a', 바다: 'b', 숲: 'c', 별이: 'd' };
    for (const c of cards()) {
      const pid = byName[c.querySelector('.ceremony-name')!.textContent!];
      const ids = displayBadges(awarded[pid]);
      const chips = Array.from(c.querySelectorAll<HTMLElement>('.ceremony-badge'));
      expect(chips.length).toBeGreaterThanOrEqual(1);
      expect(chips.length).toBeLessThanOrEqual(2);
      expect(chips.map((x) => x.textContent)).toEqual(ids.map((id) => `${BADGE_COPY[id].emoji} ${BADGE_COPY[id].name}`));
      expect(chips.map((x) => x.title)).toEqual(ids.map((id) => BADGE_COPY[id].title));
    }
    // b has three badges (끈기왕, 행운왕, 도전왕): only the first two are shown.
    expect(awarded.b).toHaveLength(3);
    const b = cards()[1];
    expect(Array.from(b.querySelectorAll('.ceremony-badge')).map((x) => x.textContent)).toEqual(['💪 끈기왕', '🍀 행운왕']);
  });

  it('card aria-label tells everything; emoji, 🏆 and chips are aria-hidden', () => {
    const g = fourDone();
    setGame(g);
    render(<CeremonyPanel game={g} introActive={false} />);
    const li = cards();
    expect(li[0]).toHaveAttribute('aria-label', '우승, 곰 하늘, 별 5개, 칭찬 배지 고수왕, 도전왕');
    expect(li[3]).toHaveAttribute('aria-label', ceremonyCardAria('pig', '별이', 0, ['여행왕'], false));
    for (const c of li) {
      expect(c.querySelector('.ceremony-avatar')).toHaveAttribute('aria-hidden', 'true');
      expect(c.querySelector('.ceremony-badges')).toHaveAttribute('aria-hidden', 'true');
    }
    expect(li[0].querySelector('.ceremony-trophy')!.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('team mode: the team name and the team animal, no member list', () => {
    let g = makeGame({
      mode: 'team',
      participants: [
        player('t1', '번개팀', 'bear', { memberNames: ['민수', '지아'] }),
        player('t2', '구름팀', 'rabbit', { memberNames: ['하준', '서연'] }),
      ],
    });
    g = endGame(withStars(g, [2, 1]), 'manual');
    setGame(g);
    render(<CeremonyPanel game={g} introActive={false} />);
    const li = cards();
    expect(li.map((c) => c.querySelector('.ceremony-name')!.textContent)).toEqual(['번개팀', '구름팀']);
    expect(li[0].querySelector('.ceremony-avatar')!.textContent).toContain('🐻');
    expect(screen.queryByText(/민수|지아|하준|서연/)).toBeNull();
  });

  it('a name with markup renders as text (T-08-23)', () => {
    const evil = '<img src=x onerror=alert(1)>';
    let g = makeGame({ participants: [player('p1', evil, 'bear'), player('p2', '바다', 'cat')] });
    g = endGame(withStars(g, [3, 1]), 'manual');
    setGame(g);
    const { container } = render(
      <>
        <CeremonyPanel game={g} introActive={false} />
        <DomPodium game={g} onRedraw={() => {}} />
      </>,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(`🏆 우승! 🐻 ${evil}`)).toBeInTheDocument();
    expect(cards()[0].querySelector('.ceremony-name')!.textContent).toBe(evil);
  });
});

describe('CeremonyPanel — 🔁 다시 하기 / 처음으로 (END-03, D-16)', () => {
  it('🔁 다시 하기 restarts: same participants / animals / rounds, new board, stats all 0', () => {
    const g = endGame(withStars(makeGame({ participants: three(), rules: { rounds: 4 } }), [2, 5, 1]), 'manual');
    setGame(g);
    render(<CeremonyPanel game={g} introActive />);
    const btn = screen.getByRole('button', { name: '🔁 다시 하기' });
    expect(btn).toHaveAttribute('data-skip-ignore');
    fireEvent.click(btn);
    const n = useGameStore.getState().game!;
    expect(n.phase).toBe('awaitingRoll');
    expect(n.board).not.toBe(g.board);
    expect(n.config.rules.rounds).toBe(4);
    expect(n.config.participants.map((p) => [p.id, p.animal])).toEqual([
      ['p1', 'bear'],
      ['p2', 'cat'],
      ['p3', 'fox'],
    ]);
    expect(n.config.participants.every((p) => p.stars === 0)).toBe(true);
    expect(Object.values(n.stats).every((s) => Object.values(s).every((v) => v === 0))).toBe(true);
  });

  it('처음으로 resets to no game, also during the intro', () => {
    const g = fourDone();
    setGame(g);
    render(<CeremonyPanel game={g} introActive />);
    const btn = screen.getByRole('button', { name: '처음으로' });
    expect(btn).toHaveAttribute('data-skip-ignore');
    fireEvent.click(btn);
    expect(useGameStore.getState().game).toBeNull();
  });

  it('a double tap on 🔁 다시 하기 restarts once and locks every other guarded action (CR-01)', () => {
    vi.useFakeTimers();
    const g = fourDone();
    setGame(g);
    const other = vi.fn();
    let otherGuard: ReturnType<typeof useInputLock> | null = null;
    function OtherGuard() {
      otherGuard = useInputLock();
      return null;
    }
    render(
      <>
        <CeremonyPanel game={g} introActive />
        <OtherGuard />
      </>,
    );
    const restart = vi.spyOn(useGameStore.getState(), 'restart');
    fireEvent.click(screen.getByRole('button', { name: '🔁 다시 하기' }));
    fireEvent.click(screen.getByRole('button', { name: '🔁 다시 하기' }));
    expect(restart).toHaveBeenCalledTimes(1);
    // The next screen's 🎲 has its own guard: the shared lock drops it until INPUT_LOCK_MS.
    otherGuard!(other);
    expect(other).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(INPUT_LOCK_MS);
    });
    otherGuard!(other);
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('inside the shared skip lock (the win-beat skip tap) neither button runs (CR-01)', () => {
    vi.useFakeTimers();
    const g = fourDone();
    setGame(g);
    render(<CeremonyPanel game={g} introActive />);
    const restart = vi.spyOn(useGameStore.getState(), 'restart');
    const reset = vi.spyOn(useGameStore.getState(), 'reset');
    lockInputFor(SKIP_LOCK_MS);
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    fireEvent.click(screen.getByRole('button', { name: '🔁 다시 하기' }));
    expect(reset).not.toHaveBeenCalled();
    expect(restart).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(SKIP_LOCK_MS);
    });
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe('DomPodium (D-11 fallback, UI-SPEC F7)', () => {
  it('one gold block, a crown per winner, the others as colored circles, a redraw button, no error copy', () => {
    const g = threeDone([4, 4, 1]);
    const onRedraw = vi.fn();
    const { container } = render(<DomPodium game={g} onRedraw={onRedraw} />);
    expect(screen.getByRole('img', { name: '시상대, 우승: 하늘, 바다' })).toBeInTheDocument();
    expect(container.querySelectorAll('.dom-podium-crown')).toHaveLength(2);
    expect(container.querySelectorAll('.dom-podium-block')).toHaveLength(1);
    const dots = container.querySelectorAll<HTMLElement>('.dom-podium-dot');
    expect(dots).toHaveLength(1);
    expect(dots[0].textContent).toBe('🦊');
    expect(dots[0].style.getPropertyValue('--pc')).not.toBe('');
    expect(container.textContent).not.toMatch(/꺼졌어요|그리지 못했어요/);
    const btn = screen.getByRole('button', { name: '🔄 화면 다시 그리기' });
    expect(btn).toHaveAttribute('data-skip-ignore');
    fireEvent.click(btn);
    expect(onRedraw).toHaveBeenCalledTimes(1);
  });

  it('5+ winners get the is-many size', () => {
    const ps = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => player(id, id, 'bear'));
    const g = endGame(makeGame({ participants: ps }), 'manual'); // all zero stars → all co-winners
    const { container } = render(<DomPodium game={g} onRedraw={() => {}} />);
    expect(container.querySelector('.dom-podium')).toHaveClass('is-many');
    expect(container.querySelectorAll('.dom-podium-crown')).toHaveLength(6);
    expect(container.querySelectorAll('.dom-podium-dot')).toHaveLength(0);
  });
});

// ---------- useCeremonyIntro (D-16, UI-SPEC F5 / F7 등장 연출) ----------

function IntroHost({ active, gameKey }: { active: boolean; gameKey: unknown }) {
  const { introId, introActive } = useCeremonyIntro(active, gameKey);
  return (
    <div>
      <span data-testid="intro">{`${introId}:${introActive ? 'on' : 'off'}`}</span>
      <button type="button" data-skip-ignore>
        다시 하기
      </button>
    </div>
  );
}

const intro = () => screen.getByTestId('intro').textContent;

describe('useCeremonyIntro (D-16)', () => {
  let playSpy: MockInstance<typeof sfx.play>;
  let stopSpy: MockInstance<typeof sfx.stopGroup>;
  const fanfares = () => playSpy.mock.calls.filter((c) => c[0] === 'fanfare').length;

  beforeEach(() => {
    vi.useFakeTimers();
    installFakeAudio();
    playSpy = vi.spyOn(sfx, 'play');
    stopSpy = vi.spyOn(sfx, 'stopGroup');
  });
  afterEach(() => {
    cleanup();
    __resetSfxForTests();
    vi.unstubAllGlobals();
  });

  it('inactive → no intro, no fanfare', () => {
    render(<IntroHost active={false} gameKey="g1" />);
    expect(intro()).toBe('0:off');
    expect(fanfares()).toBe(0);
  });

  it('becoming active starts intro 1 with one fanfare (StrictMode too) and ends after CEREMONY_INTRO_MS', () => {
    const { rerender } = render(
      <StrictMode>
        <IntroHost active={false} gameKey="g1" />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <IntroHost active gameKey="g1" />
      </StrictMode>,
    );
    expect(intro()).toBe('1:on');
    expect(fanfares()).toBe(1);
    expect(playSpy.mock.calls[0][1]).toEqual({ group: expect.anything() });
    act(() => {
      vi.advanceTimersByTime(CEREMONY_INTRO_MS - 1);
    });
    expect(intro()).toBe('1:on');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(intro()).toBe('1:off');
    expect(fanfares()).toBe(1);
  });

  it('mounting already active also starts the intro once (StrictMode)', () => {
    render(
      <StrictMode>
        <IntroHost active gameKey="g1" />
      </StrictMode>,
    );
    expect(intro()).toBe('1:on');
    expect(fanfares()).toBe(1);
  });

  it('a page tap ends it at once and stops the fanfare group; a skip-ignore tap does not', () => {
    render(<IntroHost active gameKey="g1" />);
    expect(intro()).toBe('1:on');
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(intro()).toBe('1:on');
    expect(stopSpy).not.toHaveBeenCalled();
    fireEvent.click(document.body);
    expect(intro()).toBe('1:off');
    const group = playSpy.mock.calls[0][1]!.group!;
    expect(stopSpy).toHaveBeenCalledWith(group);
    // No input lock after the intro: a later tap does nothing special and nothing replays.
    fireEvent.click(document.body);
    expect(intro()).toBe('1:off');
    expect(fanfares()).toBe(1);
  });

  it('Escape ends it too', () => {
    render(<IntroHost active gameKey="g1" />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(intro()).toBe('1:off');
  });

  it('a new game key while active starts intro 2 with one more fanfare', () => {
    const { rerender } = render(<IntroHost active gameKey="g1" />);
    rerender(<IntroHost active gameKey="g2" />);
    expect(intro()).toBe('2:on');
    expect(fanfares()).toBe(2);
  });

  it('play → ceremony → play → ceremony: one fanfare per game; the same game never replays', () => {
    const { rerender } = render(<IntroHost active gameKey="g1" />);
    rerender(<IntroHost active={false} gameKey="g2" />);
    expect(intro()).toBe('1:off');
    rerender(<IntroHost active gameKey="g2" />);
    expect(intro()).toBe('2:on');
    expect(fanfares()).toBe(2);
    rerender(<IntroHost active={false} gameKey="g2" />);
    rerender(<IntroHost active gameKey="g2" />);
    expect(intro()).toBe('2:off');
    expect(fanfares()).toBe(2);
  });
});

// ---------- game.css ceremony block (UI-SPEC F7 / F8 / §Spacing / §Color, D-12, D-13) ----------

describe('game.css ceremony block (08-10)', () => {
  const MARK = '=== Phase 8: ceremony (08-10) ===';
  const start = gameCss.indexOf(MARK);
  const next = gameCss.indexOf('=== Phase 8:', start + MARK.length);
  const block = start < 0 ? '' : gameCss.slice(start, next < 0 ? undefined : next);
  // The whole rule text for a selector (first match), e.g. rule('.sound-toggle').
  const rule = (src: string, sel: string) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return src.match(new RegExp(`(^|[\\s,}])${esc}\\s*\\{[^}]*\\}`))?.[0] ?? '';
  };
  const mediaBody = (src: string, cond: string) => {
    const i = src.indexOf(`@media ${cond}`);
    if (i < 0) return '';
    let depth = 0;
    for (let k = src.indexOf('{', i); k < src.length; k++) {
      if (src[k] === '{') depth++;
      else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1);
    }
    return '';
  };

  it('exists once, tokens and color-mix only: no hex literal, no coral', () => {
    expect(start).toBeGreaterThan(-1);
    expect(gameCss.indexOf(MARK, start + 1)).toBe(-1);
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toContain('--coral');
    expect(block).toContain('color-mix(');
  });

  it('portrait grid rows and the landscape columns (360px, 300px on phone landscape)', () => {
    // CR-02: the canvas floor shrinks on short screens and the panel row can give up height
    // (minmax(0, auto)), so the actions row always stays inside the fixed 100dvh stage.
    expect(rule(block, '.game-stage.stage.stage--ceremony')).toMatch(
      /grid-template-rows:\s*auto minmax\(min\(160px, 22dvh\), 1fr\) minmax\(0, auto\) auto;/,
    );
    const land = mediaBody(block, '(orientation: landscape) and (min-aspect-ratio: 5/4) {');
    expect(land).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) 360px/);
    expect(land).toMatch(/\.stage-canvas-cell\s*\{[^}]*grid-row:\s*1 \/ -1/);
    const phone = mediaBody(block, '(orientation: landscape) and (min-aspect-ratio: 5/4) and (max-height: 500px)');
    expect(phone).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) 300px/);
  });

  it('panel max 48dvh with vertical scroll; the card grid auto-fills 160px columns with an 8px gap', () => {
    const panel = rule(block, '.ceremony-panel');
    expect(panel).toMatch(/max-height:\s*48dvh/);
    expect(panel).toMatch(/overflow-y:\s*auto/);
    expect(panel).toMatch(/min-height:\s*0;/); // CR-02: the minmax(0, auto) row can shrink it
    const list = rule(block, '.ceremony-list');
    expect(list).toContain('repeat(auto-fill, minmax(160px, 1fr))');
    expect(list).toMatch(/gap:\s*8px/);
  });

  it('sound toggle: absolute top-right 8px, z 4, 56px circle, 48px on phone and short screens, sky focus ring', () => {
    const t = rule(block, '.sound-toggle');
    expect(t).toMatch(/position:\s*absolute/);
    expect(t).toMatch(/top:\s*8px/);
    expect(t).toMatch(/right:\s*8px/);
    expect(t).toMatch(/z-index:\s*4/);
    expect(t).toMatch(/width:\s*56px/);
    expect(t).toMatch(/height:\s*56px/);
    expect(t).toMatch(/border-radius:\s*999px/);
    for (const cond of ['(max-width: 560px)', '(max-height: 760px)']) {
      const m = mediaBody(block, cond);
      expect(rule(m, '.sound-toggle'), cond).toMatch(/width:\s*48px/);
      expect(rule(m, '.sound-toggle'), cond).toMatch(/height:\s*48px/);
    }
    expect(rule(block, '.sound-toggle:focus-visible')).toMatch(/outline:\s*3px solid var\(--sky\)/);
  });

  it('action buttons: 72 / 64 / 56px, 다시 하기 flex 2 and 처음으로 flex 1 at the same height', () => {
    const btn = /\.ceremony-actions > \.game-btn,\s*\.game-stage\.stage\.stage--ceremony \.ceremony-actions > \.game-btn--sm\s*\{[^}]*min-height:\s*(\d+)px/;
    expect(block.match(btn)?.[1]).toBe('72');
    expect(mediaBody(block, '(max-width: 560px)').match(btn)?.[1]).toBe('64');
    expect(mediaBody(block, '(max-height: 760px)').match(btn)?.[1]).toBe('56');
    expect(block).toMatch(/\.ceremony-actions > \.game-btn\s*\{[^}]*flex:\s*2/);
    expect(block).toMatch(/\.ceremony-actions > \.game-btn--sm\s*\{[^}]*flex:\s*1/);
  });

  it('no last-place styling: no :last-child / :nth-* selectors, no opacity or filter on the plain card', () => {
    expect(block).not.toMatch(/:last-child|:nth-last-child|:nth-child/);
    const card = rule(block, '.ceremony-card');
    expect(card).not.toBe('');
    expect(card).not.toMatch(/opacity|filter/);
    expect(rule(block, '.ceremony-card.is-winner')).toContain('color-mix(in srgb, var(--sun) 22%, var(--panel))');
  });

  it('its own reduced-motion block turns the intro animations off', () => {
    const rm = mediaBody(block, '(prefers-reduced-motion: reduce)');
    expect(rm).not.toBe('');
    for (const k of ['ceremony-title-in', 'ceremony-card-in', 'dom-podium-pop']) {
      expect(block).toContain(`@keyframes ${k}`);
    }
    expect(rm).toMatch(/\.ceremony-title[^{]*\{[^}]*animation:\s*none/);
    expect(rm).toMatch(/\.ceremony-card[^{]*\{[^}]*animation:\s*none/);
    expect(rm).toMatch(/\.dom-podium-champ[^{]*\{[^}]*animation:\s*none/);
  });
});
