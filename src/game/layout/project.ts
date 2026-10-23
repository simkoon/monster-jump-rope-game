// src/game/layout/project.ts — three-free perspective projection for the DOM star flight (D-05, FX-02).
// PHASE 6 CONTRACT: pure math — no React/DOM, no runtime import of three / @react-three/*
// (main-chunk safety). StarFlight (a main-chunk DOM layer) recomputes the fixed camera pose with
// fitCamera exactly like CameraRig does and projects a world point with these functions instead of
// asking the lazy 3D chunk for it — no bridge between the canvas and the DOM.
// projectNdc mirrors three: Object3D.lookAt with up = +Y builds the camera basis
// (forward = normalize(target − position), right = normalize(forward × up), up' = right × forward)
// and PerspectiveCamera divides by depth with tan(fov / 2) and the aspect. project.test.ts pins it
// against Vector3.project within 1e-9 for 16 / 20 / 24 tiles and several canvas aspects.

export type V3 = readonly [number, number, number];

export interface CamPose {
  position: V3;
  target: V3;
  fovDeg: number; // vertical field of view
  aspect: number; // canvas width / height
}

export interface Ndc {
  x: number;
  y: number;
}

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const UP: V3 = [0, 1, 0];

// World point → normalized device coordinates (x right, y up, −1..1 inside the canvas).
// inFront is false when the point is at or behind the camera plane (the NDC are then meaningless).
export function projectNdc(p: V3, cam: CamPose): Ndc & { inFront: boolean } {
  const f = norm(sub(cam.target, cam.position));
  const r = norm(cross(f, UP));
  const u = cross(r, f);
  const d = sub(p, cam.position);
  const zc = dot(d, f);
  const t = Math.tan((cam.fovDeg * Math.PI) / 360);
  return { x: dot(d, r) / (zc * t * cam.aspect), y: dot(d, u) / (zc * t), inFront: zc > 0 };
}

// NDC → client (CSS px, viewport) coordinates over a DOMRect-like box.
export function ndcToClient(n: Ndc, rect: RectLike): { x: number; y: number } {
  return { x: rect.left + ((n.x + 1) / 2) * rect.width, y: rect.top + ((1 - n.y) / 2) * rect.height };
}

// Inside the canvas (edges included). NaN is never on screen.
export function ndcOnScreen(n: Ndc): boolean {
  return Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1;
}
