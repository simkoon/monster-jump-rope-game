---
phase: 08-success-fx-awards
plan: 09
subsystem: game-scene-ceremony
status: complete
tags: [3d, ceremony, podium, no-remount, fx, camera, reduced-motion, draw-budget, tdd]
requires: [08-04, 08-05]
provides:
  - "layout/podiumLayout.ts: CEREMONY_INTRO_MS 1800, INTRO_JUMP_AT_MS 200, INTRO_CHEER_AT_MS 400, PODIUM_HEIGHT 0.6, GROUND_HEIGHT 0.12, CeremonyStand, PodiumLayout, podiumLayout(winners, others)"
  - "layout/charMotion.ts: CELEBRATE_PERIOD 1.5, celebratePose('winner' | 'joy', tSec), INTRO_JUMP_SEC 0.6, introJumpPose(tSec)"
  - "scene/Podium.tsx: default Podium({ layout, visible }), group podium, meshes podium-ground / podium-tier, module-scope PODIUM_GEO / PODIUM_MAT"
  - "scene/SceneContents.tsx: CeremonyProps { winners, introId, introActive }, SceneProps.ceremony, group board-set"
  - "scene/Character.tsx: optional stand / introId / introActive props"
  - "scene/CameraRig.tsx: optional extents prop (podium framing)"
  - "scene/FxPools.tsx: optional ceremony prop { introId, introActive, origin, ringRadius } (CeremonyFx)"
  - "scene/GameCanvas.tsx: ContactShadows inside <group visible={!scene.ceremony}>"
affects: [08-10, 08-11]
tech-stack:
  added: []
  patterns:
    - "Ceremony = a prop of the same scene: visibility toggles only, pid-keyed Characters, always-mounted Podium + pools"
    - "Gap blend: on a source switch the gap between the last shown pose and the new curve decays at SETTLE_RATE (a seamless intro → loop handover needs no blend)"
    - "Latest props mirrored into a ref for the frame loop (stand / intro / ceremony FX)"
key-files:
  created:
    - src/game/layout/podiumLayout.ts
    - src/game/layout/podiumLayout.test.ts
    - src/game/scene/Podium.tsx
    - src/game/scene/ceremonyScene.test.tsx
  modified:
    - src/game/layout/charMotion.ts
    - src/game/layout/charMotion.test.ts
    - src/game/scene/SceneContents.tsx
    - src/game/scene/Character.tsx
    - src/game/scene/CameraRig.tsx
    - src/game/scene/GameCanvas.tsx
    - src/game/scene/FxPools.tsx
decisions:
  - "A lone non-winner uses the 2–4 band (1.0), not 1.15: the 1.15 size is reserved for a single winner, so no non-winner ever stands bigger than the winners"
  - "Row spacing 0.75 × scale (UI-SPEC minimum 0.7); floor rows 0.6 in front of the tier, second floor row 0.5 further forward and shifted half a step (zig-zag); winner rows ±0.4 on the 1.9-deep tier"
  - "The group is centered on the tier edges + stand points; extents.hz adds the body radius; extents.h = highest head top + 0.3 crown clearance"
  - "Ceremony loop clock is offset by the intro (winners 0.8 s = 200 ms + 0.6 s jump, others 0.4 s), so the intro flows into the loop without a seam when 08-10 turns introActive off at 1800 ms"
  - "In the ceremony FxPools runs only the intro branch; beat effects are not evaluated at all"
  - "Intro confetti uses the ⭐3 confetti motion (life 1150 ms) from the winners' head height over the tier top center, clamped to the floor disc top; the ring sits at tier top + 0.02 and grows to the tier width over RING_LIFE_MS"
metrics:
  duration: "~20 min"
  completed: 2026-10-24
  tasks: 3
  files: 11
---

# Phase 8 Plan 09: Same-canvas 3D Ceremony Summary

The ceremony is now a mode of the existing 3D canvas. `SceneProps.ceremony` hides the board set and the ground shadow and shows one gold podium tier on a mint floor disc. Every winner stands on the tier wearing a crown and showing the winner face, and loops the big cheer. Everybody else stands on the floor in front with the joy face and cheers more gently, with a 0.2 s phase step per person. Nothing is remounted on the way from play to ceremony to restart: the same board, pools, podium and `pawn-{pid}` objects are reused. The intro (winners jump 0.45, 140 gold confetti, one gold ring) starts at 200 ms and is gone in the same frame when it is tapped away.

## What Was Built

**Task 1: podiumLayout + ceremony curves** (`c41ca21` RED, `701494e` GREEN)
- `layout/podiumLayout.ts` (new, pure, no three / React): one tier, D-17 size bands (1 → 1.15, 2–4 → 1.0…0.85, 5–8 → 0.75…0.65). Winners stand in one row of up to 4, or in two rows for 5–8 winners (front `ceil(w/2)`, back row raised 0.15, tier depth 1.9). Others stand on the floor in one row, or in two zig-zag rows from 6. Tier width = row width + 0.5, minimum 1.6. Ground radius = crowd half width + 0.8, minimum 2.4. The layout is centered on the origin and returns `topCenter` and the fitCamera `extents`.
- `charMotion.ts`: `celebratePose('winner')` = `cheerPose` looped over 1.5 s (jump 0.35, arms +2.4). `'joy'` is the same shape scaled to jump 0.15 and arms +1.4. Negative times wrap. `introJumpPose` crouches, jumps 0.45 with arms up and lands within 0.6 s; it is REST at both ends and continuous at 1 ms steps.
- Projection matrix test with the real `fitCamera(aspect, layout.extents)`: 1–8 winners × 0–7 others (2–8 people in total) × 374×230, 374×400, 588×290, 544×390 and 664×768. Every head is inside NDC (largest |ndc| ≈ 0.66) and the worst head-disc overlap is **0 %** (limit 30 %).

**Task 2: same-canvas ceremony mode** (`3dcc226` RED, `16c98ee` GREEN)
- `Podium.tsx` (new): a 48-segment unit cylinder for the ground and a unit RoundedBox (radius 0.12) for the tier. Both are module-scope and scaled per layout. Materials are MeshStandardMaterial using palette `podiumGround` and `podium` + `podiumEmissive` 0.2, with `dispose={null}` and no shadows. The podium is always mounted and only `visible` changes.
- `SceneContents.tsx`: Board, Dice and PathPreview sit in `<group name="board-set" visible={!ceremony}>`. `<Podium>` and `<FxPools>` are always rendered. `podiumLayout` is memoized on the winner list content and the participant order. Characters get `stand`, `introId` and `introActive`; in the ceremony `isCurrent` is false and the crowns go to the winners. CameraRig gets `extents={podium?.extents}`.
- `Character.tsx`: while `stand` is set, the character snaps to the stand position and scale every frame and skips the hop / rest code. Yaw is 0, the face is winner or joy with no blinks, and the pose is the intro or the `celebratePose` loop. A switch blends out the gap between the old pose and the new one. Under reduced motion the pose is REST. When `stand` becomes null the character snaps back to its displayed rest point + slot.
- `CameraRig.tsx`: `fitCamera(aspect, extents ?? boardExtents(layout))`. The extents are a dependency of the layout effect, so the camera re-fits when the ceremony starts and ends; the ⭐3 shake logic is unchanged.
- `GameCanvas.tsx`: ContactShadows sits inside `<group visible={!scene.ceremony}>` and is never unmounted.

**Task 3: ceremony intro FX** (`62b1938` RED, `da9d8d2` GREEN)
- `FxPools.tsx`: a `ceremony` prop and an intro clock keyed on `introId`. From `INTRO_JUMP_AT_MS` it emits 140 `confettiGold` pieces from the winners' head height over the tier top center, plus one `ringGold` ring growing to the tier width. Confetti ends at about 1350 ms and the ring at about 650 ms, both inside `CEREMONY_INTRO_MS`. `introActive` false or the end of the ceremony sets the counts to 0 in that same frame. The existing pools and scratch objects are reused, and the module-scope constructor count is still 7/7.
- `SceneContents.tsx` passes `{ introId, introActive, origin: podium.topCenter, ringRadius: podium.podium.width }`.

## Verification

- `npx vitest run src/game/layout`: 290/290 (podiumLayout + charMotion additions included)
- `npx vitest run src/game/scene src/game/sourceGuard.test.ts`: 25 files pass (fx.test.tsx 17, successJump 5, actors 28, ceremonyScene 16, source guard 10)
- `npm test` (full): **81 files, 1507 tests passed**
- `npx tsc -b`: exit 0
- `npm run build`: built. The GameCanvas lazy chunk is 978.64 kB; that >500 kB warning was already there before this plan.
- Ceremony draw budget, 8 participants with 1, 4 or 8 winners: total meshes ≤ 100 (countDraws rule) and visible meshes ≤ 70 (traverseVisible) during the intro.
- Acceptance greps:
  - `export function podiumLayout` 1; `CEREMONY_INTRO_MS = 1800` 1; three / react imports in podiumLayout 0; `celebratePose|introJumpPose` exports 2
  - `name="board-set"` 1; `<Podium` 1; conditional mounts 0; `visible={!scene.ceremony}` 1; castShadow / receiveShadow in Podium 0; `celebratePose(` in Character 1
  - `introActive` in FxPools 4; `confettiGold` in FxPools 4; module-scope constructors 7 = 7

## TDD Gate Compliance

Each task has a `test(08-09)` RED commit followed by a `feat(08-09)` GREEN commit: c41ca21 → 701494e, 3dcc226 → 16c98ee, 62b1938 → da9d8d2. In the Task 3 RED run two tests already passed:
- "winners jump ≈ 0.45 × scale…": the plan puts the intro jump in Task 2 (action 3), so Character already had it.
- "no ceremony / reduced never emits": it pins idle behavior that already holds.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Additive blend would double the pose on a seamless switch**
- **Found during:** Task 2
- **Issue:** The board code blends the old pose's offset from REST on top of the new curve. That works because new beat curves start at REST. In the ceremony, ending the intro hands over to a loop that is already mid-cheer, so the same rule would add the cheer offset twice for a moment, a visible jump when 08-10 turns `introActive` off.
- **Fix:** In ceremony mode only, on a source switch the blend carries `last − newPose`. The gap decays at SETTLE_RATE, and a seamless switch has no gap. The board path is unchanged.
- **Files modified:** src/game/scene/Character.tsx
- **Commit:** 16c98ee

**2. [Rule 1 - Test] Own test boundary fixes**
- `charMotion.test.ts`: the celebrate sampling grid ran to 1.5 periods. It now covers one period.
- `ceremonyScene.test.tsx`: the "0 before 200 ms" frame count treated the frame at exactly 200 ms as before the start. Emission at t = 0 is correct ("from 200 ms"), so that frame now counts as started.
- **Commits:** 701494e, da9d8d2

### Interpretations (documented, no behavior risk)
- A lone non-winner uses scale 1.0 (2–4 band) instead of 1.15 (see decisions).
- Moving Dice and PathPreview into `board-set` changed the render order: Characters now come after the board set. No test or visual depends on the order.

## Known Stubs

None. Podium keeps fallback sizes (`IDLE`) while no ceremony runs only so its meshes stay mounted and invisible. That is intended behavior, not a stub. The DOM ceremony screen, routing and intro state ownership belong to 08-10, which uses the `SceneProps.ceremony` contract defined here.

## Threat Flags

None. No new network, storage or input surface. The scene has no text (source guard (c) passes). Planned mitigations:
- T-08-20: visibility toggles only. The identity test covers play → ceremony → restart, and the grep gate finds no conditional mounts.
- T-08-21: visible ≤ 70, total ≤ 100, module-scope podium geometry, no shadows.
- T-08-22: no 3D text.

## Self-Check: PASSED
- FOUND: src/game/layout/podiumLayout.ts, src/game/layout/podiumLayout.test.ts, src/game/scene/Podium.tsx, src/game/scene/ceremonyScene.test.tsx
- FOUND commits: c41ca21, 701494e, 3dcc226, 16c98ee, 62b1938, da9d8d2
