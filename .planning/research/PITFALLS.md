# Pitfalls Research

**Domain:** 3D web board game (Three.js) for a jump-rope class, run by an instructor on a single laptop/tablet, with instructor-editable mission/event data (localStorage + JSON)
**Researched:** 2026-07-25
**Confidence:** HIGH (technical Three.js/data pitfalls are well-established engineering practice; child-UX and probability items are HIGH-MEDIUM)

## Critical Pitfalls

### Pitfall 1: GPU memory leak from never disposing Three.js geometries/materials/textures

**What goes wrong:**
Cards, dice, character tokens, and event popups are created and removed from the scene many times per game. Removing an object from the scene (`scene.remove(obj)`) does NOT free its GPU resources. Over a long class session (dozens of turns, multiple games back-to-back without page reload), GPU memory climbs until the tab slows to a crawl, WebGL context is lost, or the browser tab crashes — often mid-class on the instructor's tablet.

**Why it happens:**
JavaScript GC frees the JS object, but the WebGL buffers/shader programs behind each geometry, material, and texture are not automatically released — the app must explicitly call `.dispose()`. Developers test with a page reload between games (which resets everything) and never see the leak that only appears after 30+ minutes of continuous play.

**How to avoid:**
- Centralize object lifecycle: every card/dice/token/popup mesh goes through a factory that tracks it, and a matching teardown that calls `geometry.dispose()`, `material.dispose()`, and `texture.dispose()` (plus `texture.source.data.close?.()` for ImageBitmap/GLTF textures).
- Reuse instead of recreate: keep ONE dice mesh, ONE card mesh, and one token per player; animate/re-skin them rather than instantiating new meshes each turn. This sidesteps most disposal entirely.
- Never recreate `WebGLRenderer` on scene/route changes — reuse the single renderer for the whole app lifetime.
- On "new game" / "return to start", traverse the old scene and dispose everything obsolete before building the new one.

**Warning signs:**
- `renderer.info.memory.geometries` / `.textures` counts climb turn-over-turn instead of staying flat (log them each turn during dev).
- FPS degrades the longer a session runs but recovers after a page reload.
- Chrome task manager GPU-memory for the tab grows steadily.

**Phase to address:**
Foundation / render-architecture phase (establish the factory + dispose discipline before any repeated-spawn feature is built). Verify again in the card-draw and token-movement phases.

---

### Pitfall 2: Coupling game logic to the render loop (frame-rate-dependent game state)

**What goes wrong:**
Turn logic, dice results, movement steps, and event timing get driven directly inside `requestAnimationFrame` using per-frame counters or fixed frame counts (e.g., "advance token 1 step every 10 frames"). On a fast laptop the game runs at 60fps and feels right; on a modest classroom tablet at 30fps everything moves at half speed, animations desync, and turn transitions fire at the wrong time. Worse, game rules (who won, how far a token moved) become entangled with rendering, making them impossible to test without a canvas.

**Why it happens:**
Three.js tutorials put everything in the animation loop, so beginners fold game state there too. Frame-count timing "just works" on the dev machine.

**How to avoid:**
- Separate the two loops conceptually: a pure game-state module (turn order, dice value, board position, event resolution, win condition) that knows nothing about Three.js, and a render/animation layer that reads state and draws it.
- Drive all animation by elapsed time (delta seconds from a `Clock`), never by frame count.
- Keep the authoritative game state (positions, whose turn, scores) as plain JS data — the 3D scene is a *view* of that data, updated when it changes.

**Warning signs:**
- Animations or turn pacing feel different on the tablet vs. the dev laptop.
- You cannot answer "who is winning?" without inspecting the 3D scene.
- Game-rule bugs require clicking through the 3D UI to reproduce.

**Phase to address:**
Core game-loop phase — establish the state/render split at the very start; retrofitting it later is a rewrite.

---

### Pitfall 3: Losing instructor-edited mission/event data (the core value) via localStorage fragility

**What goes wrong:**
The instructor spends an evening building a custom mission set, then it silently vanishes: cleared by "clear browsing data," lost when they open the game on a different browser/device, wiped by Safari's 7-day eviction of unused site data, or corrupted by a mid-write crash. Because instructor-curated content IS the product's core value, this is a trust-destroying failure.

**Why it happens:**
Developers treat localStorage as durable storage. It is not — it is per-origin, per-browser, cleared by the user or the OS, capped at ~5MB, and can throw on write (quota exceeded / private mode). A single unguarded `JSON.parse(localStorage.getItem(...))` also throws on any corruption and can brick the whole app on load.

**How to avoid:**
- Treat localStorage as a cache, not the source of truth. Make JSON export the real "save," and actively nudge the instructor to export/back up after meaningful edits.
- Wrap every read in try/catch with a schema fallback; never let a bad parse crash startup. On corrupt data, fall back to defaults and warn rather than white-screen.
- Wrap every write in try/catch to handle `QuotaExceededError` and private-mode failures gracefully (tell the user, offer export).
- Autosave on edit (debounced), and keep a "last known good" copy so a failed write doesn't destroy the previous good state.
- Show the instructor clearly where their data lives and that it is device/browser-local.

**Warning signs:**
- Edits persist across reload on the dev machine, so it "looks fine" — but there is no test for corrupt/absent/oversized storage.
- No export prompt after editing; no visible "backed up" state.
- App throws on load when localStorage contains anything unexpected.

**Phase to address:**
Data-persistence phase. The read-guard/fallback belongs in the earliest phase that reads storage; the export-as-real-backup framing should shape the editor phase's UX.

---

### Pitfall 4: JSON import/export with no schema versioning or validation

**What goes wrong:**
v1 exports a mission JSON. Later the schema changes (new field, renamed difficulty, event probability format). An instructor imports an old file (or a colleague's file) and either the app crashes, silently drops fields, or loads malformed missions that break card draw or event resolution. Sharing files between instructors — an explicit goal — becomes a source of corruption.

**Why it happens:**
Export is just `JSON.stringify(state)` and import is just `JSON.parse` + assign, with no version tag and no validation. It works perfectly for the round-trip the developer tested (export then immediately import the same version).

**How to avoid:**
- Put a `schemaVersion` field in every exported file from day one.
- Validate on import: check version, check required fields, check types/ranges (difficulty enum, probability 0–1, non-empty mission text) before accepting. Reject or migrate — never blindly merge.
- Write a small migration path (or at least a clear "this file is from a newer/older version" message) rather than failing silently.
- Decide and document import semantics explicitly: replace-all vs. merge vs. append (duplicates?). Ambiguity here loses or duplicates missions.

**Warning signs:**
- Exported files have no version field.
- Import path has no validation — any JSON is accepted.
- No test for importing a hand-edited or truncated file.

**Phase to address:**
Data-persistence phase (import/export). Add `schemaVersion` the moment export is first written, even if there's only one version — retrofitting versioning onto files already in the wild is painful.

---

### Pitfall 5: Probability / card-draw / event-weighting bugs

**What goes wrong:**
Several subtle-but-real bugs specific to this game: (a) card draw uses `Math.floor(Math.random()*n)` with an off-by-one that can never draw the last mission or can index out of bounds; (b) "no-repeat" draw isn't actually implemented, so the same mission repeats back-to-back and kids notice/complain; (c) event-tile probabilities that the instructor edits don't actually sum/normalize, so a "10%" trap fires 40% of the time or never; (d) weighted selection is implemented wrong (e.g., picking by raw weight without cumulative distribution), skewing outcomes; (e) dice distribution is biased by a bad integer-range formula.

**Why it happens:**
Random/weighted selection is deceptively easy to get subtly wrong, and the bug is invisible in casual testing because randomness hides small biases. Instructor-editable probabilities add a layer where user input may not be normalized.

**How to avoid:**
- Isolate all randomness in one small, unit-tested module: `drawCard`, `rollDice`, `pickWeightedEvent`. Use the correct integer-range formula (`Math.floor(Math.random()*(max-min+1))+min`) and a proper cumulative-weight algorithm for weighted picks.
- Normalize instructor-entered event probabilities explicitly (divide by sum) or validate they sum to 100%/1.0 and surface the discrepancy in the editor.
- Implement no-repeat / draw-without-replacement deliberately (shuffle a deck, or exclude the last-drawn), and test it.
- Statistically sanity-check: run the picker 10,000× in a test and assert the distribution matches expected weights within tolerance.

**Warning signs:**
- Random logic is inline and scattered, not in a testable module.
- No test asserts distribution; "it looks random" is the only check.
- Instructor sets probabilities that don't sum to 100% and the app accepts them without comment.
- Same mission/event appears far more or less often than expected during playtests.

**Phase to address:**
Core game-loop phase (card/dice) and event-management phase (weighting). Ship the randomness module with unit tests, not just eyeball testing.

---

### Pitfall 6: Over-scoping the 3D art (character models with multiple facial expressions)

**What goes wrong:**
The requirements ask for male/female characters holding jump-ropes with *multiple facial expressions* (success/fail/moving). Building rigged, animated 3D characters with morph-target facial expressions is a massive art/engineering effort that can consume the entire timeline, blow up file sizes (slow load on tablets), and still not ship the core loop. The project stalls in an art rabbit hole while the actual game — card→mission→dice→move→event — remains unplayable.

**Why it happens:**
The user explicitly wants 3D and expressive characters, so it feels required. 3D character art is open-ended: there is always more polish to add. It is easy to conflate "3D game" with "AAA character models."

**How to avoid:**
- Decouple the token from the character art. Ship the core loop with simple placeholder tokens (colored 3D pawns/low-poly figures) first; the game must be fully playable before any expressive character exists.
- Express emotion cheaply: swap a flat face texture/sprite, use 2D expression icons above a simple token, or scale/bounce animations — not morph-target facial rigs. A billboarded 2D face on a 3D token reads as "expressive" to kids at a fraction of the cost.
- Cap poly count and texture size for tablet performance (see Pitfall 7); keep total model download small.
- Treat rich character art as a *differentiator to add after* the loop works, with a hard time-box.

**Warning signs:**
- Art tasks appear before a playable core loop in the plan.
- Model/texture download size grows into many MB.
- "Just one more expression / better rig" keeps pushing the schedule.

**Phase to address:**
Explicitly sequence: core-loop and board phases use placeholder tokens; a later, time-boxed art phase adds characters and expressions. The roadmap should NOT gate the playable loop on finished character art.

---

### Pitfall 7: Building/testing only on the dev machine — failing on the actual classroom tablet

**What goes wrong:**
Everything is smooth on the developer's laptop with a discrete/decent GPU. On the instructor's actual device — a mid/low-end tablet or an older laptop with integrated graphics — the frame rate tanks, the fans spin, touch targets are hard to hit, and animations stutter during the very moments (dice roll, token move) that are supposed to feel exciting. The game is unusable in the one environment that matters.

**Why it happens:**
Devs optimize for and test on their own hardware. WebGL performance varies enormously across devices; integrated-GPU tablets need the same aggressive optimization as phones. Draw calls and full-resolution pixel ratios that are free on a laptop are expensive on a tablet.

**How to avoid:**
- Test on a representative low-end device early and repeatedly — ideally the instructor's actual device or an equivalent, not just Chrome desktop.
- Cap `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` and consider a lower cap on weak devices; adaptively drop pixel ratio if frame time exceeds ~20ms for sustained frames.
- Keep draw calls low (target <50 on mobile-class devices): reuse meshes, merge static board geometry, use instancing for repeated board tiles, atlas textures.
- Disable/soften shadow maps, use `mediump`/`lowp` shader precision where possible, keep textures modest, and prefer simple lit materials over PBR for a cartoon look.
- Profile with `renderer.info.render.calls` and the Chrome Performance panel, detecting capability rather than screen size.

**Warning signs:**
- No testing on anything but the dev machine.
- Draw calls or triangle counts are unmeasured.
- Pixel ratio is uncapped (renders at 2–3× on high-DPI tablets, murdering fill rate).
- FPS is fine at rest but drops during dice/token animation.

**Phase to address:**
Foundation phase sets the pixel-ratio cap and performance budget; every visual phase (board, tokens, animation, art) verifies on the target device. Add a device-verification checkpoint to the roadmap.

---

### Pitfall 8: Child UX made for adults — too much text, tiny targets, unclear flow

**What goes wrong:**
The UI is designed like a normal web app: small buttons, dense text instructions, multi-step menus, and subtle affordances. Young children (many pre/early-literate) can't read the instructions, miss small touch targets, and get lost in the flow — so the instructor has to constantly intervene, defeating the "kids play at the screen" experience. Success/fail judgment buttons that are small or ambiguously labeled slow the instructor down mid-class.

**Why it happens:**
Developers default to their own literacy and motor skills. Text is the easy way to communicate; icons and big affordances take more design effort. The child audience and instructor-operated context are easy to forget while coding.

**How to avoid:**
- Big, high-contrast, few buttons per screen; large touch targets (well above the ~44px minimum — go bigger for kids).
- Icon-first, minimal text; use color, imagery, sound, and animation to signal state instead of paragraphs. Where text is unavoidable, keep it short and pair with an icon.
- One clear primary action per screen — the flow should be obvious enough that a child can follow card→mission→dice→move without reading.
- Distinguish instructor controls (success/fail judgment, editor) from kid-facing play visually, so the operator can act fast.
- Nintendo-style feedback: satisfying animation/sound on every action so kids get immediate, legible response.

**Warning signs:**
- Screens contain sentences/paragraphs a 7-year-old can't read.
- Buttons are standard web size; multiple competing actions per screen.
- Playtest requires an adult to explain each step.

**Phase to address:**
Applies across all UI phases; establish a child-UX standard (button size, text budget, icon-first rule) in the first UI/start-screen phase and enforce it in every subsequent screen.

---

### Pitfall 9: Blocking animations that stall the turn flow

**What goes wrong:**
The card-flip, dice-roll, and token-move animations are made "cinematic" and long, and the game blocks all input until each finishes. Kids and the instructor wait through unskippable sequences every single turn; over a full class of many turns this pacing becomes tedious and the class drags. Or worse, an animation that never fires its completion callback (e.g., a promise that rejects, or a tab backgrounded so `requestAnimationFrame` pauses) leaves the game permanently stuck waiting to advance the turn.

**Why it happens:**
Animations look great in isolation and in a single demo turn. The cumulative cost across dozens of turns, and the fragility of "advance turn only when animation completes," aren't felt until real classroom use.

**How to avoid:**
- Keep core animations short and snappy; make them skippable (tap to complete instantly).
- Never make turn progression solely dependent on an animation callback that could fail to fire. Use time-based tweens with guaranteed completion, or a state machine where turn state advances independently and animation is cosmetic.
- Handle tab-backgrounding: `requestAnimationFrame` pauses when the tab is hidden — ensure returning to the tab doesn't leave a half-finished animation blocking the turn.
- Let the instructor keep pace; don't force waits between the judgment and the next action.

**Warning signs:**
- Total per-turn animation time is more than a few seconds and unskippable.
- Turn advancement is gated on `onAnimationComplete` with no timeout/fallback.
- Switching browser tabs mid-animation freezes the game.

**Phase to address:**
Animation phase (dice/token/card). Bake in skippability and animation-independent state advancement from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Create new meshes per card/dice/turn instead of reusing | Simpler code, faster to write | GPU memory leak, mid-class crashes (Pitfall 1) | Never for repeated-spawn objects; OK for truly one-off startup meshes |
| Inline `Math.random()` logic scattered in game code | Quick to write | Untestable, hides distribution bugs (Pitfall 5) | Never — isolate in one tested module even in MVP |
| localStorage as sole save with no export/backup | Fewer features to build | Instructor loses core-value data (Pitfall 3) | Only very briefly in a prototype spike, never in shipped v1 |
| Export/import JSON with no `schemaVersion` | Ship import/export faster | Corrupt/incompatible files once schema evolves (Pitfall 4) | Never — the version field costs one line |
| Game state entangled with render loop | Follows tutorials, fast start | Frame-rate bugs, untestable rules, hard rewrite (Pitfall 2) | Never — the split is cheap upfront, expensive to retrofit |
| Finished 3D character art before playable loop | Satisfies the "3D + expressive" ask early | Timeline consumed, core game unplayable (Pitfall 6) | Never — placeholder tokens first, art later |
| Only testing on dev laptop | Fast iteration | Unusable on the actual classroom tablet (Pitfall 7) | Only for very early scaffolding; verify on target device before any "done" |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| localStorage | Unguarded `JSON.parse` on load; ignoring quota/private-mode write errors | try/catch with schema fallback on read; catch `QuotaExceededError` on write; treat as cache, not truth |
| File JSON import | Accepting any parsed JSON, no version/validation | Validate `schemaVersion`, required fields, value ranges; define replace/merge semantics explicitly |
| GLTF/texture loading (character/board art) | Loading large assets synchronously with no loading state; not disposing on scene change | `LoadingManager` with progress UI; dispose textures incl. `source.data.close?.()`; cap texture size for tablets |
| WebGL context | Assuming context is permanent | Handle `webglcontextlost`/`restored` events; on low-end tablets context loss under memory pressure is real |
| Audio (feedback sounds) | Autoplaying before user gesture | Init/unlock audio on the first tap (browsers block autoplay until interaction) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| GPU memory leak (undisposed resources) | FPS degrades over a session, recovers on reload; rising `renderer.info.memory` | Reuse meshes; dispose on teardown | After ~20–40 min of continuous multi-game play on a tablet |
| Uncapped pixel ratio on high-DPI tablet | Low FPS even with simple scene; hot device | `setPixelRatio(min(dpr, 2))`, adaptive downscale | Immediately on 2–3× DPI tablets |
| Too many draw calls (per-tile meshes, per-object materials) | Stutter during movement/animation | Merge static board geometry, instance repeated tiles, atlas textures; target <50 calls | As board size / token count grows |
| Oversized character models/textures | Long load, memory pressure, context loss | Low-poly + modest textures; time-boxed art scope | On low-RAM tablets / slow classroom Wi-Fi |
| Per-frame allocations in the render loop (new vectors/objects) | GC stutter / periodic frame hitches | Preallocate and reuse math objects | Subtle; worsens on weaker CPUs over long sessions |

## Security Mistakes

Server-less, single-device, no accounts — so classic web security surface is small. Domain-relevant items:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Rendering instructor/import text via `innerHTML` | XSS from a malicious/edited imported JSON file executing script on the class device | Render user text as textContent / framework-escaped; never `innerHTML` untrusted mission/event text |
| Trusting imported JSON structure | Malformed file crashes the app or corrupts saved data | Validate/sanitize on import (ties to Pitfall 4); size-limit imports |
| Storing anything sensitive in localStorage | Data readable by any script on the origin | Keep only game/mission data local; store no personal/sensitive info (none needed here) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Text-heavy, small-button UI for pre-literate kids | Kids can't self-navigate; instructor must intervene constantly | Icon-first, big high-contrast targets, one primary action per screen |
| Long, unskippable per-turn animations | Class drags across dozens of turns | Short, skippable animations; instructor controls pacing |
| No/weak feedback on success/fail judgment | Kids don't feel the payoff; unclear what happened | Big celebratory animation + sound on success, clear distinct fail feedback |
| Editor UI as complex as a spreadsheet | Instructor avoids customizing — kills the core value | Simple add/edit forms, sensible defaults, inline validation, obvious save/export |
| Ambiguous instructor vs. kid controls on one screen | Instructor fumbles the success/fail call mid-class | Visually separate operator controls; make judgment buttons large and unmistakable |
| No obvious "we saved your work / back this up" cue | Instructor unknowingly at risk of losing missions | Visible saved state + export prompt after edits |

## "Looks Done But Isn't" Checklist

- [ ] **Card draw:** Often missing real no-repeat logic and correct index range — verify no out-of-bounds and no back-to-back duplicates over 100 draws.
- [ ] **Event probabilities:** Often missing normalization — verify instructor-entered weights actually produce the stated odds (10k-run distribution test).
- [ ] **Dice/token movement:** Often missing time-based (not frame-based) animation — verify identical pacing at 30fps and 60fps.
- [ ] **Object lifecycle:** Often missing disposal — verify `renderer.info.memory` stays flat across several full games without reload.
- [ ] **localStorage:** Often missing corrupt/absent/quota handling — verify app still boots with garbage, empty, and oversized storage.
- [ ] **JSON export:** Often missing `schemaVersion` — verify every export carries a version and import validates it.
- [ ] **JSON import:** Often missing validation + defined merge semantics — verify a truncated/old/foreign file is rejected gracefully, not crashed on.
- [ ] **Turn flow:** Often missing animation-failure fallback — verify backgrounding the tab mid-animation doesn't permanently freeze the turn.
- [ ] **Tablet performance:** Often missing target-device test — verify smooth dice/token animation on the actual classroom device, not just the dev laptop.
- [ ] **Child UX:** Often missing "can a 7-year-old follow it without reading" — verify flow with icons/no-text assumption.
- [ ] **Win condition:** Often missing exact-arrival / overshoot rules and ties — verify reaching/passing the finish and simultaneous arrivals resolve deterministically.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| GPU memory leak discovered late | MEDIUM | Add disposal to teardown paths; switch repeated-spawn objects to reuse; verify with `renderer.info.memory` |
| Game logic coupled to render loop | HIGH | Extract pure state module, convert frame-count timing to delta-time; effectively a refactor — cheap only if caught early |
| Instructor data lost (no backup) | HIGH (unrecoverable data) | Cannot recover already-lost data; add export-as-backup + read guards to prevent recurrence; apologize with a restore-from-file path |
| Unversioned JSON files in the wild | MEDIUM | Add version detection that treats version-less files as v1; write a migration; communicate to instructors |
| Probability/weighting bug | LOW | Fix the isolated random module; add distribution tests (low cost *because* logic is isolated — high cost if scattered) |
| Over-scoped art blocking ship | MEDIUM | Drop to placeholder tokens, ship the loop, re-time-box art as a follow-on |
| Poor tablet performance found late | MEDIUM | Cap pixel ratio, cut draw calls (merge/instance), disable shadows, shrink textures — most are quick wins |

## Pitfall-to-Phase Mapping

Phase names are indicative (roadmap not yet created); map by topic.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| GPU memory leak (Three.js disposal) | Foundation / render architecture | `renderer.info.memory` flat across multiple full games, no reload |
| Game logic coupled to render loop | Core game-loop (state/render split established first) | Game rules unit-testable without a canvas; identical pacing at 30 vs 60 fps |
| Losing instructor data (localStorage) | Data-persistence (read guards early, backup UX in editor) | App boots with corrupt/empty/oversized storage; export prompt present |
| JSON versioning/validation | Data-persistence (import/export) | Every export has `schemaVersion`; foreign/old/truncated file handled gracefully |
| Probability/weighting bugs | Core game-loop (draw/dice) + event management (weights) | 10k-run distribution tests pass; no-repeat verified |
| Over-scoped 3D art | Sequencing: placeholder tokens in loop/board phases, art in a later time-boxed phase | Core loop fully playable before any character art exists |
| Tablet performance | Foundation (pixel-ratio cap, budget) + every visual phase | Smooth on target device; draw calls <50; pixel ratio capped |
| Child UX (text/targets/flow) | First UI/start-screen phase sets the standard; enforced everywhere | A child can follow the flow without reading; large targets |
| Blocking/failing turn animations | Animation phase | Animations skippable; tab-background mid-animation doesn't freeze the turn |

## Sources

- Three.js official docs — `Material.dispose`, "How to dispose of objects" (renderer resources not auto-freed): https://threejs.org/docs/#api/en/materials/Material.dispose
- three.js forum — disposal/memory-leak threads (textures, scene cleanup, WebGLRenderer recreation): https://discourse.threejs.org/t/when-to-dispose-how-to-completely-clean-up-a-three-js-scene/1549
- "100 Three.js Tips That Actually Improve Performance (2026)" — draw calls, pixel ratio cap, `renderer.info` for leak/draw-call detection: https://www.utsubo.com/blog/threejs-best-practices-100-tips
- Roger Chi — "Tips on preventing memory leak in Three.js scene": https://roger-chi.vercel.app/blog/tips-on-preventing-memory-leak-in-threejs-scene
- Mindful Chase — "Fixing Performance Drops and Memory Leaks in Three.js Applications": https://www.mindfulchase.com/explore/troubleshooting-tips/frameworks-and-libraries/fixing-performance-drops-and-memory-leaks-in-three-js-applications.html
- Digital Strategy Force — "How Do You Optimize Three.js Performance for Mobile Devices" (capability detection, pixel ratio, shadows, precision): https://digitalstrategyforce.com/journal/how-do-you-optimize-threejs-performance-for-mobile-devices/
- Established engineering practice (localStorage fragility/quota, JSON schema versioning, weighted-random correctness, child-UX heuristics) — HIGH confidence, cross-checked against MDN/WebGL norms.

---
*Pitfalls research for: 3D web board game (Three.js) for jump-rope class, instructor-operated single device*
*Researched: 2026-07-25*
