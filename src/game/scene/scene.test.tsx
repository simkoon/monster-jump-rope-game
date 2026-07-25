// @vitest-environment node
// src/game/scene/scene.test.tsx — R3F scene STRUCTURE assertions via @react-three/test-renderer
// (Pitfall 3: jsdom has no WebGL, so <Canvas> can't full-mount). We render the WebGL-free
// <SceneContents> graph and assert the leak-safe tile instancing + one token per participant.
// Live tween frames are NOT asserted here — motion feel is a MANUAL/human check.
import { describe, it, expect } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { SceneContents } from './BoardScene';
import { buildParticipants } from '../../engine/setup';

const noop = () => {};

function renderScene(boardLength: number, count: number) {
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
      onDiceSettled={noop}
      onTokenArrive={noop}
    />,
  );
}

describe('BoardScene graph structure (headless, no WebGL)', () => {
  it('renders the path as ONE instanced mesh of exactly boardLength squares (D-08)', async () => {
    const boardLength = 6;
    const renderer = await renderScene(boardLength, 2);
    const instanced = renderer.scene.findAll(
      (n) => (n.instance as { isInstancedMesh?: boolean })?.isInstancedMesh === true,
    );
    expect(instanced).toHaveLength(1);
    expect((instanced[0].instance as { count: number }).count).toBe(boardLength);
  });

  it('draws exactly one highlighted finish tile → total tiles = boardLength + 1 (D-03)', async () => {
    const boardLength = 6;
    const renderer = await renderScene(boardLength, 2);
    const finish = renderer.scene.findAll((n) => n.instance?.name === 'finish-tile');
    expect(finish).toHaveLength(1);
    const instanced = renderer.scene.findAll(
      (n) => (n.instance as { isInstancedMesh?: boolean })?.isInstancedMesh === true,
    );
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
