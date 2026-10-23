// @vitest-environment node
// src/game/scene/actors.test.tsx — the moving 3D actors as beat consumers (D-16..D-20, D-25, HUD-03).
// Runs in node with @react-three/test-renderer (no WebGL). Every store change is wrapped in
// ReactThreeTestRenderer.act (RESEARCH Pitfall 1); advanceFrames drives useFrame with a fixed delta.
import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Group, InstancedMesh, Mesh, type Object3D } from 'three';
import Pawn from './Pawn';
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

describe('Pawn — hop beat consumer (D-19, D-25)', () => {
  it('hops tile by tile and completes the beat exactly once after its ms', async () => {
    engineAt(3);
    const r = await mount(
      <Pawn pid="a" animal="bear" points={points} slot={CENTER} isCurrent={false} isLeader={false} />,
    );
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

  it('lifts the pawn into a parabolic arc mid-segment', async () => {
    engineAt(1);
    const r = await mount(
      <Pawn pid="a" animal="bear" points={points} slot={CENTER} isCurrent={false} isLeader={false} />,
    );
    await play([hopSpec([1], 400)]);
    await r.advanceFrames(4, 0.05); // half way through the only segment
    const body = one(r, 'pawn-body');
    expect(body.position.y).toBeGreaterThan(0.4);
    const g = one(r, 'pawn-a');
    expect(g.position.x).toBeGreaterThan(Math.min(points[0].x, points[1].x));
    expect(g.position.x).toBeLessThan(Math.max(points[0].x, points[1].x));
  });

  it('when skipAll ends the hop first it never completes it and settles at the new rest point', async () => {
    engineAt(3);
    const slot = { dx: 0.2, dz: -0.2, scale: 1 };
    const r = await mount(<Pawn pid="a" animal="bear" points={points} slot={slot} isCurrent={false} isLeader={false} />);
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
    const r = await mount(
      <Pawn pid="a" animal="bear" points={points} slot={CENTER} isCurrent={false} isLeader={false} />,
    );
    await play([{ kind: 'hop', pid: 'b', path: [1, 2], by: 'dice', ms: 500 }]);
    await r.advanceFrames(20, 0.05);
    expect(completeSpy).not.toHaveBeenCalled();
    expect(one(r, 'pawn-a').position.x).toBeCloseTo(points[0].x, 6);
  });

  it('only the current pawn wears the turn ring and only leaders wear a crown', async () => {
    const r = await mount(
      <>
        <Pawn pid="a" animal="bear" points={points} slot={CENTER} isCurrent isLeader={false} />
        <Pawn pid="b" animal="cat" points={points} slot={CENTER} isCurrent={false} isLeader />
        <Pawn pid="c" animal="dog" points={points} slot={CENTER} isCurrent={false} isLeader />
      </>,
    );
    expect(named(r, 'turn-ring')).toHaveLength(1);
    expect(named(r, 'crown')).toHaveLength(2);
    const ringOwner = one(r, 'pawn-a');
    let found = false;
    ringOwner.traverse((o) => {
      if (o.name === 'turn-ring') found = true;
    });
    expect(found).toBe(true);
  });

  it('the current pawn bounces and its ring breathes while idle', async () => {
    const r = await mount(<Pawn pid="a" animal="bear" points={points} slot={CENTER} isCurrent isLeader={false} />);
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

  it('a pawn that is not current stays still while idle', async () => {
    const r = await mount(
      <Pawn pid="a" animal="bear" points={points} slot={CENTER} isCurrent={false} isLeader={false} />,
    );
    await r.advanceFrames(16, 0.05);
    expect(one(r, 'pawn-body').position.y).toBe(0);
  });

  it('builds a pawn from shared parts (≤ 7 meshes without ring and crown)', async () => {
    const r = await mount(
      <Pawn pid="a" animal="bear" points={points} slot={CENTER} isCurrent={false} isLeader={false} />,
    );
    const g = one(r, 'pawn-a');
    expect(g).toBeInstanceOf(Group);
    let meshes = 0;
    g.traverse((o) => {
      if (o instanceof Mesh) meshes++;
    });
    expect(meshes).toBeLessThanOrEqual(7);
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

  it('renders the board, one pawn per participant, the die and one turn ring', async () => {
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
    // p1 and p2 share the start tile → two different grid slots.
    await r.advanceFrames(30, 0.05);
    const a = one(r, 'pawn-p1').position;
    const b = one(r, 'pawn-p2').position;
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.3);
  });

  it('stays within 100 draw calls with 8 pawns on a 24-tile board', async () => {
    const animals = ['bear', 'rabbit', 'cat', 'dog', 'panda', 'fox', 'pig', 'chick'] as const;
    const participants = animals.map((animal, i) => ({ id: `p${i + 1}`, animal }));
    const ids = participants.map((p) => p.id);
    usePresentation
      .getState()
      .reset(
        { positions: Object.fromEntries(ids.map((id) => [id, 0])), stars: Object.fromEntries(ids.map((id) => [id, 1])) },
        null,
      );
    const tiles24 = boardWith(24, {
      2: eventTile('forward', 3),
      5: eventTile('backward', 2),
      9: eventTile('extra', 0),
      3: questTile('hard'),
      4: questTile('normal'),
    });
    const r = await mount(<SceneContents tiles={tiles24} participants={participants} currentId="p3" restFace={6} />);
    expect(named(r, 'crown')).toHaveLength(8);
    expect(named(r, 'turn-ring')).toHaveLength(1);
    expect(countDraws(r)).toBeLessThanOrEqual(100);
  });
});
