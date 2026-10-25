# Quick Task 261025-pmt: 테마 색상을 파스텔 마카롱 팔레트로 교체 - Context

**Gathered:** 2026-10-25
**Status:** Ready for planning

<domain>
## Task Boundary

Replace the light-theme candy-pop palette with the user-approved pastel "마카롱" (macaron) palette, in both the DOM UI (CSS tokens) and the 3D scene (`src/game/palette.ts`), keeping the two in sync and the tests green. The user picked palette "파스텔 B 마카롱" from a swatch page; its values are locked below.

Out of scope: dark-theme surface tokens (`--bg`, `--panel`, `--ink`, ... inside the `prefers-color-scheme: dark` and `[data-theme="dark"]` blocks) stay as they are. Layout, sizes, fonts, animation: unchanged.

</domain>

<decisions>
## Implementation Decisions (locked)

### 1. CSS tokens — `src/styles/index.css`
Change these values in the bare `:root` block AND in the `:root[data-theme="light"]` block (wherever the token appears in a light block). Dark blocks untouched.

| token | old | new |
|---|---|---|
| --sky | #22B0F2 | #6EC3EE |
| --sky-deep | #1183D6 | #4A9FD8 |
| --sun | #FFCB2E | #FFD966 |
| --sun-deep | #FF9F1C | #FFB86B |
| --coral | #FF5C7A | #FF8A9B |
| --pink | #FF80B5 | #FFA6C9 |
| --grass | #25D6A0 | #6FD6B0 |
| --grape | #9A7DFF | #B49CFF |
| --easy | #25D6A0 | #6FD6B0 |
| --normal | #FFB020 | #FFCB6B |
| --hard | #FF5C7A | #FF8A9B |
| --bg | #E7F5FF | #EEF6FF |
| --bg-2 | #FFF3E6 | #FFF4EC |
| --panel | #FFFFFF | #FFFFFF (same) |
| --panel-2 | #EFF8FF | #F3F8FF |
| --ink | #173A57 | #26385A |
| --ink-soft | #6488A5 | #687D9F |
| --line | #D8EAF8 | #DDE8F5 |
| --candy-cream | #FFFDF4 | #FFFCF4 |
| --candy-mint | #DDFCED | #E2F7EE |
| --candy-rose | #FFE2EF | #FFEAF2 |
| --logo-drop | #0F6FD1 | #6E8FD8 |

Light `--shadow` / `--shadow-sm` and any other light-theme `rgba(17,131,214,…)` / `rgba(15,111,209,…)` blue shadow tints → `rgba(74,159,216,…)` (same alpha).

### 2. New token `--on-accent: #26385A`
Add `--on-accent:#26385A;` to the bare `:root` block only (NOT overridden in dark — the accent hexes are shared across themes, so text on a pastel accent must be dark in both themes).

### 3. White text on accents → `var(--on-accent)`
White text on pastel fails contrast. In `src/styles/index.css` and `src/game/styles/game.css`, every `color:#fff` / `color: #fff` / `color: white` / `color:#FFFFFF` whose background is an accent or difficulty color (sky, sky-deep, sun, coral, pink, grass, grape, easy, normal, hard, or a gradient of them — e.g. `.badge`, `.chip.on`, `.btn-primary`, `.tab.active .cnt`, `.game-btn` variants, logo subtitle pill, event/effect pills) becomes `color: var(--on-accent)`. Dark `text-shadow` meant to lift white text off a bright fill on those same elements is removed (set to `none` or deleted). Keep `#fff` where the background is NOT a pastel accent (e.g. the white gloss stop at the top of a gradient, a dark overlay, a `-webkit-text-stroke` outline, a `--logo-stroke` usage). Judge each occurrence by the element's actual background; when unsure, leave it and list it in the SUMMARY.
`.game-diff-badge.normal { color: #5a3a00; }` → `var(--on-accent)`. The hard-coded `.nomination-panel` / `.nomination-choices` blues in game.css (#c9dcff, #f2f7ff, #18335a, #8caee5) → `var(--line)`, `var(--panel-2)`, `var(--ink)`, `var(--sky)` respectively.

### 4. 3D palette — `src/game/palette.ts`
ANIMAL_COLOR: bear #C49A78 (new), rabbit #FFFFFF (= --panel), cat #B49CFF (= --grape), dog #7DB4E6 (NEW — no longer = --sky-deep), panda #3E4C6E (NEW — no longer = --ink), fox #FFB86B (= --sun-deep), pig #FFA6C9 (= --pink), chick #FFD966 (= --sun).
→ token-pinned animals become 5 of 8 (rabbit, cat, fox, pig, chick); bear, dog, panda are the new non-token hexes. Update the file's header comment accordingly.

ANIMAL_EYE: every '#173A57' → '#26385A'; dog → '#26385A' (was white — pastel blue body hides a white eye); panda stays '#FFFFFF'. Update the comment: white eyes are now panda only.

DIFF_COLOR: easy #6FD6B0, normal #FFCB6B, hard #FF8A9B.

EVENT_COLOR: pad #B49CFF, top #FFFCF4, forward #6FD6B0, backward #FF8A9B, extra #B49CFF.

SCENE_COLOR: baseSide #D4EEFC, track #FFFCF4, yard #E2F7EE, start #FFD966, startEmissive #FFB86B, gatePillar #FFFFFF, gateArch #FF8A9B, gateFlag #6EC3EE, gateStar #FFD966, tileStar #FFD966, starEmissive #FFB86B, chevron #FFFFFF, outline #26385A, crown #FFD966, turnRing #6EC3EE, preview #6EC3EE, pathDot #FFFFFF, diceBody #FFFCF4, dicePip #26385A, shadow #2E4466.

CHAR_COLOR: ink #26385A, white #FFFFFF, cheek #FFC2DA, cheekPig #FF8A9B (= --coral), mouth #D9566E, tongue #FFA6C9 (= --pink), sweat #A8DDF7, sparkle #FFD966 (= --sun), bearMuzzle #EAD3BC, dogMuzzle #F3F8FF (= --panel-2), dogEar #4F8CC4, pigNose #F08AB4, cream #FFFCF4, beak #FFB86B (= --sun-deep), feather #FFCB6B (= --normal).

FX_COLOR: same structure, each old token hex replaced by its new token hex (sun #FFD966, pink #FFA6C9, grass #6FD6B0, grape #B49CFF, normal #FFCB6B, sun-deep #FFB86B, panel #FFFFFF); puff #DDE8F5 (= --line); podiumGround #E2F7EE (= --candy-mint).

LIGHTS: hemi.ground #CFE4F5 → #DCE8F5. Everything else in LIGHTS unchanged.

### 5. Tests
Update hex expectations in `src/game/palette.test.ts`, `src/game/scene/chibi.test.tsx`, `src/game/scene/fx.test.tsx` to the new values. Adjust structural assertions that encode the old design: the "7 of 8 animals reuse tokens" test becomes "5 of 8" (rabbit, cat, fox, pig, chick) with bear/dog/panda asserted absent from index.css; the ANIMAL_EYE test becomes "white on panda only, ink elsewhere". Keep every other invariant (pairwise-distinct animal colors, FX/CHAR token pins). Do not weaken tests beyond what the palette change requires.

### Claude's Discretion
- Exact wording of updated code comments (keep comment density like the surrounding code).
- Any additional light-theme hard-coded blue/candy hex in CSS that clearly belongs to the old palette may be mapped to the nearest new token; list each in SUMMARY.

</decisions>

<specifics>
## Specific Ideas

Swatch the user approved (reference only, values above are authoritative): `/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/a83204fa-82da-45cb-ab23-b38fd505d429/scratchpad/pastel-swatch.html` (object `P.macaron`).

Verification: `npx vitest run` all green, `npx tsc -b` (or the project's typecheck script) clean, `npm run build` succeeds. Visual check (3D lighting washing out pastel, text contrast) is a human UAT item — note it in SUMMARY, do not block on it.

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

</canonical_refs>
