---
phase: 08-success-fx-awards
plan: 07
subsystem: success-fx-dom
status: complete
tags: [fx, dom, projection, portal, scoreboard, reduced-motion, tdd]
requires: [08-02, 08-03, 08-04, 08-05]
provides:
  - "layout/project.ts: V3, CamPose, Ndc, RectLike, projectNdc(p, cam) → { x, y, inFront }, ndcToClient(ndc, rect), ndcOnScreen(ndc) — pure, three-free"
  - "layout/headAnchor.ts: STAR_START_LIFT = 0.45, headAnchor(tiles, order, positions, currentId, pid, lift?) → V3"
  - "hud/StarFlight.tsx: default StarFlight({ tiles, order, currentId, canvasOk }), POP_MS = 160, FADE_MS = 80; DOM .fx-layer / .fx-star / .fx-star-y / .fx-star-svg / .fx-star-pill / .fx-star--still; vars --x0 --y0 --dx --dy --apex --fly-ms --pop-ms"
  - "hud/useStarHit.ts: HIT_MS = 240, useStarHit(): string | null"
  - "Scoreboard: <li data-pid>, optional hitId prop → is-hit"
  - "game.css: /* === Phase 8: star flight (08-07) === */ block (fx-star-pop / -x / -y / -spin / -out / -still, sb-hit, sb-hit-ring, own reduced-motion media)"
affects: [08-08, 08-10, 08-11]
tech-stack:
  added: []
  patterns:
    - "3D anchor → DOM coordinates without a bridge: recompute the fixed camera with fitCamera and project with a three-free lookAt + perspective formula (pinned to Vector3.project ≤ 1e-9)"
    - "Portal layer keyed by beat id: a beat that ends / is skipped removes the element in the same render"
    - "CSS individual transform properties (translate / scale / rotate) so several keyframe animations on one element never overwrite each other"
key-files:
  created:
    - src/game/layout/project.ts
    - src/game/layout/project.test.ts
    - src/game/layout/headAnchor.ts
    - src/game/scene/headAnchor.test.tsx
    - src/game/hud/StarFlight.tsx
    - src/game/hud/useStarHit.ts
    - src/game/hud/starFlight.test.tsx
  modified:
    - src/game/hud/Scoreboard.tsx
    - src/game/GameStage.tsx
    - src/game/styles/game.css
decisions:
  - "StarFlight keeps its props in a ref so the beat-id-keyed timers are not re-armed by the new order array GameStage builds every render; displayed.positions are read from the store at measurement time"
  - "Target lookup is restricted to .sb-cell[data-pid] and compares dataset.pid values (no selector built from an id); no cell → no star"
  - "CSS uses individual transform properties: outer .fx-star = pop (scale) + x travel (translate) + end fade (opacity); .fx-star-y = y arc (translate) + shrink 1 → 0.5 (scale); .fx-star-svg = one turn (rotate)"
  - "The arrival flash (is-hit) is keyed by beat id like the star, so it ends with the beat (⭐3: 176 ms of the 240 ms show, then the sb-body pop takes over at the beat end)"
  - "Style variables are rounded to 0.01 px and non-finite values fall back to 0 so no invalid CSS (e.g. 1e-7px) is produced"
metrics:
  duration: "~12 min"
  completed: 2026-10-24
---

# Phase 8 Plan 07: DOM star flight Summary

A big +N star now flies from the judged character's head to that participant's scoreboard avatar. The start point comes from a three-free projection in the main chunk (headAnchor → projectNdc → ndcToClient, checked against three to within 1e-9). The star is a portal layer on body, the avatar flashes on arrival, reduced motion gets a still star instead, and the star starts from the canvas center when there is no 3D.

## What was built

- **Task 1 — pure projection + head anchor (D-05).** `projectNdc` uses the same basis as three's lookAt (forward, right = forward × +Y, up = right × forward) and divides by depth with tan(fov/2) and the aspect. `project.test.ts` compares it with `Vector3.project` for 16 / 20 / 24 tiles × 5 aspects (board corners, every stand point + 1 up, the origin): all within 1e-9. A point behind the camera gives `inFront: false`. `headAnchor` follows Character's rest placement. `scene/headAnchor.test.tsx` mounts the real `SceneContents` (3 participants on tiles 0, 0, 7, current = b) and checks each `pawn-{pid}` world x / z, the derived y and the scale within 1e-6.
- **Task 2 — StarFlight + arrival flash (FX-02, D-03, D-05, D-07, D-08, D-23).** At `flyFromMs` the flight takes both measurements once: the start point (the projected anchor, or the canvas cell center when `!canvasOk`, the rect has no size, or the point is behind the camera or off the canvas) and the `.sb-avatar` center. It then renders one star with a `+N` pill through `createPortal(..., document.body)` inside an aria-hidden `.fx-layer`. The star pops over 160 ms, flies an upward arc (`--apex = min(0, dy) − max(64, 0.25·|dy|)`) until `flyToMs`, fades over 80 ms and is removed at `flyToMs + 80`. Under reduced motion, a 40 px still star appears on the avatar at 600 ms and stays until the beat ends. `useStarHit` returns the beat's pid during [flyToMs, flyToMs + 240] (never under reduced motion), and Scoreboard adds `is-hit` from it. GameStage mounts `<StarFlight>` right after `<Banner />` and passes `hitId={useStarHit()}` to Scoreboard.

## Verification

- `npx vitest run src/game/layout/project.test.ts src/game/scene/headAnchor.test.tsx src/game/sourceGuard.test.ts`: 31 passed
- `npx vitest run src/game/hud src/game/stage.test.tsx src/game/sourceGuard.test.ts`: all passed (starFlight.test.tsx 13 tests)
- **Full suite `npm test` (vitest run): 77 files, 1436 tests passed**
- `npx tsc -b`: exit 0. **`npm run build`: built.** The >500 kB GameCanvas lazy-chunk warning was already there before this plan.
- Acceptance greps: createPortal 2 / document.body 2 in StarFlight; `completeBeat` in non-comment lines 0; `innerHTML` 0; Scoreboard `data-pid` 1; GameStage `<StarFlight` 1 / `useStarHit()` 1; CSS marker 1; no three / @react-three value import in project.ts / headAnchor.ts (source guard (d) green).

## Commits

| Task | Gate | Commit | Message |
|------|------|--------|---------|
| 1 | RED | fe27d08 | test(08-07): add failing projectNdc and headAnchor tests against three and the mounted scene |
| 1 | GREEN | adcc283 | feat(08-07): three-free projectNdc and headAnchor for the DOM star start (D-05) |
| 2 | RED | 803bc86 | test(08-07): add failing DOM star flight, arrival flash and CSS block tests |
| 2 | GREEN | 4d7ecf7 | feat(08-07): DOM star flight portal with scoreboard arrival flash (FX-02, D-03, D-05, D-08, D-23) |

## TDD Gate Compliance

Both tasks have a `test(...)` RED commit (the suite could not load because the module was missing) followed by a `feat(...)` GREEN commit. No refactor commit was needed.

## Deviations from Plan

None. The plan was executed as written. Small choices within its scope:
- Scoreboard's header comment says "data attribute" rather than the literal `data-pid`, so the acceptance grep (`grep -c "data-pid"` = 1) counts only the JSX attribute.
- I added `fx-star-spin`, `fx-star-out` and `sb-hit-ring` keyframes beyond the five the plan named, to cover the UI-SPEC F3 rotation, the 80 ms arrival fade and the separate 160 ms sun ring.
- The 08-07 test file also has a five-beats-in-a-row check that `.fx-star` and `.fx-layer` stay empty (D-23).

## Known Stubs

None.

## Threat Flags

None. The portal layer only shows numbers from computed rects and beat data, as the plan's threat model (T-08-12..14) requires, and the tests cover it.

## Self-Check: PASSED

- FOUND: src/game/layout/project.ts, src/game/layout/headAnchor.ts, src/game/hud/StarFlight.tsx, src/game/hud/useStarHit.ts, src/game/layout/project.test.ts, src/game/scene/headAnchor.test.tsx, src/game/hud/starFlight.test.tsx
- FOUND commits: fe27d08, adcc283, 803bc86, 4d7ecf7
