# 04-01 SUMMARY — Visual system + original 파워점핑 logo

## Context
Phase 3.1 completed the DOM/CSS 2D board and Kenney CC0 asset ingestion. Phase 4 starts with a narrow presentation-only slice: a candy/playful visual system and an original `파워점핑` wordmark that does not use real brands or copied franchise assets.

## Did
- Added `src/components/PowerJumpingLogo.tsx` with `hero` and `compact` variants.
- Replaced the old text/emoji header branding with the original CSS wordmark.
- Updated `Header` to show the correct context for the active top-level view:
  - Game: `게임` / `카드 미션을 성공하고 결승까지 점프해요`
  - Editor: `콘텐츠 편집기` / `줄넘기 미션과 이벤트 칸을 자유롭게 만들어요`
- Applied Phase 4 candy/playful styling to:
  - global app background, header, view switch, editor panel shell;
  - setup hero/card/buttons;
  - play stage/HUD/buttons/board shell;
  - result shell and compact logo.
- Preserved the Phase 3.1 board contract: DOM board remains readable, Kenney sprites remain in use, and engine/store/game rules were not changed.
- Added/updated tests for the Phase 4 logo and shell classes.

## Verification
- `npm run build` — passed.
- `npm test` — passed: 23 test files, 178 tests.
- Browser smoke at `http://127.0.0.1:5177/monster-jump-rope-game/` — passed:
  - Setup screen shows original logo and candy/playful treatment.
  - Header context shows `게임` in game mode instead of stale `콘텐츠 편집기`.
  - Started game; 2D board remained readable with START/FINISH, tile numbers, direction arrows, token labels, dice, card button, and rank strip visible.
  - Card draw → success → dice roll executed.
  - Dice icon loaded successfully and Player 1 advanced from 0칸 to 2칸 in the smoke run.
  - Broken images: 0.

## Honest notes
- This slice is visual-system groundwork only; character pose/expression switching is intentionally deferred to 04-02.
- Visual browser smoke was run on the default desktop viewport, not a physical tablet/iPhone.
- No commit was made by Codex; Hermes reviewed, fixed one header-context issue, verified, and committed separately.

## Follow-up
- 04-02: switch Kenney poses by state (`walk0-3` during movement, `cheer0/1` for success, `hurt` for failure).
- Tablet/mobile visual polish for classroom device sizes.
