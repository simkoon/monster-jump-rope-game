// @vitest-environment node
// src/game/scene/facePrewarm.test.tsx — face geometries are built in render, never in the frame
// loop (D-08a, 07-REVIEW WR-01). A pass-through mock of chibiParts records every `:face:` bake; this
// file has its own module registry, so the face cache starts empty. A failing face build must be a
// render error an error boundary catches (the game's CanvasErrorBoundary), not a throw in useFrame.
import { Component, type ReactNode } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { SceneContents } from './SceneContents';
import ChibiModel, { createChibiRig } from './ChibiModel';
import { usePresentation } from '../usePresentation';
import { EMPTY_DISPLAYED } from '../director/displayed';
import type { BeatSpec } from '../director/timeline';
import { boardWith } from '../../engine/testkit';
import { FACE_KEYS } from '../layout/chibiDims';

const faces = vi.hoisted(() => ({ fail: '', builds: [] as string[] }));
vi.mock('./chibiParts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('./chibiParts')>();
  return {
    ...orig,
    bake: (name: string, parts: BufferGeometry[]) => {
      if (name.includes(':face:')) {
        faces.builds.push(name);
        if (faces.fail && name.startsWith(`${faces.fail}:face:`)) throw new Error('test face build failed ' + name);
      }
      return orig.bake(name, parts);
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const one = (r: Renderer, name: string): Object3D => {
  const found = r.scene.findAll((n) => (n.instance as Object3D | undefined)?.name === name).map((n) => n.instance as Object3D);
  expect(found, name).toHaveLength(1);
  return found[0];
};

// A named node inside the ground group `pawn-{pid}`.
const partOf = (r: Renderer, pid: string, name: string): Object3D => {
  let found: Object3D | null = null;
  one(r, `pawn-${pid}`).traverse((o) => {
    if (o.name === name) found = o;
  });
  expect(found, `${pid} ${name}`).not.toBeNull();
  return found!;
};

let open: Renderer[] = [];
afterEach(async () => {
  for (const r of open) await r.unmount();
  open = [];
  usePresentation.getState().reset(EMPTY_DISPLAYED, null);
  faces.fail = '';
});

const tiles20 = boardWith(20);
const participants = [
  { id: 'b', animal: 'bear' as const },
  { id: 'r', animal: 'rabbit' as const },
  { id: 'c', animal: 'chick' as const },
];

describe('face prewarm (D-08a, WR-01)', () => {
  it('builds no face before mounting', () => {
    expect(faces.builds).toEqual([]);
  });

  it('builds all 9 faces of every participating animal during render, then none in the frame loop', async () => {
    usePresentation.getState().reset({ positions: { b: 2, r: 4, c: 6 }, stars: { b: 0, r: 0, c: 0 } }, null);
    const r = await ReactThreeTestRenderer.create(
      <SceneContents tiles={tiles20} participants={participants} currentId="b" restFace={null} />,
    );
    open.push(r);
    const expected = participants.flatMap((p) => FACE_KEYS.map((k) => `${p.animal}:face:${k}`));
    expect(faces.builds).toHaveLength(27);
    expect([...faces.builds].sort()).toEqual([...expected].sort());

    faces.builds.length = 0;
    const face = partOf(r, 'b', 'chibi-face') as Mesh;
    const seen = new Set<BufferGeometry>();
    const step = async (n: number) => {
      for (let i = 0; i < n; i++) {
        await ReactThreeTestRenderer.act(async () => {
          await r.advanceFrames(1, 0.05);
        });
        seen.add(face.geometry);
      }
    };
    const beat = async (spec: BeatSpec, n: number) => {
      await ReactThreeTestRenderer.act(async () => {
        usePresentation.getState().play([spec]);
      });
      await step(n);
      const id = usePresentation.getState().current!.id;
      await ReactThreeTestRenderer.act(async () => {
        usePresentation.getState().completeBeat(id);
      });
      await step(2);
    };

    await step(120); // 6 s of blinks
    await beat({ kind: 'stars', pid: 'b', stars: 1, ms: 900 }, 20);
    await beat({ kind: 'miss', pid: 'r', ms: 700 }, 15);
    await beat(
      { kind: 'event', pid: 'c', eff: 'forward', steps: 2, suppressed: false, name: 'go', label: '', ms: 1000 },
      20,
    );
    await beat({ kind: 'win', winners: ['b', 'r', 'c'], animals: ['bear', 'rabbit', 'chick'], ms: 1500 }, 30);

    expect(faces.builds).toEqual([]);
    // excited, a blink key, joy and winner at least: the swaps did happen.
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('raises a failing face build in render, where an error boundary catches it', async () => {
    class Boundary extends Component<{ onCatch: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      componentDidCatch(e: unknown) {
        this.props.onCatch(e);
      }
      render() {
        return this.state.failed ? null : this.props.children;
      }
    }
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      faces.fail = 'pig';
      const caught: unknown[] = [];
      const r = await ReactThreeTestRenderer.create(
        <Boundary onCatch={(e) => caught.push(e)}>
          <ChibiModel animal="pig" rig={createChibiRig()} face="idle" ring={false} crown={false} />
        </Boundary>,
      );
      open.push(r);
      expect(caught).toHaveLength(1);
      expect(caught[0]).toBeInstanceOf(Error);
      expect((caught[0] as Error).message).toContain('pig:face:');
    } finally {
      errors.mockRestore();
    }
  });
});
