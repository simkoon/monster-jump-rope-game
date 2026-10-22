# Phase 4 Verification

## 04-01 visual system + original logo

### Automated verification

Commands:

```bash
npm run build
npm test
```

Result: passed.

Observed latest test result:

```text
Test Files  23 passed (23)
Tests       178 passed (178)
```

### Browser smoke

URL:

```text
http://127.0.0.1:5177/monster-jump-rope-game/
```

Checked:

- Setup screen renders the original `파워점핑` logo with candy/playful styling.
- Header context changes by top-level view; game mode reads `게임` and not stale `콘텐츠 편집기`.
- Starting the game preserves Phase 3.1 board readability: START/FINISH, tile numbers, arrows, tokens, dice, card button, and rank strip remain visible.
- One turn flow works: card draw → success → dice roll → token movement.
- Kenney dice icon loads after roll; broken image count is 0.

### Manual limitations

- Browser smoke used the local desktop viewport only.
- Physical classroom tablet/iPhone verification remains a follow-up.

## 04-02 character pose/expression switching

### Automated verification

Commands:

```bash
npm run build
npm test
```

Result: passed.

Observed latest test result:

```text
Test Files  23 passed (23)
Tests       182 passed (182)
```

### Browser smoke

URL:

```text
http://127.0.0.1:5177/monster-jump-rope-game/
```

Checked:

- Success path: start → card draw → success. Active token switched to `boy-cheer0.png` during the reaction window.
- Movement path: success → dice roll. Active token switched to `walk` pose and cycled through `boy-walk0.png`, `boy-walk1.png`, `boy-walk2.png`, `boy-walk3.png` while moving.
- Failure path: start → card draw → failure. Active token switched to `boy-hurt.png`, then the turn advanced to Player 2.
- Broken image count remained 0.

### Bug fixed during verification

`BoardScene` animation effects previously depended on parent callback identities. Parent re-renders could cleanup the dice-settle timeout before it fired, so movement could rely on the watchdog rather than the intended animation chain. 04-02 stores callbacks in refs and tests that the dice-settle timer survives callback re-renders.

### Manual limitations

- Local desktop browser smoke only; physical tablet/iPhone UAT not performed.
