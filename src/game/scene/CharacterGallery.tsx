// src/game/scene/CharacterGallery.tsx — the dev-only character gallery (D-23, UI-SPEC C8).
// Opened from the root gallery.html on the Vite dev server only (src/gallery.tsx); no app module
// imports it and `vite build` never bundles it (source guard (g), RESEARCH Pitfall 11). It lives in
// the scene folder so it may use fiber, and reuses the game's own parts: ChibiModel + applyPose for
// the grid and act views, the real SceneContents for the board view, the palette LIGHTS and the
// `flat` Canvas with no shadows and no post-processing (D-04).
// Views (query params):
//   ?view=grid (default) — 8 animals (columns, ANIMALS order) × 9 face keys (rows): one orthographic
//     Canvas pitched 55° down over the 120 px cells (1 world unit = 120 px), REST pose, no blinking
//   ?view=board [&tile=T&n=N] [&w=&h=] — SceneContents on a 24-tile board in a fixed 374×594 box
//     (phone portrait cell); by default the 8 animals stand on the start tile with the rabbit
//     current (white body = worst contrast) plus gallery-only duplicates: two on quest tile 7, one
//     on quest tile 12. The rabbit holds 2 stars so a crown shows. Bounce, breathing and blinks run
//   ?view=act&act=idle|hop|success|bonus|surprise|slump|cheer [&u=0..1] — one row of 8 replaying a
//     motion (beat length, then 600 ms of REST); &u freezes every actor at that progress
// &reduced=1 forces reduced motion (D-16) for every view: bodies hold REST, faces still change.
// All labels are DOM text outside the Canvas (no 3D text, source guard (c)). Each Canvas sets
// window.__ready after 3 rendered frames as the headless capture signal.
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber';
import { ANIMALS, type AnimalId } from '../../engine/animals';
import { boardWith, eventTile, questTile } from '../../engine/testkit';
import { ACT_FACE, blinkClosed, faceKeyFor } from '../director/reaction';
import { BEAT_MS, STARS_MS } from '../director/timeline';
import {
  BREATHE_PERIOD,
  IDLE_PERIOD,
  REST,
  actPose,
  bouncePose,
  breathePose,
  hopPose,
  type Act,
  type Pose,
} from '../layout/charMotion';
import type { FaceKey } from '../layout/chibiDims';
import { CAMERA_FOV } from '../layout/fitCamera';
import { ANIMAL_EMOJI, ANIMAL_NAME } from '../labels';
import { LIGHTS } from '../palette';
import { prefersReducedMotion } from '../reducedMotion';
import { usePresentation } from '../usePresentation';
import ChibiModel, { applyPose, createChibiRig } from './ChibiModel';
import { faceSet } from './chibiFaces';
import { SceneContents } from './SceneContents';

declare global {
  interface Window {
    __ready?: boolean;
  }
}

type View = 'grid' | 'board' | 'act';
type GalleryAct = 'idle' | Exclude<Act, 'rest'>;

const ROWS: readonly { key: FaceKey; label: string }[] = [
  { key: 'idle', label: '기본' },
  { key: 'excited', label: '두근' },
  { key: 'joy', label: '기쁨' },
  { key: 'sad', label: '아쉬움' },
  { key: 'surprised', label: '놀람' },
  { key: 'winner', label: '우승' },
  { key: 'idleBlink', label: '기본(깜빡)' },
  { key: 'excitedBlink', label: '두근(깜빡)' },
  { key: 'sadBlink', label: '아쉬움(깜빡)' },
];

const ACTS: readonly { key: GalleryAct; label: string }[] = [
  { key: 'idle', label: '대기' },
  { key: 'hop', label: '칸 이동' },
  { key: 'success', label: '성공' },
  { key: 'bonus', label: '보너스' },
  { key: 'surprise', label: '놀람' },
  { key: 'slump', label: '아쉬움' },
  { key: 'cheer', label: '우승' },
];

// Beat lengths the game plays these acts with (timeline BEAT_MS; success = the ⭐2 STARS_MS tier).
const ACT_MS: Readonly<Record<Exclude<GalleryAct, 'idle' | 'hop'>, number>> = {
  success: STARS_MS[2],
  bonus: BEAT_MS.startBonus,
  surprise: BEAT_MS.event,
  slump: BEAT_MS.miss,
  cheer: BEAT_MS.win,
};
const HOP_TILES = 3; // in-place hops of BEAT_MS.hopMax each
const REST_GAP_S = 0.6;

// ── Query params (read once: this module only ever runs on the gallery page) ──
const q = new URLSearchParams(window.location.search);
const intParam = (key: string, def: number, min: number, max: number): number => {
  const v = Number.parseInt(q.get(key) ?? '', 10);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
};
const viewParam = q.get('view');
const actParam = q.get('act');
const uParam = Number.parseFloat(q.get('u') ?? '');
const PARAMS = {
  view: (viewParam === 'board' || viewParam === 'act' ? viewParam : 'grid') as View,
  act: (ACTS.find((a) => a.key === actParam)?.key ?? 'idle') as GalleryAct,
  u: Number.isFinite(uParam) ? Math.min(1, Math.max(0, uParam)) : null,
  custom: q.has('tile') || q.has('n'),
  tile: intParam('tile', 0, 0, 23),
  n: intParam('n', 8, 1, 8),
  w: intParam('w', 374, 120, 2000),
  h: intParam('h', 594, 120, 2000),
  reduced: q.get('reduced') === '1',
};

// &reduced=1: answer the reduced-motion media query with "reduce" before any Character or Board
// reads it (they read it once on mount).
if (PARAMS.reduced && typeof window.matchMedia === 'function') {
  const real = window.matchMedia.bind(window);
  window.matchMedia = (query: string): MediaQueryList =>
    query.includes('prefers-reduced-motion')
      ? ({
          matches: true,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        } as MediaQueryList)
      : real(query);
}

// ── Board scene: 24 tiles with quests of each difficulty and one event of each effect ──
const BOARD_TILES = boardWith(24, {
  2: eventTile('forward', 3),
  3: questTile('hard'),
  4: questTile('normal'),
  5: eventTile('backward', 2),
  7: questTile('hard'),
  9: eventTile('extra', 0),
  12: questTile('normal'),
  15: questTile('hard'),
  18: questTile('normal'),
  21: questTile('hard'),
});

interface BoardScene {
  participants: { id: string; animal: AnimalId }[];
  positions: Record<string, number>;
  stars: Record<string, number>;
  currentId: string;
}

function boardScene(): BoardScene {
  const animals = PARAMS.custom ? ANIMALS.slice(0, PARAMS.n) : ANIMALS;
  const tile = PARAMS.custom ? PARAMS.tile : 0;
  const participants: { id: string; animal: AnimalId }[] = animals.map((a) => ({ id: a, animal: a }));
  const positions: Record<string, number> = Object.fromEntries(animals.map((a) => [a, tile]));
  if (!PARAMS.custom) {
    // Gallery-only duplicates: a pair and a single on quest tiles (star lift, regular-tile slots).
    const extra: [string, AnimalId, number][] = [
      ['x1', 'cat', 7],
      ['x2', 'fox', 7],
      ['x3', 'chick', 12],
    ];
    for (const [id, animal, at] of extra) {
      participants.push({ id, animal });
      positions[id] = at;
    }
  }
  const stars: Record<string, number> = Object.fromEntries(participants.map((p) => [p.id, p.id === 'rabbit' ? 2 : 0]));
  const currentId = positions.rabbit !== undefined ? 'rabbit' : participants[0].id;
  return { participants, positions, stars, currentId };
}

const SCENE = PARAMS.view === 'board' ? boardScene() : null;
// SceneContents and Character draw usePresentation's displayed state: seed it before they mount.
if (SCENE) usePresentation.getState().reset({ positions: SCENE.positions, stars: SCENE.stars }, null);

// ── Shared Canvas pieces ──
const PITCH = (55 * Math.PI) / 180; // grid / act camera: the middle of the game's 50–60° pitch
const CELL_PX = 120;
const ROW_Z = 1 / Math.sin(PITCH); // one screen cell between rows
const GL_OPTIONS = { antialias: true, alpha: true } as const;
const GAME_CAMERA = { fov: CAMERA_FOV, near: 0.1, far: 200, position: [0, 12, 12] as [number, number, number] };
const ORTHO_CAMERA = { zoom: CELL_PX, near: 0.1, far: 100, position: [0, 12, 12] as [number, number, number] };
const clear = ({ gl }: RootState) => gl.setClearColor(0x000000, 0);

function Lights() {
  return (
    <>
      <hemisphereLight args={[LIGHTS.hemi.sky, LIGHTS.hemi.ground, LIGHTS.hemi.intensity]} />
      <directionalLight color={LIGHTS.key.color} intensity={LIGHTS.key.intensity} position={[...LIGHTS.key.position]} />
      <directionalLight color={LIGHTS.rim.color} intensity={LIGHTS.rim.intensity} position={[...LIGHTS.rim.position]} />
    </>
  );
}

// Orthographic camera pitched 55° down at (0, targetY, 0): 1 world unit = 120 px on screen, and a
// row step of 1 / sin 55° in z is one cell down.
function PitchedCamera({ targetY }: { targetY: number }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    const d = 20;
    camera.position.set(0, targetY + d * Math.sin(PITCH), d * Math.cos(PITCH));
    camera.lookAt(0, targetY, 0);
    camera.zoom = CELL_PX;
    camera.updateProjectionMatrix();
  }, [camera, targetY]);
  return null;
}

// Headless capture signal: true after 3 rendered frames.
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) window.__ready = true;
  });
  return null;
}

const colX = (c: number) => c - 3.5;

// ── Grid view: still characters, one face per row ──
function StillActor({ animal, face, x, z }: { animal: AnimalId; face: FaceKey; x: number; z: number }) {
  const rig = useMemo(createChibiRig, []);
  return (
    <group position={[x, 0, z]}>
      <ChibiModel animal={animal} rig={rig} face={face} ring={false} crown={false} />
    </group>
  );
}

function GridView() {
  return (
    <div style={{ ...gridStyle(ROWS.length, CELL_PX) }}>
      <div />
      {ANIMALS.map((a) => (
        <div key={a} style={COL_HEAD}>
          {ANIMAL_EMOJI[a]} {ANIMAL_NAME[a]}
        </div>
      ))}
      {ROWS.map((r, i) => (
        <div key={r.key} style={{ ...ROW_HEAD, gridColumn: 1, gridRow: i + 2 }}>
          {r.label}
        </div>
      ))}
      <div style={{ ...CANVAS_CELL, gridRow: `2 / span ${ROWS.length}` }}>
        <Canvas flat orthographic dpr={[1, 2]} gl={GL_OPTIONS} camera={ORTHO_CAMERA} onCreated={clear}>
          <PitchedCamera targetY={0.5} />
          <Lights />
          {ROWS.map((r, row) =>
            ANIMALS.map((a, col) => (
              <StillActor key={`${a}:${r.key}`} animal={a} face={r.key} x={colX(col)} z={(row - (ROWS.length - 1) / 2) * ROW_Z} />
            )),
          )}
          <ReadySignal />
        </Canvas>
      </div>
    </div>
  );
}

// ── Act view: one row of 8 replaying a motion ──
// Pose and face of a gallery act at clock tSec, or frozen at progress u. Idle: even columns bounce
// as the current turn with the excited face, odd columns breathe with the idle face, both blinking.
// Other acts play their beat length, then REST_GAP_S of REST with the idle face, and repeat.
function actFrame(act: GalleryAct, seed: number, tSec: number, u: number | null): { pose: Pose; face: FaceKey } {
  if (act === 'idle') {
    const current = seed % 2 === 0;
    const clock = u !== null ? u * (current ? IDLE_PERIOD : BREATHE_PERIOD) : tSec;
    const blink = u === null && blinkClosed(tSec, seed);
    return current
      ? { pose: bouncePose(clock), face: faceKeyFor('excited', blink) }
      : { pose: breathePose(clock, seed), face: faceKeyFor('idle', blink) };
  }
  const len = act === 'hop' ? (HOP_TILES * BEAT_MS.hopMax) / 1000 : ACT_MS[act] / 1000;
  let k = u;
  if (k === null) {
    const c = tSec % (len + REST_GAP_S);
    if (c >= len) return { pose: REST, face: faceKeyFor('idle', blinkClosed(tSec, seed)) };
    k = c / len;
  }
  if (act === 'hop') {
    const s = k * HOP_TILES;
    const tile = Math.min(HOP_TILES - 1, Math.floor(s));
    return { pose: hopPose(s - tile), face: ACT_FACE.hop };
  }
  return { pose: actPose(act, k), face: ACT_FACE[act] };
}

function GalleryActor({ animal, seed, x, reduced }: { animal: AnimalId; seed: number; x: number; reduced: boolean }) {
  const rig = useMemo(createChibiRig, []);
  const faces = useMemo(() => faceSet(animal), [animal]);
  const clock = useRef(0);
  const faceKey = useRef<FaceKey>('idle');
  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.25);
    const { pose, face } = actFrame(PARAMS.act, seed, clock.current, PARAMS.u);
    applyPose(rig, reduced ? REST : pose);
    if (face !== faceKey.current && rig.face.current) {
      faceKey.current = face;
      rig.face.current.geometry = faces[face];
    }
  });
  return (
    <group position={[x, 0, 0]}>
      <ChibiModel animal={animal} rig={rig} face="idle" ring={false} crown={false} />
    </group>
  );
}

// The act row is two cells tall so the success jump and the cheer have head room.
const ACT_ROW_PX = 2 * CELL_PX;

function ActView() {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const label = ACTS.find((a) => a.key === PARAMS.act)?.label ?? '';
  return (
    <div style={{ ...gridStyle(1, ACT_ROW_PX) }}>
      <div />
      {ANIMALS.map((a) => (
        <div key={a} style={COL_HEAD}>
          {ANIMAL_EMOJI[a]} {ANIMAL_NAME[a]}
        </div>
      ))}
      <div style={{ ...ROW_HEAD, gridColumn: 1, gridRow: 2 }}>
        {label}
        {PARAMS.u !== null ? ` u=${PARAMS.u}` : ''}
      </div>
      <div style={{ ...CANVAS_CELL, gridRow: 2 }}>
        <Canvas flat orthographic dpr={[1, 2]} gl={GL_OPTIONS} camera={ORTHO_CAMERA} onCreated={clear}>
          <PitchedCamera targetY={1.05} />
          <Lights />
          {ANIMALS.map((a, col) => (
            <GalleryActor key={a} animal={a} seed={col} x={colX(col)} reduced={reduced} />
          ))}
          <ReadySignal />
        </Canvas>
      </div>
    </div>
  );
}

// ── Board view: the real scene at phone size (#board-box = the canvas cell, for element captures) ──
function BoardView({ scene }: { scene: BoardScene }) {
  return (
    <div id="board-box" style={{ width: PARAMS.w, height: PARAMS.h, outline: '1px dashed var(--line)' }}>
      <Canvas flat dpr={[1, 2]} gl={GL_OPTIONS} camera={GAME_CAMERA} onCreated={clear}>
        <SceneContents tiles={BOARD_TILES} participants={scene.participants} currentId={scene.currentId} restFace={null} />
        <ReadySignal />
      </Canvas>
    </div>
  );
}

// ── Page ──
const BAR: CSSProperties = {
  minHeight: 56,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  padding: '0 8px',
};
const TITLE: CSSProperties = { fontSize: 26, fontWeight: 900, lineHeight: 1.2, marginRight: 8 };
const LINK: CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  lineHeight: 1.35,
  color: 'var(--ink)',
  textDecoration: 'underline',
  minHeight: 40,
  display: 'inline-flex',
  alignItems: 'center',
};
const CAPTION: CSSProperties = { fontSize: 15, fontWeight: 800, lineHeight: 1.4 };
const COL_HEAD: CSSProperties = { ...CAPTION, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const ROW_HEAD: CSSProperties = { ...CAPTION, display: 'flex', alignItems: 'center', paddingLeft: 4 };
const CANVAS_CELL: CSSProperties = {
  gridColumn: '2 / span 8',
  position: 'relative',
  backgroundImage:
    'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
  backgroundSize: `${CELL_PX}px ${CELL_PX}px`,
};
const gridStyle = (rows: number, rowPx: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `96px repeat(8, ${CELL_PX}px)`,
  gridTemplateRows: `32px repeat(${rows}, ${rowPx}px)`,
});

export default function CharacterGallery() {
  return (
    <div style={{ background: 'var(--bg)', fontFamily: 'var(--font)', color: 'var(--ink)', minHeight: '100vh', padding: 8 }}>
      <nav style={BAR}>
        <span style={TITLE}>캐릭터 갤러리 (dev)</span>
        <a style={LINK} href="?view=grid">
          격자 보기
        </a>
        <a style={LINK} href="?view=board">
          보드 보기
        </a>
        <a style={LINK} href="?view=act">
          동작 보기
        </a>
        {PARAMS.view === 'act' &&
          ACTS.map((a) => (
            <a key={a.key} style={LINK} href={`?view=act&act=${a.key}`}>
              {a.label}
            </a>
          ))}
      </nav>
      {PARAMS.view === 'grid' && <GridView />}
      {PARAMS.view === 'act' && <ActView />}
      {SCENE && <BoardView scene={SCENE} />}
    </div>
  );
}
