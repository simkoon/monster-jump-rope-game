---
phase: 05-rules-engine-settings
plan: 04
subsystem: game-ui
tags: [ui, labels, hud, css, accessibility, tdd]
status: complete
requires:
  - "05-01: src/settings.ts FailRule/Settings types"
  - "05-02: AnimalId/ANIMALS, Tile/DIFF_ORDER, starsFor/rankByStars, ContentAnalysis"
provides:
  - "src/game/labels.ts: ANIMAL_EMOJI, ANIMAL_NAME, DIFF_LABEL, FAIL_RULE_LABEL, startBonusSummary, rulesSummary, RULES_HINT, missingNotices, estimateLine, estimateBasis, tileGlyph, tileAriaLabel"
  - "src/game/hud/AnimalPicker.tsx: default AnimalPicker({ groupLabel, value, taken, onChange })"
  - "src/game/hud/Scoreboard.tsx: default Scoreboard({ entries, currentId }), type ScoreEntry"
  - "src/game/hud/RingStrip.tsx: default RingStrip({ tiles, tokens, currentId }), type RingToken"
  - "src/game/styles/game.css: Phase 5 temporary-screen classes (.temp-play, .scoreboard, .ring-strip/.ring-tile*, .animal-pick, .animal-avatar, .setup-*, .game-judge-result, .game-quest-*, .game-round, chip/standings modifiers)"
affects: [05-05]
tech-stack:
  added: []
  patterns:
    - "Emoji/Korean names keyed by AnimalId live only in the UI module; engine stays id-only"
    - "Props-only presentational HUD parts (no store imports) so the harness swap only wires them"
    - "Tile index exposed only through aria-label, never as visible text"
key-files:
  created:
    - src/game/labels.ts
    - src/game/labels.test.ts
    - src/game/hud/AnimalPicker.tsx
    - src/game/hud/Scoreboard.tsx
    - src/game/hud/RingStrip.tsx
    - src/game/hud/tempHud.test.tsx
  modified:
    - src/game/styles/game.css
decisions:
  - "05-04: labels.ts is the single source of UI copy for Phase 5 screens; MissionOverlay's local DIFF_LABEL is left untouched until 05-05 rewires it"
  - "05-04: AnimalPicker never disables the participant's own current value even if it also appears in taken (avoids locking a row out of its own pick)"
  - "05-04: missingNotices re-sorts missing difficulties into DIFF_ORDER regardless of input order"
metrics:
  duration: "4min"
  completed: "2026-10-23"
  tasks: 2
  files: 7
---

# Phase 5 Plan 04: Temporary HUD Parts and UI Copy Summary

A single UI copy module (`labels.ts`) plus three props-only display parts: an 8-animal picker, a star scoreboard with shared ranks, and a ring-order tile strip. An append-only Phase 5 CSS section built from tokens and `color-mix` sits underneath them, so 05-05 only has to wire them up.

## What Was Built

### Task 1: labels.ts (TDD)
- `ANIMAL_EMOJI` / `ANIMAL_NAME` as `Record<AnimalId, string>` (bear 🐻 곰 … chick 🐥 병아리). The engine source contains no emoji or Korean animal names.
- `DIFF_LABEL`, `FAIL_RULE_LABEL`, `startBonusSummary` (끔 / ⭐+1 / ⭐+2), `rulesSummary` ('20칸 보드 · 출발 보너스 ⭐+1 · 실패하면 같은 미션 한 번 더'), `RULES_HINT`.
- `missingNotices`: missing difficulties are joined with '·' in easy→normal→hard order, and an event notice is added when no event can be placed. It returns `[]` when ok=false or when nothing is missing.
- `estimateLine` ('⏱️ 약 N분') and `estimateBasis` ('N명|팀 × R라운드 기준').
- `tileGlyph` (🏁 / ⭐1-3 / ➡️N / ⬅️N / 🔁) and `tileAriaLabel` ('3번 칸, 보통 퀘스트 별 2개, 곰 토끼 있음'). Star counts come from `starsFor`.

### Task 2: display parts + CSS (TDD)
- `AnimalPicker`: `div.animal-pick[role=group]` with 8 `type="button"` buttons in ANIMALS order. Each button shows only the emoji, and its aria-label is the Korean name. `aria-pressed` marks the value. Animals in `taken` are disabled and labelled '{이름} — 다른 친구가 골랐어요'.
- `Scoreboard`: `ol.scoreboard[aria-label="별 순위"]` built with `rankByStars`, so ties share a rank (1등,1등,3등). Each pill contains `.rank/.animal/.name/.stars`, and the current turn gets `is-current`.
- `RingStrip`: `ol.ring-strip[aria-label="보드 칸"]` lists tiles in order 0→L−1. Each tile is `li.ring-tile.ring-tile--{start|easy|normal|hard|event}` with `.glyph` and `.tokens` (emojis in token order) and an aria-label from `tileAriaLabel`. The tile holding the current token gets `is-current`.
- `game.css`: new section "Phase 5 — 임시 화면 (Phase 6/8에서 교체)" covering every class listed in the plan. The only breakpoint is 560px (8→4 animal columns, 12px gutters). It has no hex literals, and `git diff` shows no removed lines.

## Verification
- `npx vitest run src/game/labels.test.ts`: 18/18 passed
- `npx vitest run src/game/hud/tempHud.test.tsx`: 12/12 passed
- `npx tsc -b && npx vitest run`: 34 files, 652 tests passed
- Acceptance greps: the notice string appears once, `Record<AnimalId, string>` appears 2 times, the engine has no emoji or Korean names, the components have no store imports or `dangerouslySetInnerHTML`, the Phase 5 CSS section has 0 hex values and exactly 1 `minmax(56px, 1fr)`, and the CSS diff removes 0 lines.

## Commits
| Task | Gate | Commit | Message |
|------|------|--------|---------|
| 1 | RED | 93c083b | test(05-04): add failing tests for UI labels helpers |
| 1 | GREEN | 4f9a201 | feat(05-04): implement UI labels helpers (labels.ts) |
| 2 | RED | c2b8de3 | test(05-04): add failing tests for AnimalPicker, Scoreboard, RingStrip |
| 2 | GREEN | 54b3c72 | feat(05-04): add AnimalPicker, Scoreboard, RingStrip and Phase 5 temp-screen CSS |

## Deviations from Plan

None. The plan was executed as written.

## Threat Mitigation
- T-05-13 (XSS): names and event names are rendered only as JSX text nodes or attribute values. Tests check that a '<b>x</b>' scoreboard name appears as literal text and that an event name in an aria-label creates no `<b>` element. A grep confirms there is no `dangerouslySetInnerHTML`.

## Known Stubs

None. The components are intentionally not mounted yet; 05-05 wires them into SetupView, PlayView and ResultView.

## TDD Gate Compliance
For both tasks a RED `test(...)` commit comes before the GREEN `feat(...)` commit. No refactor commits were needed.

## Self-Check: PASSED
