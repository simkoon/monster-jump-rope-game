---
phase: 08-success-fx-awards
plan: 05
subsystem: game-scene-character
status: complete
tags: [3d, character, success-jump, tiers, reduced-motion, tdd]
requires: [08-02]
provides:
  - "layout/charMotion.ts: successBeatPose(tMs, timing: SuccessTiming), SuccessTiming { ms, landMs, jumpHeight }, SUCCESS_SQUASH_MS 120, SUCCESS_RELAX_MS 250"
  - "director/reaction.ts: Reaction.stars?: number (set for own stars beats only)"
  - "scene/Character.tsx: stars beats with rx.stars play the tiered landMs-based jump"
affects: [08-06, 08-10, 08-11]
tech-stack:
  added: []
  patterns:
    - "Beat curves that must sync with other consumers take ms time + a successPlan slice, not u"
    - "Per-beat derived timing cached in a ref keyed by beat id (no per-frame allocation)"
key-files:
  created:
    - src/game/scene/successJump.test.tsx
  modified:
    - src/game/layout/charMotion.ts
    - src/game/layout/charMotion.test.ts
    - src/game/director/reaction.ts
    - src/game/director/reaction.test.ts
    - src/game/scene/Character.tsx
    - src/game/scene/actors.test.tsx
decisions:
  - "successBeatPose reuses the Phase 7 successPose jump at u = 0.75·t/landMs (y × jumpHeight / 0.55), so the jump shape is identical for every tier and only its height scales"
  - "After touchdown: 120 ms squash (squashY 1 − 0.15·sin) while the arms settle 2.0 → 1.6, then an arms-up joy hold with a 0.04 vertical bob (500 ms period), easeInOutSine to REST over the last 250 ms; segments are clamped so short beats (900 ms) still end on REST"
  - "The 0.04 'bob' is a vertical body bob (sin², starts and ends at 0), not an arm wave"
  - "Character always calls successPlan(rx.stars, rx.ms, false): the reduced path never reads the pose (it holds REST), so reduced timing is not needed there"
metrics:
  duration: "~12 min"
  completed: 2026-10-24
  tasks: 2
  files: 7
---

# Phase 8 Plan 05: Tiered Success Jump Summary

A successful character now jumps to its tier height (⭐1 0.55 / ⭐2 0.65 / ⭐3 0.75 × slot scale), spins once with its arms up and the joy face, and touches down exactly at `successPlan.landMs`, the moment 08-04's confetti, burst and rings fire. It then holds an arms-up joy pose and is back on REST (yaw 2π) at the beat end.

## What was built

- **`successBeatPose(tMs, { ms, landMs, jumpHeight })`** (charMotion.ts): a pure, clock-free curve. Over [0, landMs] it plays the existing success jump on landMs, so the jump does not stretch with the longer 1600–2200 ms beats (Pitfall 6). At landMs it has y 0 and yaw 2π. After that comes the squash recovery, then the joy hold with a gentle bob, then the ease back to REST. At ms and later it is REST with yaw 2π. `successPose(u)` and `actPose` are unchanged, so the gallery and the other acts behave as before.
- **`Reaction.stars`** (reaction.ts): set to `beat.stars` only in the own-stars case. No other reaction has the key.
- **Character.tsx**: when `rx.act === 'success'` and `rx.stars` is set, it calls `successBeatPose(actT × 1000, plan)`. `plan` is computed by `successPlan(rx.stars, rx.ms, false)` and cached per beat id in a ref. The yaw rule (follow the curve), the additive blend-out and the reduced-motion path (REST, faces only, D-08) are untouched.
- **successJump.test.tsx** (new, node + test-renderer, 10 ms frames): b stands in a side slot (scale 0.9). The tests check:
  - the ⭐3 peak is 0.75 × scale at 0.4–0.7 of landMs
  - touchdown at landMs (± one frame), still airborne three frames earlier
  - after landing the body never rises above the 0.04 bob
  - joy face for the whole beat, exact REST at the beat end
  - ⭐1 < ⭐2 < ⭐3 at the successPlan heights
  - the legacy 900 ms beat also lands on its landMs and ends on REST
  - a mid-air `completeBeat` blends back to REST
  - reduced motion keeps REST every sampled frame with the joy face

## Commits

| Task | Gate | Commit | Message |
|------|------|--------|---------|
| 1 | RED | a241958 | test(08-05): add failing tests for the tiered success jump and Reaction.stars |
| 1 | GREEN | 9927827 | feat(08-05): tiered landMs-based success jump curve and Reaction.stars |
| 2 | RED | e02f53b | test(08-05): add failing mounted tests for the tiered success jump |
| 2 | GREEN | 1ed6947 | feat(08-05): wire the tiered success jump into Character |

## Verification

- `npm test`: **72 files, 1342 tests passed**
- `npx tsc -b`: exit 0
- `npm run build`: built (the existing >500 kB chunk warning is unchanged)
- Acceptance greps: `export function successBeatPose` = 1, `stars?: number` = 1, clock reads in charMotion.ts = 0, `successBeatPose(` in Character.tsx = 1, `rx.stars` in Character.tsx = 3
- facePrewarm.test.tsx and starClearance.test.tsx pass **unchanged**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test timing] actors.test.tsx stars spin sampling**
- **Found during:** Task 2
- **Issue:** The Phase 7 test "stars: joy face … crouch-jump-spin" sampled a 900 ms stars beat every 40 ms and expected the yaw to come within 0.5 rad of π. The jump now finishes on landMs (315 ms instead of ~540 ms), so the spin is faster, and the 40 ms samples skipped past π (closest sample 0.75 rad).
- **Fix:** Sample the same 1.2 s every 5 ms. The intent and thresholds are unchanged: passes through π, jumps ≥ 0.4, joy face, never completed by the character, skipAll returns to the bounce.
- **Files modified:** src/game/scene/actors.test.tsx (outside the plan's files_modified list; the plan expected this kind of fix only in facePrewarm / starClearance)
- **Commit:** 1ed6947

**2. [Test expectation] reaction.test.ts own-stars toEqual**
- The existing `toEqual` for the own stars reaction now includes `stars: 2`. The plan's behavior requires this.

## TDD Gate Compliance

Both tasks have a `test(...)` RED commit followed by a `feat(...)` GREEN commit. No refactor commits were needed. In the RED run of Task 2, the reduced-motion case already passed: it pins behavior that existed before this plan and has to keep holding.

## Known Stubs

None.

## Threat Flags

None. No new network, storage or input surface. T-08-33 is covered by the beat-end REST, mid-air completion and 900 ms tests. T-08-34 is covered by the per-beat-id ref cache; no new mesh, geometry or material is created.

## Self-Check: PASSED

- FOUND: src/game/scene/successJump.test.tsx, src/game/layout/charMotion.ts, src/game/director/reaction.ts, src/game/scene/Character.tsx
- FOUND commits: a241958, 9927827, e02f53b, 1ed6947
