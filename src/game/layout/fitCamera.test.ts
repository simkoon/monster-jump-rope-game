// Closed-form camera fit (D-09, D-10, BOARD-01). three is imported here only — tests are not bundled.
import { PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_FOV, fitCamera } from './fitCamera';
import { boardExtents, ringLayout } from './ringLayout';

const SIZES = [16, 20, 24] as const;
const ASPECTS = [0.45, 0.6, 0.74, 1, 1.33, 1.6, 1.95, 2.4] as const;

function project(aspect: number, n: number) {
  const e = boardExtents(ringLayout(n));
  const fit = fitCamera(aspect, e);
  const cam = new PerspectiveCamera(fit.fov, aspect, 0.1, 200);
  cam.position.set(...fit.position);
  cam.lookAt(...fit.target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const pts: Vector3[] = [];
  for (const x of [-e.hx, e.hx]) for (const y of [0, e.h]) for (const z of [-e.hz, e.hz]) {
    pts.push(new Vector3(x, y, z).project(cam));
  }
  return { fit, pts };
}

describe('fitCamera', () => {
  for (const n of SIZES) {
    for (const aspect of ASPECTS) {
      it(`n=${n}, aspect ${aspect}: all 8 board-box corners inside, tight axis ≥ 90%`, () => {
        const { pts } = project(aspect, n);
        let max = 0;
        for (const p of pts) {
          expect(Math.abs(p.x)).toBeLessThanOrEqual(1 + 1e-6);
          expect(Math.abs(p.y)).toBeLessThanOrEqual(1 + 1e-6);
          max = Math.max(max, Math.abs(p.x), Math.abs(p.y));
        }
        expect(max).toBeGreaterThanOrEqual(0.9);
      });
    }
  }

  it('pitch stays in 50–60°, steeper on portrait', () => {
    const e = boardExtents(ringLayout(20));
    for (const a of ASPECTS) {
      const f = fitCamera(a, e);
      expect(f.pitchDeg).toBeGreaterThanOrEqual(50);
      expect(f.pitchDeg).toBeLessThanOrEqual(60);
    }
    expect(fitCamera(0.6, e).pitchDeg).toBeGreaterThan(fitCamera(1.95, e).pitchDeg);
  });

  it('fixed quarter view from the +Z side with fov 35, aimed at the board center', () => {
    const f = fitCamera(1.33, boardExtents(ringLayout(20)));
    expect(CAMERA_FOV).toBe(35);
    expect(f.fov).toBe(35);
    expect(f.position[0]).toBe(0);
    expect(f.position[1]).toBeGreaterThan(0);
    expect(f.position[2]).toBeGreaterThan(0);
    expect(f.target).toEqual([0, 0, 0]);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('treats aspect %s as 1 (no NaN)', (a) => {
    const e = boardExtents(ringLayout(16));
    const f = fitCamera(a, e);
    expect(f).toEqual(fitCamera(1, e));
    for (const v of f.position) expect(Number.isFinite(v)).toBe(true);
  });
});
