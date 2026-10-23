// src/game/hud/starFlight.test.tsx — the DOM star flight (08-07: FX-02, D-03, D-05, D-07, D-08, D-23).
// A minimal harness mounts the real StarFlight, Scoreboard (+ useStarHit) and Banner (which ends the
// beat at beat.ms) next to a `.stage-canvas` div; getBoundingClientRect is pinned per element so the
// expected start (fitCamera + headAnchor + projectNdc + ndcToClient) and the avatar end are exact.
// One GameStage check through the fake canvas proves the wiring. Fake timers throughout.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StarFlight from './StarFlight';
import Scoreboard from './Scoreboard';
import Banner from './Banner';
import { HIT_MS, useStarHit } from './useStarHit';
import GameApp from '../GameApp';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import { STARS_MS, STARS_MS_REDUCED } from '../director/timeline';
import { successPlan } from '../director/successPlan';
import { useGameStore } from '../../harness/useGameStore';
import { boardWith, dice, makeGame, mission, patchParticipant, player, questTile } from '../../engine/testkit';
import { rollDice } from '../../engine/game';
import type { AnimalId } from '../../engine/animals';
import { fitCamera } from '../layout/fitCamera';
import { boardExtents, ringLayout } from '../layout/ringLayout';
import { headAnchor } from '../layout/headAnchor';
import { ndcOnScreen, ndcToClient, projectNdc } from '../layout/project';
import { prefersReducedMotion } from '../reducedMotion';
import { fakeCanvas, waitForCanvas } from '../../test/fakeGameCanvas';
import { resetSharedInputLock } from '../useInputLock';
import gameCss from '../styles/game.css?raw';

vi.mock('../reducedMotion', () => ({ prefersReducedMotion: vi.fn(() => false) }));
vi.mock('../scene/GameCanvas', () => import('../../test/fakeGameCanvas'));
const reducedMock = vi.mocked(prefersReducedMotion);

const tiles = boardWith(20);
const order = ['a', 'b', 'c'];
const positions = { a: 0, b: 0, c: 7 };
const ANIMALS: Record<string, AnimalId> = { a: 'bear', b: 'cat', c: 'dog' };
const XSS = '"><img src=x onerror=alert(1)>';

// Element rects: the canvas (and its cell) and one 40 px avatar per participant.
const CANVAS = { left: 0, top: 60, width: 400, height: 500 };
const AVATAR: Record<string, { left: number; top: number }> = {
  a: { left: 20, top: 600 },
  b: { left: 120, top: 600 },
  c: { left: 220, top: 600 },
};
const rectOf = (r: { left: number; top: number; width: number; height: number }) =>
  ({ ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON: () => r }) as DOMRect;
const avatarCenter = (pid: string) => ({ x: AVATAR[pid].left + 20, y: AVATAR[pid].top + 20 });
const canvasCenter = { x: CANVAS.left + CANVAS.width / 2, y: CANVAS.top + CANVAS.height / 2 };

function pinRects() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('stage-canvas') || this.classList.contains('stage-canvas-cell')) return rectOf(CANVAS);
    if (this.classList.contains('sb-avatar')) {
      const pid = (this.closest('[data-pid]') as HTMLElement | null)?.dataset.pid ?? '';
      const a = AVATAR[pid];
      if (a) return rectOf({ ...a, width: 40, height: 40 });
    }
    return rectOf({ left: 0, top: 0, width: 0, height: 0 });
  });
}

function Harness({ canvasOk = true, names = {} as Record<string, string> }) {
  const hitId = useStarHit();
  const stars = usePresentation((s) => s.displayed.stars);
  const entries = order.map((id) => ({ id, name: names[id] ?? id.toUpperCase(), animal: ANIMALS[id], stars: stars[id] ?? 0 }));
  return (
    <div className="game-stage stage">
      <div className="stage-canvas-cell">
        <div className="stage-canvas" />
        <Banner />
        <StarFlight tiles={tiles} order={order} currentId="b" canvasOk={canvasOk} />
      </div>
      <div className="stage-bottom">
        <Scoreboard entries={entries} currentId="b" hitId={hitId} />
      </div>
    </div>
  );
}

// The engine already holds the result (b +3), so the drain after the beat shows ⭐3 for b.
function seedStores() {
  let game = makeGame({
    board: tiles,
    participants: [player('a', 'A', 'bear'), player('b', 'B', 'cat'), player('c', 'C', 'dog')],
  });
  game = patchParticipant(game, 1, { stars: 3, position: 0 });
  game = patchParticipant(game, 2, { position: 7 });
  game = patchParticipant(game, 0, { position: 0 });
  useGameStore.setState({ game });
  usePresentation.getState().reset({ positions, stars: { a: 0, b: 0, c: 0 } }, null);
}

const playStars = (stars: number, ms: number) =>
  act(() => {
    usePresentation.getState().play([{ kind: 'stars', pid: 'b', stars, ms }]);
  });
const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const starEls = () => document.querySelectorAll<HTMLElement>('.fx-star');
const cell = (pid: string) => document.querySelector<HTMLElement>(`.sb-cell[data-pid="${pid}"]`)!;
const px = (el: HTMLElement, v: string) => {
  const raw = el.style.getPropertyValue(v);
  expect(raw, v).toMatch(/^-?\d+(\.\d+)?px$/);
  return parseFloat(raw);
};

beforeEach(() => {
  reducedMock.mockReturnValue(false);
  seedStores();
  pinRects();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  useGameStore.setState({ game: null, startBlockedReason: null });
});

describe('StarFlight — the ⭐3 flight (FX-02, D-03, D-05)', () => {
  const plan = successPlan(3, STARS_MS[3], false);

  it('pops one big +3 star above the head at flyFromMs, portaled to body, aimed at the avatar', () => {
    vi.useFakeTimers();
    render(<Harness />);
    playStars(3, STARS_MS[3]);
    tick(plan.flyFromMs - 1);
    expect(starEls()).toHaveLength(0);
    tick(1);
    const stars = starEls();
    expect(stars).toHaveLength(1);
    const star = stars[0];
    expect(document.body.contains(star)).toBe(true);
    expect(star.closest('.game-stage')).toBeNull();
    const layer = star.closest('.fx-layer');
    expect(layer).not.toBeNull();
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(star.querySelector('.fx-star-pill')?.textContent).toBe('+3');
    expect(star.querySelectorAll('svg')).toHaveLength(1);

    // Expected start: the same pure chain the component runs.
    const aspect = CANVAS.width / CANVAS.height;
    const fit = fitCamera(aspect, boardExtents(ringLayout(tiles.length)));
    const ndc = projectNdc(headAnchor(tiles, order, positions, 'b', 'b'), {
      position: fit.position,
      target: fit.target,
      fovDeg: fit.fov,
      aspect,
    });
    expect(ndc.inFront && ndcOnScreen(ndc)).toBe(true);
    const start = ndcToClient(ndc, CANVAS);
    const end = avatarCenter('b');
    expect(px(star, '--x0')).toBeCloseTo(start.x, 1);
    expect(px(star, '--y0')).toBeCloseTo(start.y, 1);
    expect(px(star, '--dx')).toBeCloseTo(end.x - start.x, 1);
    expect(px(star, '--dy')).toBeCloseTo(end.y - start.y, 1);
    const dy = end.y - start.y;
    expect(px(star, '--apex')).toBeCloseTo(Math.min(0, dy) - Math.max(64, 0.25 * Math.abs(dy)), 1);
    expect(star.style.getPropertyValue('--fly-ms')).toBe(`${plan.flyToMs - plan.flyFromMs - 160}ms`);
    expect(star.style.getPropertyValue('--pop-ms')).toBe('160ms');
  });

  it('flashes the avatar at flyToMs for 240 ms, drops the star at flyToMs + 80, stars rise at the beat end', () => {
    vi.useFakeTimers();
    render(<Harness />);
    playStars(3, STARS_MS[3]);
    tick(plan.flyToMs - 1);
    expect(cell('b')).not.toHaveClass('is-hit');
    tick(1);
    expect(cell('b')).toHaveClass('is-hit');
    expect(cell('a')).not.toHaveClass('is-hit');
    expect(starEls()).toHaveLength(1);
    tick(79);
    expect(starEls()).toHaveLength(1);
    tick(1);
    expect(starEls()).toHaveLength(0);
    expect(cell('b').textContent).toContain('⭐0'); // Phase 6 D-01: the number waits for the beat end
    tick(STARS_MS[3] - plan.flyToMs - 80);
    expect(usePresentation.getState().current).toBeNull();
    expect(cell('b').textContent).toContain('⭐3');
    tick(HIT_MS);
    expect(cell('b')).not.toHaveClass('is-hit');
    expect(starEls()).toHaveLength(0);
  });

  it('a skip before flyToMs removes the star in the same render (D-07, D-23)', () => {
    vi.useFakeTimers();
    render(<Harness />);
    playStars(3, STARS_MS[3]);
    tick(plan.flyFromMs + 100);
    expect(starEls()).toHaveLength(1);
    act(() => {
      const cur = usePresentation.getState().current!;
      usePresentation.getState().completeBeat(cur.id);
    });
    expect(starEls()).toHaveLength(0);
    expect(document.querySelector('.fx-layer')).toBeNull();
    tick(STARS_MS[3]);
    expect(starEls()).toHaveLength(0);
    expect(cell('b')).not.toHaveClass('is-hit');
  });

  it('starts at the canvas center when the 3D canvas is not ok (D-05)', () => {
    vi.useFakeTimers();
    render(<Harness canvasOk={false} />);
    playStars(1, STARS_MS[1]);
    tick(successPlan(1, STARS_MS[1], false).flyFromMs);
    const star = starEls()[0];
    expect(star).toBeDefined();
    expect(px(star, '--x0')).toBeCloseTo(canvasCenter.x, 1);
    expect(px(star, '--y0')).toBeCloseTo(canvasCenter.y, 1);
    expect(star.querySelector('.fx-star-pill')?.textContent).toBe('+1');
  });

  it('leaves nothing behind after five beats in a row (D-23)', () => {
    vi.useFakeTimers();
    render(<Harness />);
    for (let i = 0; i < 5; i++) {
      playStars(2, STARS_MS[2]);
      tick(STARS_MS[2]);
      expect(starEls()).toHaveLength(0);
    }
    expect(document.querySelectorAll('.fx-layer')).toHaveLength(0);
  });
});

describe('StarFlight — reduced motion (D-08)', () => {
  it('a still star fades in on the avatar at 600 ms and stays until the beat ends; no flash', () => {
    reducedMock.mockReturnValue(true);
    vi.useFakeTimers();
    render(<Harness />);
    playStars(3, STARS_MS_REDUCED);
    tick(599);
    expect(starEls()).toHaveLength(0);
    tick(1);
    const stars = starEls();
    expect(stars).toHaveLength(1);
    const star = stars[0];
    expect(star).toHaveClass('fx-star--still');
    expect(px(star, '--x0')).toBeCloseTo(avatarCenter('b').x, 1);
    expect(px(star, '--y0')).toBeCloseTo(avatarCenter('b').y, 1);
    expect(star.style.getPropertyValue('--dx')).toBe('');
    expect(cell('b')).not.toHaveClass('is-hit');
    tick(STARS_MS_REDUCED - 600 - 1);
    expect(starEls()).toHaveLength(1);
    expect(cell('b')).not.toHaveClass('is-hit');
    tick(1);
    expect(starEls()).toHaveLength(0);
  });
});

describe('StarFlight — security (T-08-12, T-08-13)', () => {
  it('a markup name never becomes an element or a style value', () => {
    vi.useFakeTimers();
    render(<Harness names={{ b: XSS }} />);
    playStars(3, STARS_MS[3]);
    tick(successPlan(3, STARS_MS[3], false).flyToMs);
    expect(starEls()).toHaveLength(1);
    expect(document.querySelectorAll('img')).toHaveLength(0);
    for (const el of document.querySelectorAll('[style]')) {
      const s = el.getAttribute('style') ?? '';
      expect(s).not.toContain('onerror');
      expect(s).not.toContain('img');
    }
  });

  it('every scoreboard cell carries data-pid = the entry id', () => {
    render(<Harness />);
    const cells = document.querySelectorAll<HTMLElement>('.sb-cell');
    expect(cells).toHaveLength(3);
    expect([...cells].map((c) => c.dataset.pid).sort()).toEqual(order);
  });
});

describe('GameStage wiring (FX-02)', () => {
  beforeEach(() => {
    fakeCanvas.reset();
    resetSharedInputLock();
  });
  afterEach(() => {
    fakeCanvas.reset();
    resetSharedInputLock();
  });

  it('✅ on a hard quest flies a +3 star out of the stage and flashes the judged cell', async () => {
    vi.restoreAllMocks(); // real (zero) rects: no canvas size → the cell center start
    const HARD = mission('h1', 'hard', { name: '양발 모아뛰기', desc: '' });
    const game = rollDice(makeGame({ missions: [HARD], board: boardWith(20, { 3: questTile('hard') }) }), dice(3));
    useGameStore.setState({ game, startBlockedReason: null });
    usePresentation.getState().reset(EMPTY_DISPLAYED, null);
    render(<GameApp />);
    await waitForCanvas();
    await waitFor(() => expect(screen.getByRole('button', { name: '✅ 성공' })).toBeInTheDocument());
    vi.useFakeTimers();
    const pid = game.config.participants[0].id;
    fireEvent.click(screen.getByRole('button', { name: '✅ 성공' }));
    const plan = successPlan(3, STARS_MS[3], false);
    tick(plan.flyFromMs);
    const star = starEls();
    expect(star).toHaveLength(1);
    expect(star[0].closest('.game-stage')).toBeNull();
    expect(star[0].querySelector('.fx-star-pill')?.textContent).toBe('+3');
    tick(plan.flyToMs - plan.flyFromMs);
    expect(cell(pid)).toHaveClass('is-hit');
    tick(STARS_MS[3] - plan.flyToMs);
    expect(starEls()).toHaveLength(0);
    expect(cell(pid)).not.toHaveClass('is-hit');
  });
});

describe('game.css star flight block (08-07, UI-SPEC F3 / §Color)', () => {
  const MARK = 'Phase 8: star flight (08-07)';
  const start = gameCss.indexOf(MARK);
  const next = gameCss.indexOf('=== Phase 8:', start + MARK.length);
  const block = start < 0 ? '' : gameCss.slice(start, next < 0 ? undefined : next);

  it('exists once with the layer, star, pill and hit rules', () => {
    expect(start).toBeGreaterThanOrEqual(0);
    expect(gameCss.indexOf(MARK, start + 1)).toBe(-1);
    for (const sel of ['.fx-layer', '.fx-star', '.fx-star-y', '.fx-star-svg', '.fx-star-pill', '.fx-star--still', '.sb-cell.is-hit']) {
      expect(block).toContain(sel);
    }
    for (const k of ['fx-star-pop', 'fx-star-x', 'fx-star-y', 'fx-star-still', 'sb-hit']) {
      expect(block).toContain(`@keyframes ${k}`);
    }
  });

  it('the layer is fixed, on z-index 40 and ignores the pointer', () => {
    const rule = block.match(/\.fx-layer\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('position: fixed');
    expect(rule).toMatch(/z-index:\s*40/);
    expect(rule).toMatch(/pointer-events:\s*none/);
  });

  it('uses tokens and color-mix only: no hex literal', () => {
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).toContain('color-mix(');
    expect(block).toContain('var(--sun)');
  });

  it('its own reduced-motion block turns the flight and the arrival flash off', () => {
    const i = block.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(i).toBeGreaterThanOrEqual(0);
    const media = block.slice(i);
    expect(media).toMatch(/\.fx-star\b[^{]*\.fx-star-y[^{]*\.fx-star-svg[^{]*\.sb-cell\.is-hit \.sb-avatar[^{]*\{[^}]*animation:\s*none/);
  });
});
