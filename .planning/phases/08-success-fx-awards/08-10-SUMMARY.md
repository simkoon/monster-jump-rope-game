---
phase: 08-success-fx-awards
plan: 10
subsystem: game-hud-ceremony
status: complete
tags: [ceremony, awards, badges, hud, sound-toggle, no-remount, css, tdd]
requires: [08-01, 08-03, 08-06, 08-07, 08-08, 08-09]
provides:
  - "labels.ts: BADGE_COPY, CEREMONY_TITLE, CEREMONY_LIST_LABEL, endReasonCopy(reason, rounds), winnerLine(winners), ceremonyCardAria(animal, name, stars, badgeNames, isWinner), podiumAria(names)"
  - "hud/CeremonyView.tsx: CeremonyHead({ game }), CeremonyPanel({ game, introActive }) (fragment: .ceremony-panel + .ceremony-actions)"
  - "hud/DomPodium.tsx: default DomPodium({ game, onRedraw }) — DOM-only podium fallback"
  - "hud/useCeremonyIntro.ts: useCeremonyIntro(active, gameKey) → { introId, introActive, endIntro }"
  - "GameStage: ceremony mode (.stage--ceremony, canvasProps.ceremony, podium aria, DomPodium fallback), SoundToggle in .stage-canvas-cell for both modes"
  - "GameApp: GameStage whenever a game exists (no ResultView branch)"
  - "game.css: '=== Phase 8: ceremony (08-10) ===' block"
affects: [08-11]
tech-stack:
  added: []
  patterns:
    - "Ceremony = a GameStage mode with three fixed child slots, so the canvas cell node (and its WebGL context) survives play → ceremony → restart"
    - "Intro run derived during render (adjust-state-on-prop-change) keyed on the board; fanfare guarded by the played run id (StrictMode-safe)"
key-files:
  created:
    - src/game/hud/CeremonyView.tsx
    - src/game/hud/DomPodium.tsx
    - src/game/hud/useCeremonyIntro.ts
    - src/game/hud/ceremony.test.tsx
  modified:
    - src/game/labels.ts
    - src/game/labels.test.ts
    - src/game/GameStage.tsx
    - src/game/GameApp.tsx
    - src/game/hud/SoundToggle.tsx
    - src/game/hud/shell.test.tsx
    - src/App.test.tsx
    - src/game/stage.test.tsx
    - src/game/styles/game.css
  deleted:
    - src/game/hud/ResultView.tsx
decisions:
  - "The intro key is game.board (new on every 🔁 다시 하기), so the fanfare plays once per game and a falling/rising ceremony flag on the same game never replays"
  - "Leaving the ceremony (다시 하기 / 처음으로) while the fanfare may still ring fades its group; the natural 1800 ms end does not cut it"
  - "In the ceremony DomPodium covers every not-ready state (loading, lost, failed) instead of ContextLostOverlay — no error copy for children"
  - "role=img sits on an inner .dom-podium-figure, so the 🔄 button stays an accessible control (it is a sibling, not inside the img)"
  - "SoundToggle gets an is-off class for the flat off background (UI-SPEC §Color); label / aria behaviour unchanged"
metrics:
  duration: "~14 min"
  completed: 2026-10-24
  tasks: 3
  files: 14
---

# Phase 8 Plan 10: Award Ceremony Screen on the Same Canvas Summary

The temporary result screen is gone. When a game ends and its beats are over, GameStage turns into the ceremony on the same stage and the same canvas node. The head shows 게임 끝! and the end reason, the 3D podium from 08-09 sits in the canvas cell, and the panel shows the 🏆 winner line and a 모두의 별 card for every participant. Each card has 1–2 praise badges. 🔁 다시 하기 and 처음으로 work from the first frame. There are no rank numbers, and the last card looks exactly like every other non-winner card. When 3D is unavailable, a DOM podium appears without any error copy. The 🔊/🔇 toggle stays in the canvas cell's top-right corner during both play and the ceremony.

## What was built

**Task 1: ceremony parts** (`337c991` RED, `76f917c` GREEN)
- `labels.ts` adds the ceremony copy, all strings exactly as in the UI-SPEC:
  - `BADGE_COPY`: 6 badges with emoji, name and title
  - `CEREMONY_TITLE`, `CEREMONY_LIST_LABEL = '모두의 별'`
  - `endReasonCopy`, `winnerLine` (keeps the `🏆 우승! ` / `🏆 공동 우승! ` prefixes)
  - `ceremonyCardAria`, `podiumAria`
  - A banned-word test checks every ceremony string against 꼴찌 and the N등 pattern.
- `CeremonyView.tsx`:
  - `CeremonyHead` shows the title and the reason.
  - `CeremonyPanel` renders the role=status winner line and `<ol aria-label="모두의 별">`.
  - Cards are sorted by stars with a stable participant-order tie-break and carry inline `--pc` / `--i`.
  - Only winners get `.is-winner` and a `.ceremony-trophy`.
  - Badges come from awardBadges → displayBadges, rendered as `{emoji} {name}` chips with titles. The avatar, 🏆 and chips are aria-hidden, and the card aria-label carries everything.
  - `is-intro` is on the panel while the intro runs.
  - The buttons call `restart()` / `reset()` and carry data-skip-ignore.
- `DomPodium.tsx`: one gold block under the winners row, a 👑 over each winner circle, the others as `.dom-podium-dot` circles with `--pc`, `.is-many` for 5 or more winners, and a 🔄 화면 다시 그리기 `.game-btn--sm` (data-skip-ignore). It shows no error copy.
- `useCeremonyIntro.ts`:
  - Each run is tied to a gameKey and is derived during render.
  - The fanfare plays once per run id: `sfx.play('fanfare', { group: 'ceremony-intro-N' })`.
  - A `CEREMONY_INTRO_MS` timer ends the intro. `useTapToSkip(introActive, endIntro, introId)` ends it on a tap or Escape and calls `sfx.stopGroup`.
  - There is no input lock.

**Task 2: same-canvas ceremony mode** (`0761590` RED, `2a9b895` GREEN)
- `GameStage.tsx`:
  - `useCeremonyIntro(game?.phase === 'gameOver' && !busy, game?.board)`, with `ceremony = over && !busy`.
  - The stage keeps exactly three child slots: TurnHud or CeremonyHead, the unchanged `.stage-canvas-cell`, and `.stage-bottom` or CeremonyPanel.
  - In the ceremony, StatusChips and MissionOverlay are not rendered. Banner and StarFlight stay, and `<SoundToggle />` is always there.
  - The overlay slot shows DomPodium in the ceremony and ContextLostOverlay in play.
  - `canvasProps.ceremony = { winners, introId, introActive }`, and the canvas aria-label uses `podiumAria`.
- `GameApp.tsx` renders `<GameStage />` whenever a game exists. It no longer imports usePresentation.
- `ResultView.tsx` is deleted. Its shell.test block was removed; ceremony.test covers the parts and stage.test covers the routing. Existing stage tests now expect the ceremony.
- New integration tests in stage.test.tsx:
  - The natural end gives `.stage--ceremony`, mounts = 1 and `ceremony = { winners, 1, true }`.
  - The play-only HUD is absent and the DOM order is head → canvas cell → panel → actions.
  - 다시 하기 during the intro gives a new board with zeroed stats and mounts = 1.
  - Three play → ceremony → 다시 하기 loops keep mounts = 1.
  - 처음으로 returns to the setup screen.
  - lost → DomPodium → 🔄 → mounts = 2, and the 3D podium returns.
  - A throwing canvas also falls back to DomPodium.
  - SoundToggle is in the canvas cell during a stars beat and in the ceremony. A tap flips soundOn without skipping the beat or the intro.
  - The tap that ends the win beat does not end the intro; a second tap does.
- `App.test.tsx`: the full-game test now also asserts `.stage--ceremony`, the 모두의 별 list, and mounts = 1 before and after 다시 하기.

**Task 3: CSS** (`314ce66` RED, `2c5b6c7` GREEN)
- The `=== Phase 8: ceremony (08-10) ===` block uses tokens and color-mix only, with no hex values and no coral.
- Grid:
  - Portrait rows are `auto minmax(200px, 1fr) auto auto`.
  - In landscape the right column is `minmax(0, 1fr) 360px` (300px on phone landscape) and the canvas cell spans `1 / -1`.
- Panel: max 48dvh with vertical scroll inside (no limit in landscape). The card grid is `repeat(auto-fill, minmax(160px, 1fr))` with an 8px gap.
- Cards: 88 / 80 px, avatar 40 / 32 px. The winner card is `color-mix(in srgb, var(--sun) 22%, var(--panel))` with a 3px sun border. The 🏆 is a 24px circle. Badge chips are 28px high with a 999px radius and a sun-deep 55% border.
- Actions are 72 / 64 / 56 px, with flex 2 : 1.
- `.sound-toggle` is absolute at 8px / 8px, z 4, a 56px circle, and 48px at max-width 560px and max-height 760px. It has a sky focus ring, a pressed translateY(2px) and a flat `.is-off` background.
- DomPodium sizes are 80/56 and 64/48 px winners, 48/40 px others, and a 64/48 px gold block. The redraw button is 56 / 44 px.
- Keyframes `ceremony-title-in`, `ceremony-card-in` (staggered by `--i` × 40 ms, only while `.is-intro`) and `dom-podium-pop`, plus the block's own reduced-motion query.
- The block has no `:last-child` or `:nth-*` selectors, and `.ceremony-card` has no opacity or filter.

## Verification

- `npm test` (full): **82 files, 1544 tests passed**
- `npm run build`: built. Only the existing >500 kB chunk warning remains (the lazy GameCanvas chunk).
- `npx tsc -b`: clean
- Acceptance greps:

  | Check | Expected | Result |
  |-------|----------|--------|
  | 모두의 별 in labels.ts | 1 | 1 |
  | CEREMONY_LIST_LABEL in CeremonyView | ≥ 1 | 2 |
  | awardBadges( / displayBadges( in CeremonyView | 1 / 1 | 1 / 1 |
  | data-skip-ignore in CeremonyView | ≥ 2 | 2 |
  | useTapToSkip( / 'fanfare' in useCeremonyIntro | 1 / 1 | 1 / 1 |
  | dangerouslySetInnerHTML (code) | 0 | 0 |
  | ResultView imports | 0 | 0 |
  | `grep -rn ResultView src` | 0 lines | 0 lines |
  | stage--ceremony in GameStage | ≥ 1 | 2 |
  | `<SoundToggle` in GameStage | 1 | 1 |
  | useCeremonyIntro( / `<DomPodium` in GameStage | 1 / 1 | 1 / 1 |
  | three / @react-three imports (3 files) | 0 | 0 |
  | fakeCanvas.mounts in stage.test | ≥ 1 | 5 |
  | 08-10 CSS marker | 1 | 1 |
  | hex in block | 0 | 0 |
  | :last-child / :nth-* in block | 0 | 0 |
  | minmax(160px, 1fr) in block | ≥ 1 | 1 |
  | .sound-toggle in block | ≥ 1 | 7 |

## TDD Gate Compliance

Each task has a `test(08-10)` RED commit followed by a `feat(08-10)` GREEN commit: 337c991 → 76f917c, 0761590 → 2a9b895, 314ce66 → 2c5b6c7.
- In the Task 2 RED run, "처음으로 goes back to the start screen" already passed, because the old ResultView had the same button. All other new cases failed as expected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The DOM podium's redraw button would have been hidden from assistive tech**
- **Found during:** Task 1
- **Issue:** The plan puts `role="img"` on the DomPodium. An img role makes its children presentational, so a 🔄 button inside it would not be announced as a button.
- **Fix:** `role="img"` and the podium aria-label sit on an inner `.dom-podium-figure`. The button is a sibling inside `.dom-podium`.
- **Files modified:** src/game/hud/DomPodium.tsx
- **Commit:** 76f917c

**2. [Rule 2 - Missing styling hook] The sound toggle had no off state to style**
- **Found during:** Task 3
- **Issue:** UI-SPEC §Color gives the off toggle a flat `--panel-2` background, but SoundToggle exposed no state class (only the aria-label changed).
- **Fix:** SoundToggle adds `is-off` when sound is off. Behavior and labels are unchanged, and the existing soundToggle tests still pass. This file was not in the plan's `files_modified`.
- **Files modified:** src/game/hud/SoundToggle.tsx
- **Commit:** 2c5b6c7

**3. [Rule 1 - Layout] Gold block width**
- A `.dom-podium-tier` wrapper (winners row + block, stretched) keeps the gold block at "winners row + 32px" even when the row of other players is wider.
- **Commit:** 2c5b6c7

**4. [Acceptance grep] Comment text adjusted**
- The GameStage header comment named `<SoundToggle />`, which would have made the count 2. The ceremony.test header named the deleted component. Both comments were reworded.
- **Commit:** 2a9b895

### Interpretations (documented, no behavior risk)
- DomPodium also replaces the "판을 준비하고 있어요…" loading line during the ceremony. The plan's overlay slot rule is `!ready || failure`, so the DOM podium shows until the 3D podium is ready.
- The old `.game-result*` CSS rules in game.css and index.css are now unused. They were left in place, because removing them was outside this plan's scope.

## Notes for downstream plans

- **08-11 (soak):** useCeremonyIntro adds 2 document listeners (capture click + keydown) only while the intro runs, and one timeout per run. The fanfare group is `ceremony-intro-{introId}`. Across restarts, the WebGL canvas mount count stays 1 (asserted in stage.test and App.test).

## Known Stubs

None.

## Threat Flags

None. No new network, storage or trust-boundary surface. Planned mitigations:
- T-08-23: names render only as JSX text and attribute text, and a markup-name test shows no element is created.
- T-08-24: three fixed slots, and mounts stay 1 over 3 restarts.
- T-08-25: no rank numbers, identical non-winner cards, a CSS gate against place-based selectors and a banned-word test.
- T-08-26: the buttons are live from the first frame, and the intro ends by its timer or a tap with no lock afterwards.

## Self-Check: PASSED
- FOUND: src/game/hud/CeremonyView.tsx, src/game/hud/DomPodium.tsx, src/game/hud/useCeremonyIntro.ts, src/game/hud/ceremony.test.tsx
- DELETED (intended): src/game/hud/ResultView.tsx
- FOUND commits: 337c991, 76f917c, 0761590, 2a9b895, 314ce66, 2c5b6c7
