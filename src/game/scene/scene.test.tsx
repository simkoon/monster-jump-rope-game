// @vitest-environment node
// src/game/scene/scene.test.tsx — R3F scene STRUCTURE assertions via @react-three/test-renderer
// (Pitfall 3: jsdom has no WebGL, so <Canvas> can't full-mount). We render the WebGL-free
// <SceneContents> graph and assert the leak-safe tile instancing + one token per participant.
// Live tween frames are NOT asserted here — motion feel is a MANUAL/human check.
import { describe, it, expect } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { SceneContents } from './BoardScene';
import type { MoveSpec } from './Token';
import { buildParticipants } from '../../engine/setup';

const noop = () => {};

function renderScene(boardLength: number, count: number, highlight: MoveSpec | null = null) {
  const participants = buildParticipants(
    'solo',
    count,
    Array.from({ length: count }, (_, i) => `P${i + 1}`),
    Array.from({ length: count }, () => 'boy' as const),
  );
  return ReactThreeTestRenderer.create(
    <SceneContents
      boardLength={boardLength}
      participants={participants}
      activeIndex={0}
      move={null}
      runToken={false}
      rollId={0}
      face={null}
      highlight={highlight}
      onDiceSettled={noop}
      onTokenArrive={noop}
    />,
  );
}

// The path tiles must stay ONE instanced mesh (D-08). The highlight layer may add its own
// instancedMesh, so the invariant is scoped by name rather than counted globally.
function pathTiles(renderer: Awaited<ReturnType<typeof renderScene>>) {
  return renderer.scene.findAll(
    (n) =>
      (n.instance as { isInstancedMesh?: boolean })?.isInstancedMesh === true &&
      n.instance?.name === 'path-tiles',
  );
}

describe('BoardScene graph structure (headless, no WebGL)', () => {
  it('renders the path as ONE instanced mesh of exactly boardLength squares (D-08)', async () => {
    const boardLength = 6;
    const renderer = await renderScene(boardLength, 2);
    const instanced = pathTiles(renderer);
    expect(instanced).toHaveLength(1);
    expect((instanced[0].instance as { count: number }).count).toBe(boardLength);
  });

  it('draws exactly one highlighted finish tile → total tiles = boardLength + 1 (D-03)', async () => {
    const boardLength = 6;
    const renderer = await renderScene(boardLength, 2);
    const finish = renderer.scene.findAll((n) => n.instance?.name === 'finish-tile');
    expect(finish).toHaveLength(1);
    const instanced = pathTiles(renderer);
    const totalTiles = (instanced[0].instance as { count: number }).count + finish.length;
    expect(totalTiles).toBe(boardLength + 1);
  });

  it('renders one Token per participant (D-04)', async () => {
    const renderer = await renderScene(6, 2);
    const tokens = renderer.scene.findAll((n) => n.instance?.name === 'token');
    expect(tokens).toHaveLength(2);

    const renderer4 = await renderScene(6, 4);
    const tokens4 = renderer4.scene.findAll((n) => n.instance?.name === 'token');
    expect(tokens4).toHaveLength(4);
  });

  it('includes the dice mesh in the scene', async () => {
    const renderer = await renderScene(6, 2);
    const dice = renderer.scene.findAll((n) => n.instance?.name === 'dice');
    expect(dice).toHaveLength(1);
  });
});

describe('move destination highlight (LOOP-05/06/07)', () => {
  const named = (r: Awaited<ReturnType<typeof renderScene>>, name: string) =>
    r.scene.findAll((n) => n.instance?.name === name);

  it('renders nothing while there is no pending move', async () => {
    const renderer = await renderScene(20, 2, null);
    expect(named(renderer, 'move-highlight')).toHaveLength(0);
    expect(pathTiles(renderer)).toHaveLength(1);
  });

  it('dots every square between the start and the dice destination (roll 4 from 0)', async () => {
    const renderer = await renderScene(20, 2, { id: 1, from: 0, afterRoll: 4, to: 4 });
    expect(named(renderer, 'move-highlight')).toHaveLength(1);
    const steps = named(renderer, 'step-markers');
    expect(steps).toHaveLength(1); // ONE instanced mesh for all dots
    expect((steps[0].instance as { count: number }).count).toBe(3);
    expect(named(renderer, 'dest-marker')).toHaveLength(1);
    expect(named(renderer, 'final-marker')).toHaveLength(0); // no event this turn
    expect(pathTiles(renderer)).toHaveLength(1);
  });

  it('adds the event final-destination pin when to !== afterRoll', async () => {
    const renderer = await renderScene(20, 2, { id: 2, from: 3, afterRoll: 6, to: 9 });
    expect(named(renderer, 'dest-marker')).toHaveLength(1);
    expect(named(renderer, 'final-marker')).toHaveLength(1);
    expect(pathTiles(renderer)).toHaveLength(1);
  });

  it('mounts without throwing on an overshoot win (afterRoll past the finish)', async () => {
    const renderer = await renderScene(20, 2, { id: 3, from: 18, afterRoll: 22, to: 22 });
    expect(named(renderer, 'dest-marker')).toHaveLength(1);
    expect((named(renderer, 'step-markers')[0].instance as { count: number }).count).toBe(1);
    expect(pathTiles(renderer)).toHaveLength(1);
  });
});
