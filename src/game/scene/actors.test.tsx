// @vitest-environment node
// src/game/scene/actors.test.tsx — the moving 3D actors as beat consumers (D-16..D-20, D-25, HUD-03;
// Phase 7 07-04: chibi Character reactions, reduced motion and the 8-character draw budget).
// Runs in node with @react-three/test-renderer (no WebGL). Every store change is wrapped in
// ReactThreeTestRenderer.act (RESEARCH Pitfall 1); advanceFrames drives useFrame with a fixed delta.
import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Group, InstancedMesh, Mesh, type Object3D } from 'three';
import Character, { type CharacterProps } from './Character';
import PathPreview from './PathPreview';
import Dice from './Dice';
import { SceneContents } from './SceneContents';
import { FACE_UP_EULER, diceSize, type DieFace } from '../layout/diceFaces';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import type { BeatSpec } from '../director/timeline';
import { useGameStore } from '../../harness/useGameStore';
import { boardWith, eventTile, makeGame, patchParticipant, player, questTile } from '../../engine/testkit';
import { standPoints } from '../layout/pawnSlots';
import { ARM_REST, FACE_KEYS, HEAD_TILT, type FaceKey } from '../layout/chibiDims';
import type { AnimalId } from '../../engine/animals';
import { faceGeo } from './chibiFaces';

// Character reads prefersReducedMotion once at mount; one describe turns it on.
const rm = vi.hoisted(() => ({ reduced: false }));
vi.mock('../reducedMotion', () => ({ prefersReducedMotion: () => rm.reduced }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const named = (r: Renderer, name: string): Object3D[] =>
  r.scene.findAll((n) => (n.instance as Object3D | undefined)?.name === name).map((n) => n.instance as Object3D);

const one = (r: Renderer, name: string): Object3D => {
  const found = named(r, name);
  expect(found, name).toHaveLength(1);
  return found[0];
};

const tiles20 = boardWith(20);
const points = standPoints(tiles20);
const CENTER = { dx: 0, dz: 0, scale: 1 };
const TAU = 2 * Math.PI;

const originalComplete = usePresentation.getState().completeBeat;
let completeSpy: ReturnType<typeof vi.fn<(id: number) => void>>;

let open: Renderer[] = [];
async function mount(el: ReactElement): Promise<Renderer> {
  const r = await ReactThreeTestRenderer.create(el);
  open.push(r);
  return r;
}

async function play(specs: BeatSpec[]): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    usePresentation.getState().play(specs);
  });
}

// Engine already moved: participant a stands on tile 3 (the drain resyncs `displayed` from it).
function engineAt(pos: number): void {
  const game = patchParticipant(
    makeGame({ board: tiles20, participants: [player('a', 'A', 'bear')] }),
    0,
    { position: pos },
  );
  useGameStore.setState({ game });
}

beforeEach(() => {
  completeSpy = vi.fn((id: number) => originalComplete(id));
  usePresentation.setState({ completeBeat: completeSpy });
  usePresentation.getState().reset({ positions: { a: 0 }, stars: { a: 0 } }, null);
  useGameStore.setState({ game: null });
});

afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  usePresentation.setState({ completeBeat: originalComplete });
  useGameStore.setState({ game: null });
});

// Frames inside act, so a store change made by a consumer re-renders before the next assertion.
async function frames(r: Renderer, n: number, dt: number): Promise<void> {
  await ReactThreeTestRenderer.act(async () => {
    await r.advanceFrames(n, dt);
  });
}

const hopSpec = (path: number[], ms: number): BeatSpec => ({ kind: 'hop', pid: 'a', path, by: 'dice', ms });

const char = (over: Partial<CharacterProps> = {}) => (
  <Character pid="a" animal="bear" seed={0} points={points} slot={CENTER} isCurrent={false} isLeader={false} {...over} />
);

// A named node inside the ground group `pawn-{pid}`.
const partOf = (r: Renderer, pid: string, name: string): Object3D => {
  let found: Object3D | null = null;
  one(r, `pawn-${pid}`).traverse((o) => {
    if (o.name === name) found = o;
  });
  expect(found, `${pid} ${name}`).not.toBeNull();
  return found!;
};
// The face key shown by a character (compared by name: a failing geometry diff would be huge).
const faceOf = (r: Renderer, pid = 'a', animal: AnimalId = 'bear'): FaceKey | 'unknown' => {
  const geo = (partOf(r, pid, 'chibi-face') as Mesh).geometry;
  return FACE_KEYS.find((k) => faceGeo(animal, k) === geo) ?? 'unknown';
};
const angleOff = (a: number, b: number) => Math.abs(a - b - TAU * Math.round((a - b) / TAU));

const starsSpec = (pid = 'a'): BeatSpec => ({ kind: 'stars', pid, stars: 1, ms: 900 });
const eventSpec = (eff: 'forward' | 'backward' | 'extra', suppressed = false): BeatSpec => ({
  kind: 'event',
  pid: 'a',
  eff,
  steps: 2,
  suppressed,
  name: '',
  label: '',
  ms: 1000,
});

describe('Character — hop beat consumer and reactions (D-07..D-16, D-22, CHAR-01..03)', () => {
  it('hops tile by tile and completes the hop beat exactly once after its ms', async () => {
    engineAt(3);
    const r = await mount(char());
    await play([hopSpec([1, 2, 3], 750)]);
    const id = usePresentation.getState().current!.id;

    await r.advanceFrames(10, 0.05); // 0.5 s
    expect(usePresentation.getState().busy).toBe(true);
    expect(completeSpy).not.toHaveBeenCalled();

    await r.advanceFrames(6, 0.05); // 0.8 s
    expect(usePresentation.getState().busy).toBe(false);
    expect(usePresentation.getState().displayed.positions.a).toBe(3);
    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenCalledWith(id);

    await r.advanceFrames(20, 0.05);
    expect(completeSpy).toHaveBeenCalledTimes(1);

    const g = one(r, 'pawn-a');
    expect(g.position.x).toBeCloseTo(points[3].x, 3);
    expect(g.position.z).toBeCloseTo(points[3].z, 3);
    expect(g.position.y).toBeCloseTo(points[3].y, 3);
  });

  it('lifts the body into a parabolic arc mid-segment', async () => {
    engineAt(1);
    const r = await mount(char());
    await play([hopSpec([1], 400)]);
    await r.advanceFrames(4, 0.05); // half way through the only segment
    expect(one(r, 'pawn-body').position.y).toBeGreaterThan(0.3);
    const g = one(r, 'pawn-a');
    expect(g.position.x).toBeGreaterThan(Math.min(points[0].x, points[1].x));
    expect(g.position.x).toBeLessThan(Math.max(points[0].x, points[1].x));
  });

  it('when skipAll ends the hop first it never completes it and settles at the new rest point', async () => {
    engineAt(3);
    const slot = { dx: 0.2, dz: -0.2, scale: 1 };
    const r = await mount(char({ slot }));
    await play([hopSpec([1, 2, 3], 750)]);
    await r.advanceFrames(4, 0.05);
    await ReactThreeTestRenderer.act(async () => {
      usePresentation.getState().skipAll();
    });
    await r.advanceFrames(60, 0.05);
    expect(completeSpy).not.toHaveBeenCalled();
    const g = one(r, 'pawn-a');
    expect(g.position.x).toBeCloseTo(points[3].x + slot.dx, 3);
    expect(g.position.z).toBeCloseTo(points[3].z + slot.dz, 3);
    expect(g.position.y).toBeCloseTo(points[3].y, 3);
    expect(one(r, 'pawn-body').position.y).toBeCloseTo(0, 3);
  });

  it('ignores hop beats of another participant', async () => {
    const r = await mount(char());
    await play([{ kind: 'hop', pid: 'b', path: [1, 2], by: 'dice', ms: 500 }]);
    await r.advanceFrames(20, 0.05);
    expect(completeSpy).not.toHaveBeenCalled();
    expect(one(r, 'pawn-a').position.x).toBeCloseTo(points[0].x, 6);
  });

  it('only the current character wears the turn ring and only leaders wear a crown', async () => {
    const r = await mount(
      <>
        {char({ isCurrent: true })}
        {char({ pid: 'b', animal: 'cat', seed: 1, isLeader: true })}
        {char({ pid: 'c', animal: 'dog', seed: 2, isLeader: true })}
      </>,
    );
    expect(named(r, 'turn-ring')).toHaveLength(1);
    expect(named(r, 'crown')).toHaveLength(2);
    partOf(r, 'a', 'turn-ring');
  });

  it('the current character bounces and its ring breathes while idle', async () => {
    const r = await mount(char({ isCurrent: true }));
    let maxY = 0;
    let maxRing = 1;
    for (let k = 0; k < 16; k++) {
      await r.advanceFrames(1, 0.05);
      maxY = Math.max(maxY, one(r, 'pawn-body').position.y);
      maxRing = Math.max(maxRing, one(r, 'turn-ring').scale.x);
    }
    expect(maxY).toBeGreaterThan(0.05);
    expect(maxY).toBeLessThanOrEqual(0.08 + 1e-9);
    expect(maxRing).toBeGreaterThan(1.05);
    expect(maxRing).toBeLessThanOrEqual(1.08 + 1e-9);
  });

  it('a character that is not current only breathes (≤ 2 %), out of phase with another seed', async () => {
    const r = await mount(
      <>
        {char()}
        {char({ pid: 'b', animal: 'cat', seed: 3 })}
      </>,
    );
    let maxGap = 0;
    for (let k = 0; k < 75; k++) {
      await r.advanceFrames(1, 0.04); // 3 s
      const a = partOf(r, 'a', 'pawn-body');
      const b = partOf(r, 'b', 'pawn-body');
      expect(a.position.y).toBe(0);
      expect(a.scale.y).toBeGreaterThanOrEqual(0.985);
      expect(a.scale.y).toBeLessThanOrEqual(1.015);
      maxGap = Math.max(maxGap, Math.abs(a.scale.y - b.scale.y));
    }
    expect(maxGap).toBeGreaterThan(0.005);
  });

  it('is exactly 7 meshes without ring and crown', async () => {
    const r = await mount(char());
    const g = one(r, 'pawn-a');
    expect(g).toBeInstanceOf(Group);
    let meshes = 0;
    g.traverse((o) => {
      if (o instanceof Mesh) meshes++;
    });
    expect(meshes).toBe(7);
  });

  it('faces the travel direction while hopping and turns back to the camera after the move (D-11)', async () => {
    engineAt(1);
    const r = await mount(char({ isCurrent: true }));
    await play([hopSpec([1], 1000)]);
    await r.advanceFrames(10, 0.05); // 0.5 s into the hop
    const target = Math.atan2(points[1].x - points[0].x, points[1].z - points[0].z);
    expect(angleOff(one(r, 'pawn-body').rotation.y, target)).toBeLessThan(0.2);
    await frames(r, 12, 0.05); // the hop completes at 1.0 s
    expect(completeSpy).toHaveBeenCalledTimes(1);
    await frames(r, 20, 0.05); // 1 s later
    expect(angleOff(one(r, 'pawn-body').rotation.y, 0)).toBeLessThan(0.05);
  });

  it('stars: joy face from the first frame, crouch-jump-spin, never completed by the character (D-12, D-22)', async () => {
    const r = await mount(char({ isCurrent: true }));
    await play([starsSpec()]);
    await frames(r, 1, 0.04);
    expect(faceOf(r)).toBe('joy');
    let nearPi = Infinity;
    let maxY = 0;
    for (let k = 0; k < 29; k++) {
      await r.advanceFrames(1, 0.04); // 1.2 s in all
      const body = one(r, 'pawn-body');
      nearPi = Math.min(nearPi, Math.abs(body.rotation.y - Math.PI));
      maxY = Math.max(maxY, body.position.y);
      expect(faceOf(r)).toBe('joy');
    }
    expect(nearPi).toBeLessThan(0.5);
    expect(maxY).toBeGreaterThanOrEqual(0.4);
    expect(completeSpy).not.toHaveBeenCalled(); // the Banner (or the watchdog) owns this beat
    expect(usePresentation.getState().current?.kind).toBe('stars');

    await ReactThreeTestRenderer.act(async () => usePresentation.getState().skipAll());
    await frames(r, 20, 0.04);
    expect(faceOf(r)).toBe('excited');
    expect(one(r, 'pawn-body').position.y).toBeLessThanOrEqual(0.08 + 1e-6); // back to the idle bounce
    expect(completeSpy).not.toHaveBeenCalled();
  });

  it('miss: sad face, head down; events and the start bonus pick their faces (D-13, D-07)', async () => {
    const r = await mount(char());
    await play([{ kind: 'miss', pid: 'a', ms: 700 }]);
    let pitch = -Infinity;
    for (let k = 0; k < 8; k++) {
      await r.advanceFrames(1, 0.04);
      pitch = Math.max(pitch, partOf(r, 'a', 'chibi-head-pivot').rotation.x);
    }
    expect(faceOf(r)).toBe('sad');
    expect(pitch).toBeGreaterThanOrEqual(-HEAD_TILT + 0.3);

    const cases: [BeatSpec, FaceKey][] = [
      [eventSpec('backward'), 'sad'],
      [eventSpec('forward'), 'surprised'],
      [eventSpec('extra'), 'joy'],
      [eventSpec('extra', true), 'surprised'],
      [{ kind: 'startBonus', pid: 'a', stars: 1, ms: 800 }, 'joy'],
    ];
    for (const [spec, key] of cases) {
      await ReactThreeTestRenderer.act(async () => usePresentation.getState().skipAll());
      await play([spec]);
      await frames(r, 2, 0.04);
      expect(faceOf(r)).toBe(key);
    }
    expect(completeSpy).not.toHaveBeenCalled();
  });

  it('re-rendering with isCurrent toggled during a stars beat keeps the joy face', async () => {
    const r = await mount(char({ isCurrent: true }));
    await play([starsSpec()]);
    await frames(r, 2, 0.04);
    expect(faceOf(r)).toBe('joy');
    await ReactThreeTestRenderer.act(async () => {
      await r.update(char({ isCurrent: false }));
    });
    expect(faceOf(r)).toBe('joy');
    await frames(r, 2, 0.04);
    expect(faceOf(r)).toBe('joy');
  });

  it('blinks: a short idleBlink now and then, idle most of the time', async () => {
    const r = await mount(char());
    let blink = 0;
    let idle = 0;
    for (let k = 0; k < 125; k++) {
      await r.advanceFrames(1, 0.04); // 5 s
      const key = faceOf(r);
      if (key === 'idleBlink') blink++;
      else if (key === 'idle') idle++;
    }
    expect(blink).toBeGreaterThanOrEqual(1);
    expect(idle).toBeGreaterThan(100);
    expect(blink + idle).toBe(125);
  });
});

describe('Character — reduced motion (D-16): faces and blinks only', () => {
  beforeEach(() => {
    rm.reduced = true;
  });
  afterEach(() => {
    rm.reduced = false;
  });

  it('a stars beat changes the face but not the body; the current character does not bounce', async () => {
    const r = await mount(char({ isCurrent: true }));
    await play([starsSpec()]);
    for (let k = 0; k < 25; k++) {
      await r.advanceFrames(1, 0.04);
      const body = one(r, 'pawn-body');
      expect(body.position.y).toBe(0);
      expect(body.rotation.y).toBe(0);
      expect(faceOf(r)).toBe('joy');
    }
    await ReactThreeTestRenderer.act(async () => usePresentation.getState().skipAll());
    for (let k = 0; k < 20; k++) {
      await r.advanceFrames(1, 0.04);
      expect(one(r, 'pawn-body').position.y).toBe(0);
      expect(one(r, 'turn-ring').scale.x).toBe(1);
    }
  });

  it('a character that is not current does not breathe', async () => {
    const r = await mount(char());
    for (let k = 0; k < 40; k++) {
      await r.advanceFrames(1, 0.05);
      expect(one(r, 'pawn-body').scale.y).toBe(1);
    }
  });
});

describe('PathPreview — preview beat consumer (D-16)', () => {
  const dots = (r: Renderer) => one(r, 'path-dots') as InstancedMesh;

  it('shows path dots and the destination, completes the preview once, then dots vanish as the pawn passes', async () => {
    // Mounted alone: advanceFrames runs every frame of one subscriber before the next, so a
    // second consumer would see the hop with a different clock. The hop is completed by hand.
    const r = await mount(<PathPreview points={points} />);
    expect(dots(r).count).toBe(0);
    expect(one(r, 'dest-ring').visible).toBe(false);

    await play([
      { kind: 'preview', pid: 'a', path: [5, 6, 7], ms: 500 },
      hopSpec([5, 6, 7], 750),
    ]);
    const previewId = usePresentation.getState().current!.id;
    expect(dots(r).count).toBe(3);
    expect(one(r, 'dest-ring').visible).toBe(true);
    expect(one(r, 'dest-cone').visible).toBe(true);
    const ring = one(r, 'dest-ring');
    expect(ring.position.x).toBeCloseTo(points[7].x, 6);
    expect(ring.position.z).toBeCloseTo(points[7].z, 6);
    expect(one(r, 'dest-cone').position.y).toBeGreaterThan(points[7].y + 0.9);

    await frames(r, 9, 0.05); // 0.45 s
    expect(usePresentation.getState().current!.kind).toBe('preview');
    expect(completeSpy).not.toHaveBeenCalled();
    await frames(r, 2, 0.05); // 0.55 s — the last frame already sees the hop (0.05 s in)
    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenCalledWith(previewId);
    const hop = usePresentation.getState().current!;
    expect(hop.kind).toBe('hop');

    // Hop is current: the dots stay, then drop as tiles are passed (250 ms per tile).
    expect(dots(r).count).toBe(3);
    expect(one(r, 'dest-ring').visible).toBe(true);
    await frames(r, 5, 0.05); // 0.30 s into the hop → one tile passed
    expect(dots(r).count).toBe(2);
    await frames(r, 5, 0.05); // 0.55 s → two tiles passed
    expect(dots(r).count).toBe(1);
    await frames(r, 10, 0.05); // past the hop length: the preview never completes a hop
    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(one(r, 'dest-ring').visible).toBe(true);

    await ReactThreeTestRenderer.act(async () => usePresentation.getState().completeBeat(hop.id));
    await frames(r, 1, 0.05);
    expect(usePresentation.getState().busy).toBe(false);
    expect(dots(r).count).toBe(0);
    expect(one(r, 'dest-ring').visible).toBe(false);
    expect(one(r, 'dest-cone').visible).toBe(false);
  });

  it('hides itself in the frame loop when the hop ends without a re-render', async () => {
    const r = await mount(<PathPreview points={points} />);
    await play([hopSpec([1, 2], 500)]);
    const id = usePresentation.getState().current!.id;
    expect(dots(r).count).toBe(2);
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {}); // act warning by design
    usePresentation.getState().completeBeat(id); // outside act: no React re-render
    await r.advanceFrames(1, 0.05);
    quiet.mockRestore();
    expect(dots(r).count).toBe(0);
    expect(one(r, 'dest-ring').visible).toBe(false);
  });

  it('shows nothing for an event hop or a dice beat', async () => {
    const r = await mount(<PathPreview points={points} />);
    await play([{ kind: 'hop', pid: 'a', path: [3, 2], by: 'event', ms: 500 }]);
    expect(dots(r).count).toBe(0);
    expect(one(r, 'dest-ring').visible).toBe(false);
    await ReactThreeTestRenderer.act(async () => usePresentation.getState().skipAll());
    await play([{ kind: 'dice', pid: 'a', face: 3, ms: 1000 }]);
    await frames(r, 4, 0.05);
    expect(dots(r).count).toBe(0);
    expect(one(r, 'dest-cone').visible).toBe(false);
  });
});

describe('Dice — dice beat consumer (D-20)', () => {
  const dieOf = (r: Renderer) => one(r, 'dice');
  const expectFace = (o: Object3D, face: DieFace) => {
    const [x, y, z] = FACE_UP_EULER[face];
    expect(o.rotation.x).toBeCloseTo(x, 6);
    expect(o.rotation.y).toBeCloseTo(y, 6);
    expect(o.rotation.z).toBeCloseTo(z, 6);
  };

  it('spins, snaps exactly to the engine face and completes once within its 1000 ms beat', async () => {
    const r = await mount(<Dice boardLength={20} restFace={null} />);
    const restY = dieOf(r).position.y;
    await play([{ kind: 'dice', pid: 'a', face: 5, ms: 1000 }]);
    const id = usePresentation.getState().current!.id;

    await r.advanceFrames(2, 0.05); // 0.1 s — jumping up
    expect(dieOf(r).position.y).toBeGreaterThan(restY + 0.3);

    await r.advanceFrames(16, 0.05); // 0.9 s
    expect(usePresentation.getState().current?.id).toBe(id);
    expect(completeSpy).not.toHaveBeenCalled();
    expectFace(dieOf(r), 5); // snapped at 85 %

    await r.advanceFrames(3, 0.05); // 1.05 s
    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenCalledWith(id);
    expect(usePresentation.getState().busy).toBe(false);

    await r.advanceFrames(20, 0.05);
    expect(completeSpy).toHaveBeenCalledTimes(1);
    const die = dieOf(r);
    const [x, y, z] = FACE_UP_EULER[5];
    expect(Math.abs(die.rotation.x - x)).toBeLessThan(1e-6);
    expect(Math.abs(die.rotation.y - y)).toBeLessThan(1e-6);
    expect(Math.abs(die.rotation.z - z)).toBeLessThan(1e-6);
    expect(die.position.y).toBeCloseTo(restY, 6);
  });

  it('has 21 pips and sizes itself by the board', async () => {
    const r = await mount(<Dice boardLength={24} restFace={null} />);
    const pips = one(r, 'dice-pips') as InstancedMesh;
    expect(pips).toBeInstanceOf(InstancedMesh);
    expect(pips.count).toBe(21);
    expect(dieOf(r).scale.x).toBeCloseTo(diceSize(24), 9);
    expect(one(r, 'dice-body')).toBeInstanceOf(Mesh);
    const r16 = await mount(<Dice boardLength={16} restFace={null} />);
    expect(dieOf(r16).scale.x).toBeCloseTo(diceSize(16), 9);
  });

  it('rests on the last face between rolls and keeps its rotation without one', async () => {
    const r = await mount(<Dice boardLength={20} restFace={3} />);
    await r.advanceFrames(1, 0.05);
    expectFace(dieOf(r), 3);
    await r.update(<Dice boardLength={20} restFace={null} />);
    await r.advanceFrames(3, 0.05);
    expectFace(dieOf(r), 3);
  });

  it('ignores beats other than dice', async () => {
    const r = await mount(<Dice boardLength={20} restFace={2} />);
    await play([hopSpec([1, 2], 500)]);
    await r.advanceFrames(20, 0.05);
    expect(completeSpy).not.toHaveBeenCalled();
    expectFace(dieOf(r), 2);
  });
});

describe('SceneContents — the WebGL-free scene graph (D-28)', () => {
  const countDraws = (r: Renderer) => {
    let n = 0;
    r.scene.children.forEach((c) =>
      (c.instance as Object3D).traverse((o) => {
        if (o instanceof Mesh) n++;
      }),
    );
    return n;
  };

  it('renders the board, one character per participant, the die and one turn ring', async () => {
    const participants = [
      { id: 'p1', animal: 'bear' as const },
      { id: 'p2', animal: 'cat' as const },
      { id: 'p3', animal: 'dog' as const },
    ];
    usePresentation.getState().reset({ positions: { p1: 0, p2: 0, p3: 4 }, stars: { p1: 0, p2: 2, p3: 1 } }, null);
    const r = await mount(<SceneContents tiles={tiles20} participants={participants} currentId="p2" restFace={4} />);
    for (const p of participants) one(r, `pawn-${p.id}`);
    one(r, 'dice');
    one(r, 'quest-tiles');
    one(r, 'path-dots');
    expect(named(r, 'turn-ring')).toHaveLength(1);
    let ringOwner = '';
    one(r, 'turn-ring').traverseAncestors((o) => {
      if (/^pawn-p\d$/.test(o.name)) ringOwner = o.name;
    });
    expect(ringOwner).toBe('pawn-p2');
    expect(named(r, 'crown')).toHaveLength(1); // p2 leads with 2 stars
    // p1 and p2 share the start tile → two different slots.
    await r.advanceFrames(30, 0.05);
    const a = one(r, 'pawn-p1').position;
    const b = one(r, 'pawn-p2').position;
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.3);
  });

  const animals = ['bear', 'rabbit', 'cat', 'dog', 'panda', 'fox', 'pig', 'chick'] as const;
  const eight = animals.map((animal, i) => ({ id: `p${i + 1}`, animal }));
  const ids = eight.map((p) => p.id);
  const tiles24 = boardWith(24, {
    2: eventTile('forward', 3),
    5: eventTile('backward', 2),
    9: eventTile('extra', 0),
    3: questTile('hard'),
    4: questTile('normal'),
  });
  const allOn = (v: number) => Object.fromEntries(ids.map((id) => [id, v]));

  it('stays within 100 draw calls with 8 characters (all leaders) on a 24-tile board', async () => {
    usePresentation.getState().reset({ positions: allOn(0), stars: allOn(1) }, null);
    const r = await mount(<SceneContents tiles={tiles24} participants={eight} currentId="p3" restFace={6} />);
    expect(named(r, 'crown')).toHaveLength(8);
    expect(named(r, 'turn-ring')).toHaveLength(1);
    expect(countDraws(r)).toBeLessThanOrEqual(100);
  });

  it('stays within 100 draw calls during a win beat of all 8 (8 crowns, no ring)', async () => {
    usePresentation.getState().reset({ positions: allOn(0), stars: allOn(0) }, null);
    const r = await mount(<SceneContents tiles={tiles24} participants={eight} currentId="p3" restFace={6} />);
    expect(named(r, 'crown')).toHaveLength(0);
    await play([{ kind: 'win', winners: ids, animals: [...animals], ms: 1500 }]);
    expect(named(r, 'crown')).toHaveLength(8);
    expect(named(r, 'turn-ring')).toHaveLength(0);
    expect(countDraws(r)).toBeLessThanOrEqual(100);
  });

  it('win beat: every co-winner (0 stars) cheers with the winner face and a crown; no turn ring (D-14)', async () => {
    const participants = [
      { id: 'a', animal: 'bear' as const },
      { id: 'b', animal: 'cat' as const },
      { id: 'c', animal: 'dog' as const },
    ];
    usePresentation.getState().reset({ positions: { a: 0, b: 0, c: 2 }, stars: { a: 0, b: 0, c: 0 } }, null);
    const r = await mount(<SceneContents tiles={tiles20} participants={participants} currentId="a" restFace={null} />);
    expect(named(r, 'turn-ring')).toHaveLength(1);
    await play([{ kind: 'win', winners: ['a', 'b'], animals: ['bear', 'cat'], ms: 1500 }]);
    expect(named(r, 'turn-ring')).toHaveLength(0);
    expect(named(r, 'crown')).toHaveLength(2);
    partOf(r, 'a', 'crown');
    partOf(r, 'b', 'crown');
    let arm = -Infinity;
    for (let k = 0; k < 20; k++) {
      await r.advanceFrames(1, 0.04);
      arm = Math.max(arm, partOf(r, 'a', 'chibi-shoulder-r').rotation.z);
    }
    expect(arm).toBeGreaterThan(ARM_REST + 2.0);
    expect(faceOf(r, 'a', 'bear')).toBe('winner');
    expect(faceOf(r, 'b', 'cat')).toBe('winner');
    expect(faceOf(r, 'c', 'dog')).toBe('idle');
    expect(completeSpy).not.toHaveBeenCalled(); // the Banner owns the win beat
  });
});
