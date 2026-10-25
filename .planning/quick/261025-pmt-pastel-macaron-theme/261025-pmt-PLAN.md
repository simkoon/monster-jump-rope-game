---
phase: quick-261025-pmt
plan: 01
type: execute
wave: 1
depends_on: []
quick: true
files_modified:
  - src/styles/index.css
  - src/game/styles/game.css
  - src/components/EventCard.tsx
  - src/game/palette.ts
  - src/game/palette.test.ts
  - src/game/scene/chibi.test.tsx
  - src/game/scene/fx.test.tsx
  - src/game/scene/chibiFaces.ts
autonomous: true
requirements: [HUD-01, BOARD-03, CHAR-01]
user_setup: []

must_haves:
  truths:
    - "라이트 테마의 모든 DOM 색 토큰(--sky … --logo-drop)이 CONTEXT §1 마카롱 값으로 바뀌고, 다크 테마 표면 토큰은 한 글자도 바뀌지 않는다 (D-01)."
    - "파스텔 강조색(sky/sun/coral/pink/grass/grape/easy/normal/hard) 위의 글자는 두 테마 모두 진한 남색 --on-accent(#26385A)로 보이고, 흰 글자를 띄우던 어두운 text-shadow는 없다 (D-02, D-03)."
    - "3D 보드·말·주사위·이펙트 색(palette.ts)이 새 CSS 토큰과 같은 hex를 쓰며, palette.test 의 토큰 고정 테스트가 통과한다 — 점수판 점과 보드 말 색이 어긋나지 않는다 (D-04, D-05, HUD-01)."
    - "난이도 칸 색(쉬움/보통/어려움)이 3D 타일과 편집기 배지에서 같은 새 색으로 서로 구분된다 (BOARD-03)."
    - "강아지는 파스텔 파랑 몸에서 잉크색 눈(흰자 없음)과 잉크색 눈썹으로 읽히고, 판다만 흰 눈을 유지한다; 8마리 동물 색은 서로 모두 다르다 (D-04, CHAR-01)."
    - "추천(nomination) 패널은 하드코딩 파랑 대신 테마 토큰을 써서 다크 테마에서도 읽힌다 (D-03)."
    - "전체 vitest 에서 실패는 기존(작업 전)부터 실패하던 soak STAB-01 하나뿐이고, tsc -b 와 npm run build 가 성공한다."
  artifacts:
    - path: src/styles/index.css
      provides: "마카롱 라이트 토큰 + --on-accent 토큰"
      contains: "--on-accent:#26385A"
    - path: src/game/palette.ts
      provides: "3D 단일 hex 소스(마카롱)"
      contains: "#C49A78"
    - path: src/game/palette.test.ts
      provides: "5/8 동물 토큰 고정 + 판다 전용 흰 눈 + --on-accent 고정"
      contains: "5 of 8"
  key_links:
    - from: src/game/palette.test.ts
      to: src/styles/index.css
      via: "token(name) = 파일에서 처음 나오는 `--name:#HEX` (맨 위 bare :root 블록)"
      pattern: "--sky:#6EC3EE"
    - from: src/game/scene/chibiFaces.ts
      to: src/game/palette.ts
      via: "흰자 눈 여부 = ANIMAL_EYE[animal] === CHAR_COLOR.white — dog 눈을 잉크로 바꾸면 dog 흰자가 자동으로 사라진다"
      pattern: "ANIMAL_EYE\\[animal\\] === WHITE"
    - from: src/game/hud/ceremony.test.tsx
      to: src/game/styles/game.css
      via: "'Phase 8: ceremony (08-10)' 표시부터 파일 끝까지는 hex 리터럴 0개·--coral 0개여야 한다 — nomination 규칙이 이 범위 안에 있다"
      pattern: "nomination-panel"
---

<objective>
라이트 테마의 캔디팝 팔레트를 사용자가 승인한 파스텔 "마카롱" 팔레트로 교체한다. DOM(CSS 토큰)과 3D(`src/game/palette.ts`)를 같은 hex로 맞추고, 파스텔 위 흰 글자는 진한 남색 `--on-accent`로 바꾸며, 테스트를 새 값에 맞춘다.

CONTEXT.md 의 잠긴 결정 섹션 1–5 를 이 계획에서는 D-01..D-05 로 인용한다:
D-01 = §1 CSS 토큰, D-02 = §2 `--on-accent`, D-03 = §3 흰 글자 → `var(--on-accent)` + nomination 토큰화, D-04 = §4 3D palette.ts, D-05 = §5 테스트.
hex 값의 유일한 출처는 CONTEXT.md 표/목록이다 — 이 계획은 값을 다시 적지 않은 곳에서는 CONTEXT 를 그대로 따른다.

Purpose: 파스텔 테마로 아이 대상 UI 를 더 부드럽고 귀엽게 만들되(메모리: cuter art direction), DOM 점수판과 3D 말 색이 계속 한 소스에서 나오게 유지한다.
Output: 수정된 CSS 2개 + EventCard.tsx + palette.ts + chibiFaces.ts + 테스트 3개, 그리고 SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./.claude/CLAUDE.md
@.planning/quick/261025-pmt-pastel-macaron-theme/261025-pmt-CONTEXT.md
@src/styles/index.css
@src/game/styles/game.css
@src/game/palette.ts
@src/game/palette.test.ts

<interfaces>
<!-- Facts gathered during planning (2026-10-25). Executor does not need to re-discover these. -->

palette.test.ts `token(name)`: regex `--${name}\s*:\s*(#[0-9A-Fa-f]{6})` on the raw index.css, FIRST match wins.
So the bare `:root` block (top of index.css) must hold the new values. `--panel` does not match `--modern-panel`, `--ink` does not match `--ink-soft`.
FX test `cssHexes` = every 6-digit hex anywhere in index.css; every FX_COLOR value must exist there.

chibiFaces.ts: `eyesParts` uses `const sclera = ANIMAL_EYE[animal] === WHITE;` and `lineHex = ANIMAL_EYE[animal]`.
`browParts` hard-codes a dog-only white brow branch (line ~214). The file header comment (lines 9-10) says dog and panda get sclera eyes and white line eyes.

chibi.test.tsx: lines ~244 and ~260 have test names that say dog and panda get sclera / white line eyes; the logic is data-driven
(branches on `ANIMAL_EYE[a] === CHAR_COLOR.white`), so after the dog eye change the dog goes through the ink-eye branch automatically.
Lines ~45-117 are pure helper tests (part/hull/bake) that pass arbitrary hex literals in and compare against the same literal;
line ~51 pins the sRGB→linear value of the bear red channel to 3 decimals.

fx.test.tsx lines ~202 and ~219: literal sun-deep hex checks on confetti colors.

game.css ceremony test slice: from the marker 'Phase 8: ceremony (08-10)' (line ~1237) to EOF — must contain no `#hex` and no `--coral`.
The nomination rules (line ~1612-1617) sit inside that slice. Baseline: this test FAILS today because of the nomination hexes; D-03 fixes it.

Baseline full suite (2026-10-25, before any change): 2 failures —
  1. src/game/hud/ceremony.test.tsx "no hex literal, no coral" (fixed by Task 1),
  2. src/game/soak.test.tsx STAB-01 "game 1 did not reach the ceremony (0 clicks, 201 idle steps)" — pre-existing, caused by the
     teacher-nomination flow from commit aeb19db, unrelated to colors. OUT OF SCOPE: do not fix, record in SUMMARY.
Baseline `npx tsc -b`: exit 0.

Hard-coded white text on accents found during planning:
  index.css — .pj-logo__context/.pj-logo__subtitle, .tab.active .cnt, .view-switch .tab.active, .badge, .add, .chip.on, .mini:hover,
              .seg button.sel, .catchip.on, .cat-mini.del:hover, .btn-primary, .toast.err
  game.css  — .game-btn (inherited by --success / --danger), .game-diff-badge, .game-event-chip
  src/components/EventCard.tsx line ~31 — inline style on the event label pill (coral/grape background)
Every one of these sits on an accent/difficulty fill; no white text in the dark-overlay sense was found in these files.

public/assets/cc0/character-*.svg contain old-palette hexes but are NOT referenced anywhere in src — out of scope, leave.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: CSS 마카롱 토큰 + --on-accent + 강조색 위 글자 교체 (index.css, game.css, EventCard.tsx)</name>
  <files>src/styles/index.css, src/game/styles/game.css, src/components/EventCard.tsx</files>
  <read_first>
    - .planning/quick/261025-pmt-pastel-macaron-theme/261025-pmt-CONTEXT.md (§1 table = every new value, §2, §3)
    - src/styles/index.css (whole file, 560 lines)
    - src/game/styles/game.css lines 60-215 and 1605-1621 only (grep for anything else)
    - src/components/EventCard.tsx lines 20-40
  </read_first>
  <action>
    A. Tokens (per D-01). In src/styles/index.css set every token in the CONTEXT §1 table to its "new" value, in the bare `:root` block (lines 6-21) AND in the `:root[data-theme="light"]` block (lines 33-41) wherever the token appears there. The accent and difficulty tokens (--sky … --hard) exist only in the bare `:root`. Do NOT touch the `@media (prefers-color-scheme: dark)` block or the `:root[data-theme="dark"]` blocks (lines 22-32, 42-50, 380-386). The bare-root comment "산뜻한 일본 캔디팝 팔레트" becomes a short comment naming the pastel macaron palette.

    B. Blue shadow tints (per D-01). Every rgba() tint in index.css and game.css built from the old sky-deep or old logo-drop RGB triplet (they are the first two triplets in this task's verify grep) becomes `rgba(74,159,216,<same alpha>)` — this covers --shadow / --shadow-sm in both light blocks plus the logo word text-shadow, the rope shadows, `.tab.active`, `.view-switch .tab`. Discretion (list in SUMMARY): the rgba tints built from the OLD --sky triplet (`.game-btn` box-shadow in index.css Phase 4.1 block, `.game-turn-pill` in game.css) become `rgba(110,195,238,<same alpha>)` (= new --sky #6EC3EE), and the Toss-blue radial tint in `.game-setup, .game-result` becomes `rgba(110,195,238,.12)`.

    C. New token (per D-02). Add `--on-accent:#26385A;` to the bare `:root` block only (e.g. on the --ink line). It must appear exactly once in the file — never in a dark block.

    D. Text on accents (per D-03). In index.css and game.css, every white text color declaration on an accent/difficulty fill becomes `color:var(--on-accent)` (match the file's spacing style: index.css packs `color:var(--on-accent)`, game.css writes `color: var(--on-accent)`). The full list of rules is in <interfaces>. On those same rules remove the small dark "lift" text-shadow (`.pj-logo__context/.pj-logo__subtitle`, `.view-switch .tab.active` first rule, `.add`, `.btn-primary` in index.css; `.game-btn` in game.css) — set it to `none` (keep `.pj-logo--compact .pj-logo__subtitle`'s existing `text-shadow:none`). In game.css `.game-diff-badge.normal` replace its dark-brown text color with `var(--on-accent)`. KEEP white where the background is not a pastel accent: the `#FFFFFF 0 14%` gloss stop in `.pj-logo__word`, every `#fff 0 6%` gloss stop and every `color-mix(…, #fff)` / `color-mix(…, #000)` stop in gradients, `--logo-stroke`, `-webkit-text-stroke`, the `.game-btn::after` gloss bar, `.overlay` dark backdrop. Leave `.pj-logo__word`'s logo-drop text-shadow (it is the 3D logo drop, not a lift). Do not write comments that quote any old hex or old rgba value.

    E. Discretion items, all per D-03's "text on accent = --on-accent" rule — list each in SUMMARY:
       - index.css `.catadd button` (sun fill) and `.toast.ok` (grass fill) hard-code dark text colors → `var(--on-accent)` (same pattern as the locked `.game-diff-badge.normal` change).
       - index.css Phase 4.1 override `.view-switch .tab.active` (line ~447) hard-codes a saturated Toss-blue gradient that would clash with the pastel theme and sits under the now-dark tab text: background → `linear-gradient(180deg, var(--sky), var(--sky-deep))`, box-shadow → `0 12px 28px rgba(74,159,216,.22)`.
       - src/components/EventCard.tsx label pill inline style (coral or grape background): the inline white text color → `'var(--on-accent)'`.

    F. Nomination block (per D-03). In game.css `.nomination-panel` border color → `var(--line)`, background → `var(--panel-2)`, text color → `var(--ink)`; `.nomination-choices button` text color → `var(--ink)`, border color → `var(--sky)`. Discretion (list in SUMMARY): its `background: white` → `var(--panel)`, otherwise the button would be white with light --ink text in the dark theme. Do not add any hex literal or any `--coral` reference anywhere from the 'Phase 8: ceremony (08-10)' marker to the end of game.css (ceremony.test pins that slice).

    Layout, sizes, fonts and animation stay unchanged. palette.test.ts WILL fail after this task until Task 2 updates palette.ts — that is expected; do not run it as this task's gate.

    Commit: stage ONLY `src/styles/index.css src/game/styles/game.css src/components/EventCard.tsx` by explicit path (never `git add -A` / `git add .`; never stage .planning/config.json or .planning/phases/08-success-fx-awards/uat-manual/).
  </action>
  <verify>
    <automated>cd /Users/simkoon/workplace/jump_island && test "$(grep -c -- '--on-accent:' src/styles/index.css)" = 1 && test "$(grep -c -- '--on-accent:#26385A' src/styles/index.css)" = 1 && test "$(grep -c -- '--sky:#6EC3EE' src/styles/index.css)" = 1 && test "$(grep -c -- '--ink:#26385A' src/styles/index.css)" = 2 && test "$(grep -c -- '--logo-drop:#6E8FD8' src/styles/index.css)" = 2 && test "$(grep -c -- '--ink:#EAF5FF' src/styles/index.css)" = 2 && test "$(grep -o 'var(--on-accent)' src/styles/index.css | wc -l)" -ge 14 && test "$(grep -o 'var(--on-accent)' src/game/styles/game.css | wc -l)" -ge 4 && test "$(cat src/styles/index.css src/game/styles/game.css | grep -ciE '(^|[ ;{])color: ?#fff')" = 0 && test "$(cat src/styles/index.css src/game/styles/game.css | grep -cE 'text-shadow: ?0 1px 0 rgba')" = 0 && test "$(cat src/styles/index.css src/game/styles/game.css | grep -cE 'rgba\((17, ?131, ?214|15, ?111, ?209|34, ?176, ?242|49, ?130, ?246)')" = 0 && test "$(grep -ciE '#(22B0F2|1183D6|FFCB2E|FF9F1C|FF5C7A|FF80B5|25D6A0|9A7DFF|FFB020|E7F5FF|FFF3E6|EFF8FF|173A57|6488A5|D8EAF8|FFFDF4|DDFCED|FFE2EF|0F6FD1|3182F6|1C64F2)' src/styles/index.css)" = 0 && test "$(grep -cE '#[0-9a-fA-F]{6}\b' src/game/styles/game.css)" = 0 && test "$(grep -ciE "color: *'#fff" src/components/EventCard.tsx)" = 0 && npx vitest run src/game/hud/ceremony.test.tsx src/game/hud/hud6.test.tsx src/game/hud/starFlight.test.tsx</automated>
  </verify>
  <done>
    All CONTEXT §1 light values are in the bare `:root` and the light block; dark blocks unchanged (`--ink:#EAF5FF` still appears exactly twice). `--on-accent:#26385A` defined exactly once. No white text declaration and no dark lift text-shadow remain in either CSS file; no old blue rgba triplet remains; game.css has zero 6-digit hex literals. ceremony.test (baseline-failing) now passes together with hud6 and starFlight CSS-block tests.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: 3D palette.ts 마카롱 값 + 테스트 갱신 + 강아지 눈썹 잉크 (palette.ts, palette.test.ts, chibi.test.tsx, fx.test.tsx, chibiFaces.ts)</name>
  <files>src/game/palette.ts, src/game/palette.test.ts, src/game/scene/chibi.test.tsx, src/game/scene/fx.test.tsx, src/game/scene/chibiFaces.ts</files>
  <read_first>
    - .planning/quick/261025-pmt-pastel-macaron-theme/261025-pmt-CONTEXT.md (§4 every 3D value, §5 test rules)
    - src/game/palette.ts and src/game/palette.test.ts (whole files)
    - src/game/scene/chibi.test.tsx lines 40-120 and 240-265
    - src/game/scene/fx.test.tsx lines 190-222
    - src/game/scene/chibiFaces.ts lines 1-20 and 160-225
  </read_first>
  <behavior>
    - palette.test: DIFF_COLOR / ANIMAL_COLOR / CHAR_COLOR / EVENT_COLOR toEqual blocks and LIGHTS.hemi expect the CONTEXT §4 values (hemi ground #DCE8F5; key and rim unchanged).
    - palette.test: "reuses the light tokens for 5 of 8 animals" — rabbit=panel, cat=grape, fox=sun-deep, pig=pink, chick=sun; bear, dog and panda hexes are each absent from index.css (upper-cased contains check, same style as the old bear check).
    - palette.test: ANIMAL_EYE is '#FFFFFF' on panda only and '#26385A' on every other animal (test name says white on panda only).
    - palette.test (new small `it`, pins D-02): `token('on-accent')` equals `up(SCENE_COLOR.outline)` and the css contains exactly one `--on-accent:` declaration.
    - palette.test unchanged invariants still pass: 8 pairwise-distinct animal colors, CHAR_COLOR 9 shared-key pins, "adds only six new hexes" (cheek, mouth, sweat, bearMuzzle, dogEar, pigNose), SCENE_COLOR ≥ 20 hex values, every FX_COLOR test (they read tokens, so they follow index.css automatically).
    - chibi.test: the dog now takes the ink-eye branch ("eyes sit in the lower half") and panda alone takes the sclera branch; test names updated to say panda only.
    - fx.test: the ⭐3 confetti contains the new sun-deep hex '#FFB86B'; ⭐1 confetti never contains it.
  </behavior>
  <action>
    RED: update the tests first, run them, confirm palette.test fails against the old palette.ts, commit the tests.
    - src/game/palette.test.ts (per D-05): replace every expected hex with the CONTEXT §4 value. Rewrite the "7 of 8" test as the 5-of-8 test described in <behavior> (loop over bear, dog, panda for the absent-from-css check). Rewrite the ANIMAL_EYE test as panda-only white, ink '#26385A' elsewhere. Add the one `--on-accent` pin described in <behavior>. Update the file's header/inline comments that describe the old design. Do not loosen any other assertion.
    - src/game/scene/chibi.test.tsx (per D-05): rename the two test names (~244, ~260) so they say only the panda gets sclera / white line eyes. In the pure helper tests (~45-117) swap the old-palette literals for their macaron counterparts so the file carries no old-palette hex: bear literal → '#C49A78', ink literal (3 places) → '#26385A', old scene-shadow literal → '#2E4466'. The bear literal feeds the sRGB→linear check on line ~51: change the expected value to 0.552 and its comment to "linear, not 0xC4 / 255 = 0.77" — if the run shows a different value, use `new Color('#C49A78').r` rounded to 3 decimals (the line above already asserts closeness to lin.r at 6 digits, so this stays a real check).
    - src/game/scene/fx.test.tsx (per D-05): the two literal sun-deep hex checks (~202, ~219) → '#FFB86B'.

    GREEN: update source, run tests, commit.
    - src/game/palette.ts (per D-04): set every ANIMAL_COLOR, ANIMAL_EYE, DIFF_COLOR, EVENT_COLOR, SCENE_COLOR, CHAR_COLOR, FX_COLOR value and LIGHTS.hemi.ground to the CONTEXT §4 values (FX_COLOR keeps its exact list structure and slot order — only hexes change). Update comments: header line about palette.test pins says DIFF_COLOR and 5 of 8 ANIMAL_COLOR values; ANIMAL_COLOR inline comments mark bear, dog and panda as the three NEW non-token hexes (dog no longer = --sky-deep, panda no longer = --ink) and keep the token names on the other five; the ANIMAL_EYE comment says white line eyes / sclera are now the panda only (the pastel blue dog body hides a white eye); CHAR_COLOR inline comment for dogEar describes it as a shade of the new dog body instead of a --sky-deep shade; keep comment density like the surrounding code. Keep the PHASE 6 CONTRACT (no React/DOM/three imports).
    - src/game/scene/chibiFaces.ts — discretion consequence of D-04, list in SUMMARY: in `browParts` remove the dog-only white brow branch so every animal's brows use INK (white brows on the pastel blue dog head have the same contrast problem the user cited for the dog's white eye; panda brows were already ink). Update the header comment (lines 9-10) so it says only the panda (white ANIMAL_EYE) gets sclera eyes and white line eyes, to read on its ink eye patches. No other behavior change.

    Commit: stage only the five files of this task by explicit path (never `git add -A` / `git add .`).
  </action>
  <verify>
    <automated>cd /Users/simkoon/workplace/jump_island && npx vitest run src/game/palette.test.ts src/game/scene/chibi.test.tsx src/game/scene/fx.test.tsx && test "$(cat src/game/palette.ts src/game/palette.test.ts src/game/scene/chibi.test.tsx src/game/scene/fx.test.tsx | grep -ciE '#(9C6644|9A7DFF|1183D6|173A57|FF9F1C|FF80B5|FFCB2E|25D6A0|FFB020|FF5C7A|FFFDF4|BEE7FF|DDFCED|22B0F2|123A58|FF9EC4|C2304F|7FD3FF|E8C9A0|EFF8FF|0C5E9A|F0609E|D8EAF8|CFE4F5)')" = 0 && test "$(grep -c "dog: '#7DB4E6'" src/game/palette.ts)" = 1 && test "$(grep -c "panda: '#3E4C6E'" src/game/palette.ts)" = 1 && test "$(grep -c "bear: '#C49A78'" src/game/palette.ts)" = 1 && test "$(grep -c "ground: '#DCE8F5'" src/game/palette.ts)" = 1 && test "$(grep -c "animal === 'dog' ? WHITE" src/game/scene/chibiFaces.ts)" = 0 && test "$(grep -c '5 of 8' src/game/palette.test.ts)" -ge 1 && test "$(grep -cE "^import .*(react|three)" src/game/palette.ts)" = 0</automated>
  </verify>
  <done>
    palette.ts holds only CONTEXT §4 values (no old-palette hex left in palette.ts or the three test files); palette.test, chibi.test and fx.test pass; dog brows are ink and the dog has no white sclera; panda keeps white eyes; all pre-existing palette invariants still asserted; palette.ts still has no React/three import.
  </done>
</task>

<task type="auto">
  <name>Task 3: 전체 검증 — vitest 전체, tsc -b, build, 저장소 전역 구 hex 스윕</name>
  <files>src/styles/index.css, src/game/styles/game.css, src/components/EventCard.tsx, src/game/palette.ts, src/game/palette.test.ts, src/game/scene/chibi.test.tsx, src/game/scene/fx.test.tsx, src/game/scene/chibiFaces.ts</files>
  <action>
    Verification task: the files above are fix-only targets — touch one only if a check below fails because of Tasks 1-2. Run the full verification. Any failure caused by Tasks 1-2 gets fixed in the Task 1/2 files (same scope rules, same explicit-path staging). Expected full-suite result: every test passes EXCEPT the pre-existing src/game/soak.test.tsx STAB-01 failure ("game 1 did not reach the ceremony …"), which failed identically before this task (see <interfaces>) — do NOT fix or skip it; record it in SUMMARY as pre-existing/out of scope. If any OTHER test fails (e.g. face-occlusion / face-order tests reacting to the dog losing its sclera geometry), investigate: fix it only if the fix stays inside the palette change (e.g. a hard-coded expectation of dog sclera); if it would need behavior changes outside the files above, stop and report it in SUMMARY instead of widening scope.
    Run the repo-wide sweep: no old-palette hex may remain anywhere under src (public/assets/cc0/*.svg are unreferenced leftovers — out of scope, mention in SUMMARY).
    Write SUMMARY with: the per-token change list (point to CONTEXT §1/§4), every discretion item from Tasks 1-2 (rgba sky-triplet tints, Toss-blue tab gradient + game-setup tint, .catadd button / .toast.ok text, EventCard label text, nomination button background, dog ink brows, chibi.test helper literals, the added --on-accent test), any white occurrence deliberately kept, the pre-existing soak failure, and the human UAT items below.
  </action>
  <verify>
    <automated>cd /Users/simkoon/workplace/jump_island && LOG=/private/tmp/claude-501/-Users-simkoon-workplace-jump-island/a83204fa-82da-45cb-ab23-b38fd505d429/scratchpad/pmt-vitest.log && npx tsc -b && npm run build && test "$(grep -rliE '#(22B0F2|1183D6|FFCB2E|FF9F1C|FF5C7A|FF80B5|25D6A0|9A7DFF|FFB020|173A57|9C6644|123A58|FFFDF4|DDFCED|D8EAF8|EFF8FF|BEE7FF|CFE4F5|0F6FD1|E7F5FF|6488A5|3182F6)' src | wc -l | tr -d ' ')" = 0 && { npx vitest run > "$LOG" 2>&1; true; } && grep -E "Test Files|Tests " "$LOG" && test "$(grep -E '^ FAIL ' "$LOG" | grep -vc 'soak.test.tsx > STAB-01')" = 0</automated>
    <human-check>
      End-of-phase UAT (do not block on it; list in SUMMARY):
      1. `npm run dev`, light theme: editor tabs, badges, chips, "추가"/primary buttons, toasts, logo subtitle pill — text on pastel fills is dark navy and readable; nothing looks washed out.
      2. Dark theme (`data-theme="dark"`): the same pastel accent fills still show dark navy text; nomination panel and its buttons readable.
      3. Game screen: 3D board, tiles (easy/normal/hard distinguishable), dice, start gate and confetti read as pastel under the toy lighting (not washed out to white); all 8 chibi animals distinct; dog face has ink eyes and brows on the pastel blue head; panda keeps white eyes.
    </human-check>
  </verify>
  <done>
    `npx tsc -b` exit 0; `npm run build` succeeds; no old-palette hex anywhere under src; full vitest shows no failure other than the pre-existing soak STAB-01; SUMMARY written with discretion items, pre-existing failure and UAT items.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none new | Color-token and test-expectation change only. No new input, network, storage, or dependency surface. No package installs. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-pmt-01 | Tampering | git staging of the working tree | low | mitigate | Every commit stages explicit file paths only (never `git add -A` / `git add .`), so the unrelated .planning/config.json edit and .planning/phases/08-success-fx-awards/uat-manual/ stay out of these commits. |
| T-pmt-02 | Tampering | palette.test.ts sync invariants (DOM ↔ 3D color contract) | low | mitigate | Only the hex expectations and the two structural assertions named in D-05 change; distinctness, token pins, six-new-hex and FX tests stay; a new `--on-accent` pin is added rather than any assertion removed. |
| T-pmt-03 | Information disclosure | n/a | low | accept | No data handling changes; CSS/hex constants only. |
</threat_model>

<verification>
- Task 1 gate: CSS token/grep gates + ceremony/hud6/starFlight CSS-block tests green.
- Task 2 gate: palette/chibi/fx tests green + no old hex in palette.ts and its tests + dog brow branch removed.
- Task 3 gate: tsc -b, build, repo-wide old-hex sweep, full vitest with only the pre-existing soak STAB-01 failure.
</verification>

<success_criteria>
- Light theme DOM and 3D scene both use the macaron palette from CONTEXT §1/§4, kept in sync by passing palette.test token pins.
- Text on every pastel accent fill uses `--on-accent` (#26385A) in both themes; dark theme surfaces untouched.
- Dog reads with ink eyes and brows; panda alone keeps white eyes; 8 animal colors distinct.
- ceremony.test baseline failure resolved; no new failures; typecheck and build clean.
</success_criteria>

<output>
Create `.planning/quick/261025-pmt-pastel-macaron-theme/261025-pmt-SUMMARY.md` when done.
</output>
