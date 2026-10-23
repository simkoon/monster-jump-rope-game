// @vitest-environment node
// src/game/layout/project.test.ts — the three-free projection matches three exactly (D-05, FX-02).
// three is imported here only (the source guard skips *.test files): every case builds a
// PerspectiveCamera from the very same fitCamera pose CameraRig uses and compares
// Vector3.project with projectNdc.
import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { boardWith } from '../../engine/testkit';
import { fitCamera } from './fitCamera';
import { standPoints } from './pawnSlots';
import { boardExtents, ringLayout } from './ringLayout';
import { ndcOnScreen, ndcToClient, projectNdc, type V3 } from './project';

const SIZES = [16, 20, 24] as const;
const ASPECTS = [374 / 594, 1, 588 / 290, 844 / 390, 1024 / 768] as const;

function camFor(aspect: number, L: number) {
  const fit = fitCamera(aspect, boardExtents(ringLayout(L)));
  const cam = new PerspectiveCamera(fit.fov, aspect, 0.1, 200);
  cam.position.set(...fit.position);
  cam.lookAt(...fit.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return { fit, cam };
}

describe('projectNdc (D-05): the same numbers as three Vector3.project', () => {
  it.each(SIZES.flatMap((L) => ASPECTS.map((a) => [L, a] as const)))('%i tiles, aspect %f', (L, aspect) => {
    const { fit, cam } = camFor(aspect, L);
    const { hx, hz, h } = boardExtents(ringLayout(L));
    const samples: V3[] = [];
    for (const x of [-hx, hx]) for (const z of [-hz, hz]) for (const y of [0, h]) samples.push([x, y, z]);
    for (const p of standPoints(boardWith(L))) samples.push([p.x, p.y + 1, p.z]);
    samples.push([0, 0, 0]);
    const pose = { position: fit.position, target: fit.target, fovDeg: fit.fov, aspect };
    for (const p of samples) {
      const want = new Vector3(...p).project(cam);
      const got = projectNdc(p, pose);
      expect(got.inFront).toBe(true);
      expect(Math.abs(got.x - want.x)).toBeLessThan(1e-9);
      expect(Math.abs(got.y - want.y)).toBeLessThan(1e-9);
    }
  });

  it('reports a point behind the camera as not in front', () => {
    const { fit } = camFor(1, 20);
    const [px, py, pz] = fit.position;
    // Twice as far from the target as the camera, on the same line: behind it.
    const behind: V3 = [px * 2, py * 2, pz * 2];
    const got = projectNdc(behind, { position: fit.position, target: fit.target, fovDeg: fit.fov, aspect: 1 });
    expect(got.inFront).toBe(false);
  });
});

describe('ndcToClient / ndcOnScreen', () => {
  const rect = { left: 10, top: 20, width: 300, height: 200 };
  it('maps the NDC corners and center onto the rect', () => {
    expect(ndcToClient({ x: -1, y: 1 }, rect)).toEqual({ x: 10, y: 20 });
    expect(ndcToClient({ x: 1, y: -1 }, rect)).toEqual({ x: 310, y: 220 });
    expect(ndcToClient({ x: 0, y: 0 }, rect)).toEqual({ x: 160, y: 120 });
  });
  it('tells inside from outside', () => {
    expect(ndcOnScreen({ x: 0.2, y: -0.9 })).toBe(true);
    expect(ndcOnScreen({ x: 1, y: -1 })).toBe(true);
    expect(ndcOnScreen({ x: 1.01, y: 0 })).toBe(false);
    expect(ndcOnScreen({ x: 0, y: -1.2 })).toBe(false);
    expect(ndcOnScreen({ x: Number.NaN, y: 0 })).toBe(false);
  });
});
