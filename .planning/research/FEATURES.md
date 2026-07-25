# Feature Research

**Domain:** 아동 줄넘기 강습용 3D 웹 보드게임 (single-device, instructor-run classroom board game)
**Researched:** 2026-07-25
**Confidence:** MEDIUM-HIGH (board-game mechanics = HIGH / universal; classroom-tool framing = MEDIUM; single web-search grounding)

## Domain Framing

This product sits at the intersection of two well-understood domains:

1. **Digital board games** (roll-and-move family: Snakes & Ladders, Mario Party, Game of Life). These define the *core loop* expectations: turn order, dice, token movement, event tiles, win detection.
2. **Classroom / educational game tools** (Blooket, Gimkit, Kahoot). These define the *operator* expectations: teacher-editable content library, team mode, single-screen projection, no accounts, big/simple UI for kids.

The game's originality is not the loop (roll-and-move is ancient) but the **physical-action bridge**: the drawn card is a real jump-rope skill the child performs, and the instructor manually judges success. That manual-judgement gate is the defining mechanic and the reason online/auto-detection features are out of scope.

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these makes the game feel broken or unfinished. All are already in PROJECT.md's Active list — this section confirms they are non-negotiable and specifies expected behavior.

| Feature | Why Expected | Complexity | Expected behavior / notes |
|---------|--------------|------------|---------------------------|
| Player/team setup screen | Every multiplayer board game asks "who's playing?" before starting | MEDIUM | Set count, names, character per player/team; validate min 2 players; persist last setup |
| Turn management / turn order | Board games are turn-based; players must know whose turn it is | MEDIUM | Clear "current player" indicator; auto-advance to next after a turn resolves; visible turn order; skip handled cleanly |
| Card draw → mission reveal | This is the trigger action of every turn; the spin is the anticipation beat | MEDIUM | Draw pulls one mission from active pool; spin/flip animation; no immediate repeat of same mission ideally; show mission name + difficulty + category clearly and large |
| Manual success/fail judgement | Core mechanic — instructor is the referee | LOW | Two big buttons after mission shown; success unlocks dice; fail ends turn (no move) and advances to next player |
| Dice roll | Universal board-game randomizer; the reward for success | MEDIUM | Appears only on success; animated roll; result 1–6 (configurable range later); result drives move distance |
| Token movement on board | Players must see progress; the board is the state | HIGH (3D) | Token animates step-by-step along path; camera/board readable; token stops on landing tile; no overlap ambiguity |
| Event tile resolution | Roll-and-move boards have special squares; players expect consequences | MEDIUM | Landing tile fires its event (bonus/trap/+3/-2/roll again); clear feedback of what happened and net effect; "roll again" re-enters dice state |
| Win detection + results screen | A game without an ending is broken | LOW | First to reach/pass finish wins; handle overshoot rule (exact vs pass); freeze play; celebratory results screen naming winner |
| Persistence (localStorage) | Instructor expects edited content to still be there next class | MEDIUM | Auto-save missions/events/settings; auto-load on open; survive refresh |
| Big, simple, kid-facing UI | Audience is children; classroom tools (Blooket) win on simple visual UI | MEDIUM | Large hit targets, minimal text, bright Nintendo-style color; one clear action per screen |

### Differentiators (Competitive Advantage)

These align directly with PROJECT.md Core Value. This is where the product competes.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Editable jump-rope mission library (CRUD + search) | THE core value — each instructor's curriculum differs; content must be theirs | MEDIUM | Add/edit/delete/search; fields: name, difficulty, category; this library *is* the card deck. Must exist before draw is meaningful |
| Mission difficulty + category taxonomy | Lets instructor scaffold lessons (warm-up → advanced) and theme decks | LOW | Difficulty (easy/normal/hard) and category as filterable/editable metadata; can gate which tier is drawn |
| Editable event tiles with adjustable probability | Instructor tunes how chaotic/forgiving the board feels for the class level | MEDIUM-HIGH | CRUD events; each has a weight/probability; probabilities drive tile assignment or draw. Probability editing is the tricky part — needs a sane, understandable model (weights that sum, or per-tile %) |
| Individual **and** team mode | Classrooms run both formats; team mode drives cooperation for large groups | MEDIUM | Individual: each child a token. Team: groups share a token/turn. Mode chosen at start; affects setup, turn rotation, win attribution |
| JSON export / import of content | Backup + share between instructors + move between devices without a server | LOW-MEDIUM | Export missions+events(+settings) to file; import restores/merges. This is the "cloud-free sync" story |
| 3D board with WebGL (Three.js) | Explicit user requirement; visual "wow" for kids vs flat 2D quiz tools | HIGH | Biggest technical cost/risk. Readability and performance on instructor laptop/tablet matter more than fidelity |
| Expressive characters (m/f, jump-rope, reactive faces) | Emotional feedback for kids — success/fail/move expressions make it feel alive | MEDIUM-HIGH | Original art (no IP). Faces react to success/fail/movement. Enhances but does not gate the loop |
| Original "파워점핑" logo / brand | Cohesive identity, IP-safe | LOW-MEDIUM | Purely original; art task not engineering-critical |

### Anti-Features (Commonly Requested, Often Problematic)

Documented to prevent scope creep. Most already appear in PROJECT.md Out of Scope — reaffirmed here with the better alternative.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Online multiplayer / multi-device real-time sync | "Kids could play from their own devices" | Server, accounts, netcode, latency, cost — massive complexity for a co-located class on one screen | Single shared screen, instructor-run; local state only |
| Accounts / login / auth | "Save per teacher / cloud profiles" | Auth, privacy (children's data!), backend — unnecessary for one local device | localStorage + JSON export/import for backup & portability |
| Automatic jump-rope success detection (camera/sensor/ML) | "The game could judge the trick itself" | Unreliable, needs camera perms + ML + calibration; erodes the instructor-as-referee mechanic | Manual success/fail button — instructor eyes are the sensor |
| Real brand / licensed characters | "Kids love Mario/Pokémon" | IP infringement, legal risk | Original bright Nintendo-*style* art and mascot |
| Payments / monetization | "Could sell it" | No revenue model; adds store/billing complexity to a teaching tool | Free local tool; none |
| Deep strategy layer (resource mgmt, combat, complex dice mitigation) | "Make the board game richer" | Analysis paralysis for young kids; the strategy lives in the *physical* jump-rope skill, not the board | Keep board light (roll-and-move + event tiles); challenge is on the rope |
| Real-time leaderboard/economy (Gimkit-style currency) | Classroom tools have it | Extra system; win = first to finish is enough for this loop | Simple position-on-board is the live scoreboard |

## Feature Dependencies

```
Mission Library (CRUD + difficulty/category)
    └──required-by──> Card Draw (deck is empty/meaningless without missions)
                          └──required-by──> Manual Success/Fail Judgement
                                                └──required-by──> Dice Roll
                                                                     └──required-by──> Token Movement (3D board)
                                                                                          └──required-by──> Event Tile Resolution
                                                                                                               └──required-by──> Win Detection + Results

Event Library (CRUD + probability)
    └──required-by──> Event Tile Resolution (tiles need defined events + weights)

Player/Team Setup
    └──required-by──> Turn Management ──required-by──> entire loop
    └──configured-by──> Mode Select (Individual vs Team)

localStorage Persistence ──enhances──> Mission Library & Event Library (edits survive)
JSON Export/Import ──enhances──> Persistence (backup/share/portability)
3D Board (Three.js) ──enhances/hosts──> Token Movement + Event Tiles (also biggest risk)
Expressive Characters ──enhances──> Token Movement + Success/Fail (not a gate)
```

### Dependency Notes

- **Card Draw requires Mission Library:** the draw pulls from the instructor-defined pool. A seeded/default mission set should ship so the game is playable before any editing — but the editor is the value, so both are early.
- **Event Tile Resolution requires Event Library + probability model:** tiles reference events and their weights; the probability engine must exist before tiles can behave.
- **Dice requires Success judgement:** dice only appears on success — the manual gate is upstream of the randomizer.
- **Turn Management requires Player/Team Setup:** you can't rotate turns without knowing the roster and mode.
- **Team mode conflicts with per-player assumptions:** turn rotation, token count, and win attribution differ; build the loop mode-aware from the start rather than retrofitting team mode later.
- **3D board hosts movement + tiles:** the highest-complexity, highest-risk item; a 2D fallback prototype of the loop de-risks it (validate loop logic before/parallel to 3D polish).

## MVP Definition

### Launch With (v1) — validates "does the loop feel fun on one screen?"

- [ ] Player/team setup + mode select — can't start without a roster
- [ ] Mission Library CRUD + search + difficulty/category — the core value; ship with a seeded default deck
- [ ] Card draw with spin animation → mission reveal
- [ ] Manual success/fail judgement (big buttons)
- [ ] Dice roll on success
- [ ] 3D board + token movement animation
- [ ] Event tiles with a working (even if simple) event set — bonus/+3/-2/roll again/trap
- [ ] Event Library CRUD + probability editing
- [ ] Win detection + results screen
- [ ] localStorage persistence + JSON export/import
- [ ] Kid-friendly bright UI + at least basic characters

Note: for this project the "editable content" differentiators are effectively table stakes because they are the stated Core Value — they cannot be deferred to v1.x.

### Add After Validation (v1.x)

- [ ] Richer expressive character faces/animations per situation — trigger: loop proven fun, polish pass
- [ ] Deck filtering by difficulty/category at draw time (e.g., "warm-up round only") — trigger: instructors ask to scaffold sessions
- [ ] Sound effects / music — trigger: kids want more feedback
- [ ] Undo last judgement / turn (misclick recovery) — trigger: instructors report tap mistakes
- [ ] Multiple board layouts / lengths (short vs long game) — trigger: class time constraints

### Future Consideration (v2+)

- [ ] Preset curriculum templates (shareable mission packs) — defer until content-sharing demand is real
- [ ] Per-player stats/history — defer; not needed to validate core loop
- [ ] Accessibility toggles (colorblind palette, larger text) — defer but keep in mind for kids/classroom

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Core loop (draw→judge→dice→move→event→win) | HIGH | HIGH (3D) | P1 |
| Mission Library CRUD + search | HIGH | MEDIUM | P1 |
| Player/team setup + turn management | HIGH | MEDIUM | P1 |
| Individual + team mode | HIGH | MEDIUM | P1 |
| Event Library CRUD + probability | HIGH | MEDIUM-HIGH | P1 |
| localStorage persistence | HIGH | MEDIUM | P1 |
| JSON export/import | MEDIUM | LOW-MEDIUM | P1 |
| 3D board rendering | HIGH | HIGH | P1 (risk) |
| Expressive characters | MEDIUM | MEDIUM-HIGH | P2 |
| Original logo/branding | MEDIUM | LOW-MEDIUM | P2 |
| Sound/music | MEDIUM | LOW | P2 |
| Undo last judgement | MEDIUM | LOW | P2 |
| Deck filtering at draw | MEDIUM | LOW | P2 |
| Curriculum template sharing | LOW | MEDIUM | P3 |

**Priority key:** P1 must-have for launch · P2 add when possible · P3 future.

## Expected Behavior Reference (per loop stage)

Detailed expected behavior to feed requirements — the "how each part should feel."

1. **Start screen:** logo, big Start, mode toggle (individual/team). One clear entry action.
2. **Setup:** choose player/team count, names, characters. Guard against <2 players. Remember last config.
3. **Turn start / card draw:** current player highlighted; Start/Draw triggers spin; exactly one mission surfaces; large readable mission name + difficulty + category; ideally avoid immediate duplicate.
4. **Perform + judge:** child performs physically off-screen; instructor taps Success or Fail. Success → dice appears. Fail → no move, turn passes, gentle (non-punishing) feedback for kids.
5. **Dice:** animated roll on success only; shows result; result = steps to advance.
6. **Move:** token animates step-by-step along the 3D path; camera keeps token visible; lands on a tile.
7. **Event:** landing tile fires event by its configured probability/type; clear feedback ("앞으로 3칸!"); net effect applied; "한 번 더" re-enters dice; chained events resolve safely (guard infinite loops).
8. **Win check:** if token reaches/passes finish → win (decide exact-landing vs pass rule up front); else advance turn.
9. **Results:** freeze board, celebrate winner (individual or team), offer replay / back to menu.

Cross-cutting expected behaviors: state auto-saves after every meaningful change; no dead-ends (every screen has a clear next/back); everything tappable is large; nothing requires typing from the child (only the instructor edits/setups).

## Competitor Feature Analysis

| Feature | Classroom tools (Blooket/Gimkit/Kahoot) | Physical board games (Snakes&Ladders / Mario Party) | Our Approach |
|---------|-----------------------------------------|------------------------------------------------------|--------------|
| Content editing | Teacher-created question sets/kits, import | Fixed board & rules | Instructor CRUD mission + event library (JSON portable) |
| Team mode | Yes (team/class play) | Yes (teams/players) | Individual + team, chosen at start |
| Randomizer | Question outcome / game-mode luck | Physical dice | Animated dice, only after real-skill success |
| Progress display | Leaderboard / economy | Physical token on board | Live token position on 3D board = the scoreboard |
| Device model | Each student device + host screen | Shared physical board | Single instructor screen, local only |
| Accounts | Yes (teacher/student) | None | None — localStorage + JSON |
| Win condition | Points/first-to-goal | First to finish | First to reach/pass finish |
| The "challenge" | Answer a question on screen | Move/strategy on board | Perform a real jump-rope skill (unique) |

## Sources

- [Game Developer — 10 ways to use dice in your board game](https://www.gamedeveloper.com/game-platforms/10-ways-to-use-dice-in-your-board-game-other-than-roll-and-move-) — MEDIUM (roll-and-move weakness, dice mitigation, balance pitfalls)
- [Board Game Design Lab — How to Design a Board Game](https://boardgamedesignlab.com/how-to-design-a-board-game/) — MEDIUM (modular systems, playtesting, win conditions)
- [Adam's Apple Games — Roll and Write Board Game Design](https://adamsapplegames.com/roll-and-write-board-game-design/) — MEDIUM (roll-and-move design)
- [SoftwareSuggest — Blooket vs Gimkit](https://www.softwaresuggest.com/compare/blooket-vs-gimkit) — MEDIUM (teacher content editing, team mode, game modes)
- [Formswrite — Blooket vs Gimkit vs Kahoot](https://formswrite.com/blog/blooket-vs-gimkit-vs-kahoot-classroom-games-compared) — MEDIUM (classroom tool feature baseline, simple UI for young students)
- PROJECT.md (internal) — HIGH (requirements, scope, constraints, core value)

---
*Feature research for: 아동 줄넘기 강습용 3D 웹 보드게임 (파워점핑)*
*Researched: 2026-07-25*
