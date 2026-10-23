// src/soak.tsx — dev-only soak entry: N games in a row of the real app, measured (Phase 8 STAB-01,
// D-22 ②, D-23, RESEARCH Pattern 9 ③, T-08-27).
// Served by the Vite dev server from the root soak.html only: `vite build` bundles index.html alone,
// vite.config.ts lists no extra input, and no app module imports this file (source guard (g)).
// Imports no three / @react-three itself (source guard (d)); the render metrics come from the
// DEV-only window.__pjRenderInfo that GameCanvas installs.
//
// Query: ?games=5&players=8&rounds=1&skip=0.3[&seed=7]
//   games   — games to play in a row (default 5)
//   players — solo participants, 1..8 (default 8)
//   rounds  — rounds per game (default 1)
//   skip    — 0..1 probability of a page tap 500 ms into a success beat (default 0.3)
//   seed    — optional: every game replays the SAME game (board, dice, verdicts, skip taps). The page
//             reseeds crypto.getRandomValues (the engine's only randomness, systemRng) and its own
//             verdict picks before each game, so first-use GPU uploads (e.g. a face expression shown
//             for the first time) happen in game 1 only and games 2..N must match game 1 exactly.
//             Without it every game is random (the default soak).
// The auto player presses the visible buttons like a teacher every TICK_MS (🎲 → ✅ / ❌ at random →
// 다음 ➡️ / 🔁 한 번 더 하기 / 🏆 결과 보기). Per game it records, at the ceremony (after the intro, a
// forced gc when exposed): renderer geometries / textures / programs, the idle draw calls of the
// board before the game's first 🎲, the JS heap (null when performance.memory is unavailable),
// live audio nodes, leftover .fx-star elements, body children, the longest frame interval and the
// game time — into the on-page table and window.__soakResult; window.__soakDone flips at the end.
import { StrictMode, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './game/styles/game.css';
import App from './App';
import { useGameStore } from './harness/useGameStore';
import { buildParticipants, MAX_PARTICIPANTS } from './engine/setup';
import { mulberry32 } from './engine/rng';
import { usePresentation } from './game/usePresentation';
import { activeNodeCount } from './game/sfx/sfx';
import { CEREMONY_INTRO_MS } from './game/layout/podiumLayout';

export interface SoakRow {
  game: number;
  geometries: number | null;
  textures: number | null;
  programs: number | null;
  idleCalls: number | null;
  heapMB: number | null;
  audioNodes: number;
  fxStars: number;
  bodyChildren: number;
  maxFrameMs: number;
  ms: number;
}

declare global {
  interface Window {
    __soakResult?: SoakRow[];
    __soakDone?: boolean;
    __soakError?: string;
    __soakStarted?: boolean;
    gc?: () => void;
  }
}

const TICK_MS = 250;
const SKIP_TAP_DELAY_MS = 500;
const CEREMONY_SETTLE_MS = CEREMONY_INTRO_MS + 700;
const GC_SETTLE_MS = 300;
const STALL_MS = 60_000; // no click for this long → stop with an error

function intParam(q: URLSearchParams, key: string, def: number, lo: number, hi: number): number {
  const n = Number(q.get(key));
  if (!q.has(key) || !Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

const query = new URLSearchParams(window.location.search);
const GAMES = intParam(query, 'games', 5, 1, 50);
const PLAYERS = intParam(query, 'players', 8, 1, MAX_PARTICIPANTS);
const ROUNDS = intParam(query, 'rounds', 1, 1, 20);
function probParam(q: URLSearchParams, key: string, def: number): number {
  const n = Number(q.get(key));
  if (!q.has(key) || !Number.isFinite(n)) return def;
  return Math.min(1, Math.max(0, n));
}
const SKIP = probParam(query, 'skip', 0.3);
const SEED = query.has('seed') ? intParam(query, 'seed', 1, 0, 2147483647) : null;

// ---- randomness: Math.random by default; with ?seed every game replays the same sequence ----
let pick: () => number = Math.random;
const nativeGetRandomValues = crypto.getRandomValues.bind(crypto);

function reseed(): void {
  if (SEED === null) return;
  const own = mulberry32(SEED);
  const engine = mulberry32(SEED ^ 0x5bd1e995);
  pick = () => own.next();
  const seeded = <T extends ArrayBufferView | null>(arr: T): T => {
    if (!(arr instanceof Uint32Array)) return nativeGetRandomValues(arr as never) as T;
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(engine.next() * 4294967296);
    return arr;
  };
  Object.defineProperty(crypto, 'getRandomValues', { value: seeded, configurable: true, writable: true });
}

// ---- results store (tiny external store for the table) ----
const rows: SoakRow[] = [];
let status = '준비 중';
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const setStatus = (s: string) => {
  status = s;
  emit();
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function heapMB(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  if (!mem || !Number.isFinite(mem.usedJSHeapSize)) return null;
  return Math.round((mem.usedJSHeapSize / 1048576) * 10) / 10;
}

function visibleButton(label: string): HTMLButtonElement | null {
  for (const b of document.querySelectorAll<HTMLButtonElement>('#root button')) {
    if (b.textContent?.trim() !== label) continue;
    if (b.disabled || b.closest('[hidden]') || b.getClientRects().length === 0) continue;
    return b;
  }
  return null;
}

const inCeremony = () => document.querySelector('.game-stage')?.classList.contains('stage--ceremony') ?? false;

// ---- frame interval watch ----
let maxFrameMs = 0;
let lastFrame = 0;
function frame(t: number) {
  if (lastFrame > 0) maxFrameMs = Math.max(maxFrameMs, t - lastFrame);
  lastFrame = t;
  requestAnimationFrame(frame);
}

// ---- auto player ----
async function waitUntil(cond: () => boolean, what: string, timeoutMs = STALL_MS): Promise<void> {
  const t0 = performance.now();
  while (!cond()) {
    if (performance.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${what}`);
    await sleep(TICK_MS);
  }
}

async function playOneGame(game: number): Promise<SoakRow> {
  const t0 = performance.now();
  maxFrameMs = 0;
  lastFrame = 0;
  let idleCalls: number | null = null;
  let firstRoll = true;
  let lastClick = performance.now();
  setStatus(`${game}/${GAMES}판 진행 중`);

  while (!inCeremony()) {
    if (performance.now() - lastClick > STALL_MS) throw new Error(`game ${game} stalled (no button for ${STALL_MS} ms)`);
    await sleep(TICK_MS);
    if (inCeremony()) break;

    const roll = visibleButton('🎲 주사위 굴리기');
    if (roll) {
      if (firstRoll) {
        idleCalls = window.__pjRenderInfo?.().calls ?? null;
        firstRoll = false;
      }
      roll.click();
      lastClick = performance.now();
      continue;
    }
    const ok = visibleButton('✅ 성공');
    const fail = visibleButton('❌ 실패');
    if (ok && fail) {
      const success = pick() < 0.6;
      (success ? ok : fail).click();
      lastClick = performance.now();
      if (success && pick() < SKIP) {
        setTimeout(() => {
          if (usePresentation.getState().current?.kind === 'stars') document.body.click();
        }, SKIP_TAP_DELAY_MS);
      }
      continue;
    }
    for (const label of ['다음 ➡️', '🔁 한 번 더 하기', '🏆 결과 보기']) {
      const b = visibleButton(label);
      if (b) {
        b.click();
        lastClick = performance.now();
        break;
      }
    }
  }

  // The ceremony: let the intro end, collect garbage, then read the counters.
  await sleep(CEREMONY_SETTLE_MS);
  const framePeak = Math.round(maxFrameMs * 10) / 10; // before the forced gc pause
  window.gc?.();
  await sleep(GC_SETTLE_MS);
  const info = window.__pjRenderInfo?.() ?? null;
  return {
    game,
    geometries: info?.geometries ?? null,
    textures: info?.textures ?? null,
    programs: info?.programs ?? null,
    idleCalls,
    heapMB: heapMB(),
    audioNodes: activeNodeCount(),
    fxStars: document.querySelectorAll('.fx-star').length,
    bodyChildren: document.body.childElementCount,
    maxFrameMs: framePeak,
    ms: Math.round(performance.now() - t0),
  };
}

async function run(): Promise<void> {
  requestAnimationFrame(frame);
  reseed();
  useGameStore.getState().startGame({
    mode: 'solo',
    participants: buildParticipants('solo', PLAYERS, [], []),
    rounds: ROUNDS,
  });
  const blocked = useGameStore.getState().startBlockedReason;
  if (blocked) throw new Error(`start blocked: ${blocked}`);
  // The canvas reports ready → the first controls appear.
  await waitUntil(() => visibleButton('🎲 주사위 굴리기') !== null, 'the first 🎲 (canvas ready)');

  for (let game = 1; game <= GAMES; game++) {
    if (game > 1) {
      const again = visibleButton('🔁 다시 하기');
      if (!again) {
        const seen = [...document.querySelectorAll('#root button')].map((b) => b.textContent?.trim()).join(' | ');
        throw new Error(`game ${game}: no 🔁 다시 하기 in the ceremony (buttons: ${seen})`);
      }
      reseed(); // the restart builds the new board synchronously inside this click
      again.click();
      await waitUntil(() => !inCeremony(), 'the play stage after 🔁 다시 하기');
    }
    rows.push(await playOneGame(game));
    window.__soakResult = [...rows];
    emit();
  }
  setStatus(`완료 — ${GAMES}판`);
}

// ---- on-page table ----
const COLS: (keyof SoakRow)[] = [
  'game',
  'geometries',
  'textures',
  'programs',
  'idleCalls',
  'heapMB',
  'audioNodes',
  'fxStars',
  'bodyChildren',
  'maxFrameMs',
  'ms',
];

const TABLE_STYLE = {
  position: 'fixed',
  left: 8,
  bottom: 8,
  zIndex: 1000,
  background: 'rgba(255,255,255,0.92)',
  color: '#222',
  font: '12px/1.4 ui-monospace, monospace',
  padding: 6,
  borderRadius: 8,
  pointerEvents: 'none',
  maxWidth: 'calc(100vw - 16px)',
  overflow: 'auto',
} as const;

function SoakTable() {
  useSyncExternalStore(subscribe, () => version);
  return (
    <div className="soak-table" style={TABLE_STYLE}>
      <div>
        soak · {GAMES}판 × {PLAYERS}명 × {ROUNDS}라운드 · skip {SKIP} · seed {SEED ?? '없음'} · {status}
      </div>
      <table>
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c} style={{ padding: '0 4px' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.game}>
              {COLS.map((c) => (
                <td key={c} style={{ padding: '0 4px', textAlign: 'right' }}>
                  {r[c] === null ? 'N/A' : String(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A hot update must never start a second root and a second auto player on the same page (two
// players would press each other's buttons): a re-executed entry reloads the page instead.
if (window.__soakStarted) window.location.reload();
else start();

function start(): void {
  window.__soakStarted = true;
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <SoakTable />
    </StrictMode>,
  );

  window.__soakDone = false;
  run()
    .catch((e: unknown) => {
      window.__soakError = e instanceof Error ? e.message : String(e);
      setStatus(`오류: ${window.__soakError}`);
    })
    .finally(() => {
      window.__soakResult = [...rows];
      window.__soakDone = true;
      emit();
    });
}
