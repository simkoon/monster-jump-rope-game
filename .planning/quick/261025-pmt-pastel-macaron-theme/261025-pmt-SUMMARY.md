---
phase: quick-261025-pmt
plan: 01
subsystem: ui-theme
tags: [theme, palette, css-tokens, 3d-palette, accessibility]
status: complete
requires: []
provides:
  - "Pastel macaron light-theme CSS tokens (src/styles/index.css)"
  - "--on-accent (#26385A) token for text on pastel accent fills, both themes"
  - "Macaron 3D palette in src/game/palette.ts, same hexes as the CSS tokens"
affects: [HUD-01, BOARD-03, CHAR-01]
tech-stack:
  added: []
  patterns:
    - "Text on any accent/difficulty fill = var(--on-accent), defined once in the bare :root and shared by the dark theme"
key-files:
  created: []
  modified:
    - src/styles/index.css
    - src/game/styles/game.css
    - src/components/EventCard.tsx
    - src/game/palette.ts
    - src/game/palette.test.ts
    - src/game/scene/chibi.test.tsx
    - src/game/scene/fx.test.tsx
    - src/game/scene/chibiFaces.ts
decisions:
  - "Text on pastel accents uses --on-accent (#26385A) in both themes; it is not overridden in the dark theme"
  - "The dog gets ink eyes and ink brows; only the panda keeps white sclera / line eyes"
  - "bear, dog and panda are the three animal colors not taken from a CSS token (5 of 8 are token-pinned)"
metrics:
  duration: "~25 min"
  completed: 2026-10-25
  tasks: 3
  files: 8
---

# Quick 261025-pmt Plan 01: Pastel Macaron Theme Summary

The candy-pop light palette is now the pastel "macaron" palette in both the CSS tokens and the 3D `palette.ts`, using the same hexes in both places. Text on pastel fills is now dark navy `--on-accent` (#26385A) in both themes, and the dog reads with ink eyes and brows.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CSS macaron tokens + `--on-accent` + text on accents | caeacbe | src/styles/index.css, src/game/styles/game.css, src/components/EventCard.tsx |
| 2 (RED) | Tests pinned to macaron values | ce43f58 | src/game/palette.test.ts, src/game/scene/chibi.test.tsx, src/game/scene/fx.test.tsx |
| 2 (GREEN) | 3D palette.ts macaron values + ink dog brows | b1b294c | src/game/palette.ts, src/game/scene/chibiFaces.ts |
| 3 | Full verification | (no code change) | — |

## Token changes

- **CSS (CONTEXT section 1):** every token in the section 1 table now has its new value in the bare `:root` block and in `:root[data-theme="light"]`. The `prefers-color-scheme: dark` and `[data-theme="dark"]` blocks are unchanged (`--ink:#EAF5FF` still appears twice). Light `--shadow` / `--shadow-sm` and the logo word and rope tints use `rgba(74,159,216,…)` with the same alphas.
- **`--on-accent:#26385A`:** declared once, on the `--ink` line of the bare `:root`.
- **3D (CONTEXT section 4):** every ANIMAL_COLOR, ANIMAL_EYE, DIFF_COLOR, EVENT_COLOR, SCENE_COLOR, CHAR_COLOR and FX_COLOR value uses the section 4 value. `LIGHTS.hemi.ground` is now `#DCE8F5`. The FX_COLOR list structure and slot order did not change. `palette.ts` still has no React or three imports.
- **Text on accents → `var(--on-accent)`:** index.css `.pj-logo__context/.pj-logo__subtitle`, `.tab.active .cnt`, `.view-switch .tab.active`, `.badge`, `.add`, `.chip.on`, `.mini:hover`, `.seg button.sel`, `.catchip.on`, `.cat-mini.del:hover`, `.btn-primary`, `.toast.err`. game.css `.game-btn` (the `--success`/`--danger` variants inherit it), `.game-diff-badge` (including `.normal`), `.game-event-chip`. The dark "lift" text-shadow is now `none` on the logo pill, `.view-switch .tab.active`, `.add`, `.btn-primary` and `.game-btn`.
- **Nomination panel:** uses `var(--line)`, `var(--panel-2)`, `var(--ink)` and `var(--sky)` instead of the hard-coded blues.

## Discretion items

1. **Old `--sky` rgba tints:** index.css `.game-btn` box-shadow (Phase 4.1 block) and game.css `.game-turn-pill` box-shadow now use `rgba(110,195,238,…)` (= new `--sky`) with the same alphas.
2. **Toss-blue tab gradient:** the Phase 4.1 `.view-switch .tab.active` gradient is now `linear-gradient(180deg, var(--sky), var(--sky-deep))` and its shadow is `0 12px 28px rgba(74,159,216,.22)`.
3. **`.game-setup, .game-result` radial tint:** now `rgba(110,195,238,.12)`.
4. **`.catadd button` (sun fill) and `.toast.ok` (grass fill):** their hard-coded dark text colors now use `var(--on-accent)`.
5. **EventCard label pill (coral/grape):** the inline text color is now `'var(--on-accent)'`.
6. **Nomination buttons:** `background: white` is now `var(--panel)`. Without this the buttons stayed white while showing the light dark-theme `--ink` text.
7. **Dog brows:** the dog-only white brow branch in `browParts` is removed, so every animal has INK brows. The chibiFaces header comment now says only the panda gets sclera and white line eyes.
8. **chibi.test helper literals:** the bear literal is now `#C49A78`, with the expected sRGB→linear value changed to 0.552 (confirmed by the run). The ink literal (3 places) is now `#26385A` and the scene-shadow literal is now `#2E4466`. The two sclera test names now say panda only.
9. **New test:** `--on-accent` must equal `SCENE_COLOR.outline` and be declared exactly once in index.css.

## Where white is kept

| File | Location | Why kept |
|------|----------|----------|
| src/styles/index.css | `--panel:#FFFFFF` (bare root + light block) | It is the panel surface token, and section 1 keeps its value. |
| src/styles/index.css | `--logo-stroke:#FFFFFF` (bare root + light block) | Logo outline stroke. The plan says to keep it. |
| src/styles/index.css | `.pj-logo__word` gradient `#FFFFFF 0 14%` | Gloss highlight at the top of the logo letters. It is not text on an accent. |
| src/styles/index.css | `body` gradients `color-mix(…, #fff)` (2 places) | Tints the page background. It is not text. |
| src/styles/index.css | `.add` / `.btn-primary` gradient `color-mix(in srgb, var(--sky) 80%, #fff)` | Light top stop of the button fill. It is not text. |
| src/styles/index.css | `--toy-edge` and gloss `rgba(255,255,255,…)` values | Edge and gloss highlights. They are not text. |
| src/game/styles/game.css | `.game-btn`, `--success`, `--danger` gradients `#fff 0 6%` + `color-mix(…, #fff)` | Top gloss stop and fill tint. It is not text. |
| src/game/styles/game.css | `.game-btn::after` `rgba(255,255,255,.42)` | Gloss bar. |
| src/game/styles/game.css | `.fx-star-shine { fill: white }` | SVG star highlight. It is not text. |
| src/game/scene/FxPools.tsx | `MeshBasicMaterial({ color: '#FFFFFF' })` (4 places) | Neutral base colors that the per-instance colors multiply. They are not text, and this file is outside the plan. |
| src/game/palette.ts | `#FFFFFF` values (rabbit, panda eye, gatePillar, chevron, pathDot, white, FX panel slots) | All are section 4 locked values (`= --panel`). |

`.overlay` stays a dark rgba backdrop and is unchanged.

## Verification

- `npx tsc -b`: exit 0.
- `npm run build`: succeeds. The only output besides the build is Vite's existing warning about chunks over 500 kB.
- Repo-wide sweep for old-palette hexes under `src`: 0 files.
- Task 1 grep gates pass. ceremony.test, hud6.test and starFlight.test: 90/90 pass. ceremony.test "no hex literal, no coral" failed before this task and passes now.
- Task 2 gates pass. palette.test, chibi.test and fx.test: 54/54 pass. RED was confirmed first: 17 tests failed against the old palette.ts.
- **Full vitest:** 84 test files, 1568 tests. 1567 passed and 1 failed:
  - `src/game/soak.test.tsx > STAB-01: 5 games in a row (jsdom) > keeps timers, queue, subscriptions, listeners, DOM, audio nodes and the canvas constant over 5 games`, with `Error: game 1 did not reach the ceremony (0 clicks, 201 idle steps)`.
  - **This failure was already there before this task and is out of scope.** It also fails on a clean checkout of `aeb19db`, the commit before this task (checked in a temporary git worktree, since removed). The cause is the teacher-nomination flow from aeb19db, not colors. It was not fixed or skipped.
  - Note: my first baseline full-suite run overlapped the Task 1 edits, so its log is contaminated and not used. The clean-checkout run above is the evidence that the soak failure was already there.

## Deviations from Plan

None beyond the discretion items listed above, all of which the plan already anticipated. No Rule 1-4 deviations.

## Out of scope / notes

- `public/assets/cc0/character-*.svg` still contain old-palette hexes. Nothing in `src` references them, so they were left unchanged.
- STATE.md and ROADMAP.md were not changed. The orchestrator handles the docs commit.

## Human UAT (end-of-phase, non-blocking)

1. **Text contrast on accent buttons (light theme, `npm run dev`):** check the editor tabs, the `.tab.active .cnt` count, badges, chips, the "추가" button, primary buttons, toasts, the logo subtitle pill and the event label pills. Dark navy text on the pastel fills should be readable, and nothing should look washed out.
2. **Dark theme (`data-theme="dark"`):** pastel accent fills should still show dark navy `--on-accent` text. The nomination panel and its buttons should be readable.
3. **3D lighting washout of pastel colors:** on the game screen, check the board, the easy/normal/hard tiles (they must be distinguishable), the dice, the start gate, the confetti and the podium. They should still look pastel under the toy lighting (hemi intensity 1.4, key 1.6) and not wash out toward white. Rabbit/white and chick/sun pastels are the most likely to wash out.
4. **Characters:** all 8 chibi animals should be distinct. The dog should have ink eyes and ink brows on its pastel blue head. The panda should keep its white eyes on the ink patches.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/styles/index.css, src/game/styles/game.css, src/components/EventCard.tsx, src/game/palette.ts, src/game/palette.test.ts, src/game/scene/chibi.test.tsx, src/game/scene/fx.test.tsx, src/game/scene/chibiFaces.ts
- FOUND commits: caeacbe, ce43f58, b1b294c
