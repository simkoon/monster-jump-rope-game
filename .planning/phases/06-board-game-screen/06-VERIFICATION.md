---
phase: 06-board-game-screen
verified: 2026-10-23T02:49:34Z
status: human_needed
score: 54/54 must-haves verified (automatable scope)
behavior_unverified: 0
overrides_applied: 0
automatable_verdict: passed # every automatable truth, artifact, key link, grep and bundle guard passed; only deferred real-device checks remain
behavior_unverified_items: [] # closed after the first pass: src/game/scene/gameCanvas.test.tsx exercises the real GameCanvas onCreated → watchContextLoss glue
re_verification:
  date: 2026-10-23
  closed:
    - "GameCanvas onCreated → watchContextLoss → onLost (GameCanvas.tsx:58-61) and unwatch on unmount (:68-75) — 6 unit tests with a mocked R3F Canvas that renders a plain <canvas>, plus a GameApp integration test where a DOM webglcontextlost event shows the alertdialog, hides the controls, and 🔄 remounts with the engine game unchanged (same object)"
  evidence: "npx tsc -b && npx vitest run → 44 files, 925 tests passed"
human_verification: # Deferred by user. These do NOT affect the automatable verdict.
  - test: "iPhone Safari portrait: start a 2-player game"
    expected: "The whole square board is visible between the turn bar and the 🎲 button/scoreboard; nothing is cut off and the page does not scroll"
    why_human: "Real viewport, safe-area insets and Safari toolbars cannot be reproduced in jsdom (fitCamera is proven only for aspects 0.45-2.4 in math)"
  - test: "Show the board to a child for about 3 seconds"
    expected: "They can point out the gold start arch (bottom-right), the clockwise chevrons and corner arrows, quest colors with 1/2/3 stars vs purple hex event pads with icons, who is 1st (crown/👑) and whose turn it is"
    why_human: "Perceptual readability"
  - test: "Look at the board as a whole"
    expected: "It reads as a cute, glossy 3D toy board game (memory: final art must be cuter than the sample)"
    why_human: "Aesthetic judgement"
  - test: "Tap 🎲 several times, judge ✅ and ❌, land on an event tile, and play into the last round"
    expected: "The die tumbles and lands on the number in the chip, then dots and a ring preview the destination, then the pawn hops tile by tile, and only after that do the buttons or the quest card appear. 🔔 마지막 라운드! shows at the start of the last round"
    why_human: "Real frame timing and feel on device (automated tests cover the order and gating)"
  - test: "Compare colors on a real screen"
    expected: "Quest tile colors match the editor/scoreboard difficulty colors; pawn colors match the scoreboard avatars"
    why_human: "Lit MeshStandardMaterial shading vs flat DOM hex needs a visual check"
  - test: "iPhone/iPad: switch to another app or lock the screen for about 30 s, then come back"
    expected: "If the board went blank, 🔄 화면 다시 그리기 appears; tapping it restores the board with the same stars, positions and turn"
    why_human: "iOS Safari WebGL context loss can only be reproduced on device"
  - test: "Load the app once, turn on airplane mode, then start a game"
    expected: "All text and the 3D board render (the 3D chunk is preloaded at idle)"
    why_human: "Real network-off behavior and browser cache"
  - test: "iPad landscape and laptop Chrome"
    expected: "The scoreboard and buttons sit in the right panel and the board still fits"
    why_human: "Real landscape layout and media queries on device"
---

# Phase 6: 3D 순환판 & 게임 화면 Verification Report

**Phase Goal:** 임시 화면이 3D 사각 순환판 게임 화면으로 바뀐다. 세로 폰 화면에서도 판 전체가 보이고, 처음 보는 아이도 3초 안에 출발 칸·진행 방향·칸 종류·별 1등·지금 차례를 읽을 수 있으며, 주사위·이동 연출이 끝나야 다음 단계로 넘어간다. 한글 글자는 모두 3D 밖 DOM 화면에 둔다. 말은 아직 임시 말이며 Phase 7에서 치비 캐릭터로 바뀐다.
**Verified:** 2026-10-23T02:49:34Z
**Status:** human_needed. All automatable checks passed. The only open items are the real-device checks the user deferred, listed under "Human verification (deferred by user)".
**Re-verification:** No. This is the initial verification.

## Evidence Commands (run by the verifier in this session)

| Command | Result |
|---|---|
| `npx tsc -b` | exit 0 |
| `npx vitest run` | exit 0. 43 files, **918/918 tests passed** (only THREE.Clock deprecation warnings on stderr) |
| `npm run build` | exit 0. `index-oyx20QAA.js` 359 kB (gzip 112 kB), separate `GameCanvas-BszdlVSV.js` 950 kB (gzip 254 kB) |
| `grep -c WebGLRenderer dist/assets/index-*.js` | **0** (main chunk is WebGL-free) |
| `grep -c WebGLRenderer dist/assets/GameCanvas-*.js` | **6** (renderer lives in the lazy chunk) |
| `grep -E "googleapis\|jsdelivr\|githack\|gstatic\|unpkg" dist/assets/*.js` | **no match** |
| `grep -rl "__loseContext" dist` | **no match** (DEV hook stripped; the one `loseContext` hit is three's own `forceContextLoss` → `WEBGL_lose_context.loseContext()`) |
| `grep "/monster-jump-rope-game/assets/" dist/index.html` | JS and CSS both resolve under the base |
| Remote URLs in dist JS | Only error/doc strings (github.com, react.dev, w3.org namespaces, json-schema.org). No fetchable CDN host. No `@font-face` / remote `url()` in CSS |
| `git diff --stat e54608f HEAD -- src/engine src/store.ts src/schema.ts src/lib/io.ts src/settings.ts` | empty. Engine, content format and settings untouched (D-01) |

## Goal Achievement

### Observable Truths: ROADMAP Success Criteria (the contract)

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| SC1 | 3D square ring (start/quest/event) fits in one screen in portrait; start is a landmark; direction on every tile; gaps between tiles | ✓ VERIFIED (automatable) / real-device fit deferred | `GameApp.tsx:30` routes the active game to `GameStage`. `GameStage.tsx:100,170` mounts `lazy(loadGameCanvas)`. `SceneContents.tsx:44-45` mounts CameraRig + Board. `fitCamera.test.ts` projects all 8 board-box corners inside NDC for 16/20/24 tiles × aspects 0.45-2.4. `board.test.tsx` CameraRig frames 390×520 / 520×520 / 844×330 and re-fits on resize. `ringLayout.test.ts` (49 tests) checks the clockwise walk, the start at the bottom-right and footprint gaps ≥ 0.1t. StartGate (1.4× gold block + arch). Arrows: n+1 chevrons + 4 corner arcs |
| SC2 | Tile kind readable without text: difficulty color + star count; event shape + icon | ✓ VERIFIED | `Board.tsx:95` `setColorAt(q, DIFF_THREE[t.diff])` (DIFF_THREE = `new Color(DIFF_COLOR.*)`, `geometries.ts:243-247`). `Board.tsx:98-107` places `starsFor(diff)` stars. Event pads use the hex `GEO.pad`. `TileIcons.tsx` forward/backward/extra icons. sourceGuard (c): no 3D text. No `<Text>`/troika/`<Html>`/font loaders in `src/game/scene` |
| SC3 | Big low-text 🎲 → 3D die rolls → pawn moves tile by tile; controls hidden until beats end | ✓ VERIFIED | `ControlsBar.tsx:48-53` (🎲 주사위 굴리기). `GameStage.tsx:132` `controlsVisible = !busy && consumedLog === game.log && ready && failure === null`. `useDirector.ts:52` synchronous `useGameStore.subscribe`. Dice.tsx snaps to `FACE_UP_EULER[face]`, Pawn.tsx hops per tile and calls `completeBeat` once. Tests: `stage.test.tsx` "🎲 onto a quest hides every control synchronously…", "watchdogs alone bring the quest card back…"; `useDirector.test.tsx` "no flicker…"; `actors.test.tsx` Pawn/Dice/PathPreview consumers |
| SC4 | Scoreboard sorted by stars (ties share a rank, same color/icon as pawn), current + next turn (team name + member), round r/R, 마지막 라운드! banner | ✓ VERIFIED | `Scoreboard.tsx:29,36` uses `rankByStars` and `--pc: ANIMAL_COLOR`. Pawn body uses `pawnMaterial` = `ANIMAL_COLOR[animal]` (`actorGeometries.ts:153-156`). `TurnHud.tsx:55` "이번엔 ○○ 님이 도전!". `nextUpView`/`nextUp` mirror `advanceTurn` (`engine/game.ts:341-380`). Round dots + `r/R`. `timeline.ts:90-95` finalRound beat 1500 ms. stage.test "a fresh 1-round game shows 🔔 마지막 라운드! and hides 🎲 for 1500 ms" |
| SC5 | Context loss → 화면 다시 그리기 keeps stars/positions/turn; offline text and board OK | ✓ VERIFIED (automatable) / iOS + airplane deferred | `GameStage.tsx:103,119-124,189` (lost → overlay; redraw = skipAll + new key + fresh lazy). `GameCanvas.tsx:58-61` onCreated → `watchContextLoss(gl.domElement, …)`. stage.test: 4 context-loss tests (state unchanged `engine()).toBe(before)`, mid-beat redraw, throwing canvas, 8 s timeout). `main.tsx:16-20` idle preload. Bundle guards above |

### Observable Truths: Plan must_haves

| Plan | Truths | Status | Notes |
|---|---|---|---|
| 06-01 (foundation) | 9 | 9 ✓ | Exact pins equal `06-01-VERSIONS.json` (set d05: three 0.186.1, fiber 9.8.2, drei 10.7.9, @types/three 0.186.0, test-renderer 9.1.1) in package.json and `npm ls`. `.npmrc` legacy-peer-deps kept. ringLayout/fitCamera/diceFaces/palette/turnOrder/contextLoss have no runtime three import (grep = 0 each) |
| 06-02 (director) | 6 | 6 ✓ | BEAT_MS table, `WATCHDOG_BUFFER_MS = 500`, sync subscribe, 300-seed fuzz in `displayed.test.ts`, id-guarded `completeBeat` (`usePresentation.ts:103`), skipAll/reset resync. timeline/displayed are clock-free (grep = 0) |
| 06-03 (static board) | 9 | 9 ✓ | RoundedBoxGeometry from `three/addons`, no three-stdlib, no drei, no shadows, no `.dispose()` on singletons, no OrbitControls/Bounds, ≤ 30 draw calls test |
| 06-04 (DOM HUD) | 8 | 8 ✓ | Banner `completeBeat` by id, StatusChips/ContextLostOverlay props-only, no `dangerouslySetInnerHTML` (0 in all 7 HUD/stage files), HUD CSS has no raw hex and has reduced-motion |
| 06-05 (moving 3D) | 8 | 8 ✓ | The GameCanvas onCreated → watchContextLoss glue (`GameCanvas.tsx:58-61`, unwatch on unmount `:68-75`) is exercised by `src/game/scene/gameCanvas.test.tsx` (re-verification). Draw-call budget ≤ 100 (8 pawns / 24 tiles) is tested. Source guard enforces no CDN drei module, no remote URL, no 3D text, no three in main-chunk modules |
| 06-06 (stage) | 9 | 9 ✓ | See SC1-SC5. PlayView/RingStrip/DiceResultPanel deleted (`git diff --name-status` D ×3; no references left in src). Old CSS selectors = 0. Stage CSS: 72/64/56 px targets, `min-aspect-ratio: 5/4` landscape panel, canvas `pointer-events: none` + `touch-action: manipulation` |

**Score:** 53/54 truths verified (5 roadmap SC + 49 plan truths; 1 present but behavior-unverified).

### Required Artifacts

`gsd-tools verify.artifacts` gave 06-01 8/8, 06-02 4/4, 06-03 6/6, 06-04 6/6, 06-05 8/8 and 06-06 3/4.

| Artifact | Status | Details |
|---|---|---|
| `src/game/GameStage.tsx` (207 lines) | ✓ VERIFIED | exports default + `READY_TIMEOUT_MS`, contains `lazy(loadGameCanvas)` |
| `src/game/GameApp.tsx` | ✓ VERIFIED | `useDirector()` at line 24 |
| `src/test/fakeGameCanvas.tsx` | ✓ VERIFIED | exports default, `fakeCanvas`, `settle`, `waitForCanvas` |
| `src/game/stage.test.tsx` (11 tests) | ✓ VERIFIED (with note) | Substantive and passing. It simulates loss through `fakeCanvas.lastProps.onLost()`; the declared real `webglcontextlost` DOM-event path is covered by the GameApp integration test in `src/game/scene/gameCanvas.test.tsx` (that file needs its own module mocks, so it is kept separate) |
| All other plan artifacts (scene/*, hud/*, layout/*, director/*, palette, turnOrder, sourceGuard, VERSIONS.json) | ✓ VERIFIED | exist, are substantive and are wired into the SceneContents/GameStage graph |

### Key Link Verification

`gsd-tools verify.key-links` reported many false failures. The PLAN YAML double-escapes the patterns (for example `buildTimeline\\(`), and the tool rejects them as an "Invalid regex pattern" or matches the literal backslash. Every link was re-checked by hand with single-escaped grep:

| From | To | Pattern | Status |
|---|---|---|---|
| palette.test.ts | index.css | `index\.css\?raw` | ✓ WIRED (line 4) |
| fitCamera/CameraRig | ringLayout | `boardExtents(` | ✓ WIRED (`CameraRig.tsx:20`) |
| turnOrder.ts | engine/game.ts | `currentParticipant` | ✓ WIRED |
| useDirector.ts | useGameStore | `useGameStore.subscribe` | ✓ WIRED (line 52) |
| useDirector.ts | timeline.ts | `buildTimeline(` | ✓ WIRED (lines 36, 45) |
| usePresentation.ts | displayed.ts | `applyBeat(` | ✓ WIRED (lines 72, 104) |
| Board.tsx | ringLayout.ts | `ringLayout(` | ✓ WIRED (line 66) |
| Board.tsx | palette.ts | `DIFF_COLOR` | ✓ WIRED (indirect): Board uses `DIFF_THREE` from geometries.ts, which wraps `DIFF_COLOR`. Test "colors quest tiles by difficulty (DIFF_COLOR)" passes |
| Banner.tsx / Pawn.tsx | usePresentation | `completeBeat(` | ✓ WIRED |
| Scoreboard.tsx | palette | `ANIMAL_COLOR` | ✓ WIRED |
| labels.ts | turnOrder.ts | `nextUp(` | ✓ WIRED |
| GameCanvas.tsx | contextLoss.ts | `watchContextLoss(` | ✓ WIRED (line 61) |
| loadGameCanvas.ts | GameCanvas.tsx | `import('./GameCanvas')` | ✓ WIRED (dynamic only, 0 static imports) |
| GameApp.tsx | useDirector | `useDirector()` | ✓ WIRED |
| GameStage.tsx | loadGameCanvas | `lazy(loadGameCanvas)` | ✓ WIRED (line 100) |
| GameStage.tsx | usePresentation | `consumedLog === game.log` | ✓ WIRED (line 132) |
| main.tsx | loadGameCanvas | `loadGameCanvas()` | ✓ WIRED (line 17, idle preload) |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|---|---|---|---|---|
| Scoreboard (via GameStage) | `entries[].stars` | `usePresentation.displayed.stars` (`GameStage.tsx:135`), which applyBeat advances and the engine resyncs on drain | yes | ✓ FLOWING. Test "stars rise only after the 600 ms stars beat" |
| SceneContents → Pawn | positions/crowns | `displayed.positions` / `displayed.stars` | yes | ✓ FLOWING |
| Board | tiles | `game.board` (engine) | yes | ✓ FLOWING |
| Dice | face | current dice beat `face` (= engine `rolled.face`); rest = `lastMove.roll` | yes | ✓ FLOWING |
| TurnHud | turn/next/round | engine selectors + `nextUpView(game)` | yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Whole suite | `npx vitest run` (run once, output saved) | 918 passed, 0 failed | ✓ PASS |
| No flicker / gate | stage.test + useDirector.test (from the saved run) | 11 + 17 passed | ✓ PASS |
| Context loss recovery keeps state | stage.test "lost → overlay … game unchanged" | passed | ✓ PASS |
| Main chunk WebGL-free, lazy chunk has renderer | grep on dist | 0 / 6 | ✓ PASS |
| Offline: no CDN host, no DEV hook, base path | grep on dist | clean | ✓ PASS |

### Probe Execution

Step 7c skipped. No `scripts/*/tests/probe-*.sh` exists, and no PLAN declares a probe.

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|---|---|---|---|
| BOARD-01 | 06-01, 03, 05, 06 | ✓ SATISFIED (portrait real-device fit deferred) | ringLayout, fitCamera, CameraRig, GameStage grid |
| BOARD-02 | 06-01, 03, 06 | ✓ SATISFIED | StartGate landmark, chevrons + corner arrows, footprint gaps |
| BOARD-03 | 06-03, 06 | ✓ SATISFIED | difficulty colors + 1/2/3 stars, hex pads + icons, no 3D text |
| HUD-01 | 06-04, 05, 06 | ✓ SATISFIED | rankByStars, shared ANIMAL_COLOR, displayed stars |
| HUD-02 | 06-01, 04, 06 | ✓ SATISFIED | TurnHud current/next/team member, nextUp mirrors advanceTurn |
| HUD-03 | 06-02, 04, 05, 06 | ✓ SATISFIED | sync director, `controlsVisible` gate, hidden-not-disabled ControlsBar |
| HUD-04 | 06-04, 06 | ✓ SATISFIED (feel deferred) | big 🎲 button, 72/64/56 px targets |
| ROUND-02 | 06-02, 04, 06 | ✓ SATISFIED | r/R + dots, 마지막 라운드 label, 1500 ms finalRound banner |
| STAB-02 | 06-01, 04, 05, 06 | ✓ SATISFIED (iOS reproduction deferred) | watcher, overlay, redraw keeps state |
| STAB-04 | 06-05, 06 | ✓ SATISFIED (airplane run deferred) | source guard + dist guards + idle preload |

No requirements are orphaned. REQUIREMENTS.md maps exactly these 10 IDs to Phase 6, and 06-06 claims all 10.

### Anti-Patterns Found

58 added or modified src files scanned (`git diff e54608f HEAD`).

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| (all) | - | TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER | none found | - |
| `dist/assets/GameCanvas-*.js` | - | 950 kB chunk (> 500 kB Vite warning) | ℹ️ Info | First 3D load on slow networks. It is lazy and preloaded at idle, so it does not block the main UI. Size budget belongs with Phase 8 STAB work |
| tests (actors/board) | - | `THREE.Clock` deprecation warnings | ℹ️ Info | Comes from fiber 9.8.2 on three 0.186; harmless |
| `deferred-items.md` | - | npm audit: 6 dev-toolchain vulnerabilities (vite/vitest) | ℹ️ Info | Older than Phase 6, unrelated to the 3D stack, already logged as deferred |

## Human verification (deferred by user)

The user asked for automatable verification only. The 8 real-device checks from `06-06-PLAN.md` Task 3 `<human-check>` (D-29) are recorded here and in the frontmatter `human_verification` list. They are deferred and do not block the automatable verdict above.

1. **iPhone Safari portrait fit.** The whole board is visible between the turn bar and the 🎲/scoreboard, with nothing cut off and no scroll.
2. **3-second readability.** A child can find the gold start arch (bottom-right), the clockwise chevrons and corner arrows, quest colors with 1/2/3 stars vs purple hex event pads, the 1st place (crown/👑) and the current turn (sky ring, bouncing pawn, turn bar).
3. **Cuteness.** The board reads as a cute, glossy 3D toy board game.
4. **Beat order and feel.** The die tumbles to the chip number, then the preview dots and ring, then tile-by-tile hops, and only then the buttons or quest card. 🔔 마지막 라운드! shows at the last round.
5. **Color sameness on a real screen.** Quest colors match the difficulty tokens and pawn colors match the scoreboard avatars.
6. **iPhone/iPad context loss.** After about 30 s in another app or on the lock screen, 🔄 화면 다시 그리기 restores the board with the same stars, positions and turn. This also closes the behavior-unverified GameCanvas glue item.
7. **Airplane-mode start.** Load once, go offline, then start a game: all text and the 3D board render.
8. **iPad landscape and laptop.** The right panel holds the scoreboard and controls, and the board fits.

## Gaps Summary

No blocking gaps. Every roadmap success criterion, every plan truth that can be automated, all 10 requirement IDs, all key links, all PLAN acceptance-criteria greps and all bundle guards were verified against the code and fresh command output in this session.

Non-blocking notes:

- **Closed on re-verification:** the real `webglcontextlost` path in `GameCanvas.tsx:58-61` is now tested (`src/game/scene/gameCanvas.test.tsx`, 7 tests: ready once, loss → onLost + preventDefault, latest callback, unwatch on unmount, frameloop by visibility, DEV hook lifecycle, GameApp DOM loss → overlay → 🔄 remount with the same game). Only the iOS Safari device behavior remains, under deferred human item 6.
- **Tooling:** `gsd-tools verify.key-links` false negatives come from double-escaped regex patterns in the PLAN YAML. Manual grep confirms every link.

The status is `human_needed` only because of the deferred real-device items. On automatable scope alone the phase passes.

---

_Verified: 2026-10-23T02:49:34Z_
_Verifier: Claude (gsd-verifier)_
