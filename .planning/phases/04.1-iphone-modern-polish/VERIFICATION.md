# Phase 4.1 Verification — iPhone-first modern polish

Updated: 2026-08-05 11:00:24 KST

## Automated checks

```bash
npx vitest run src/App.test.tsx
```

Result: PASS — 1 file / 7 tests.

```bash
npm run build
```

Result: PASS — Vite production build completed.

```bash
npm test
```

Result: PASS — 23 files / 183 tests.

## iPhone viewport smoke

Command:

```bash
python3 /tmp/iphone_cdp_smoke.py
```

Environment:
- Chrome headless CDP
- Device metrics: 390×844, DPR 3, mobile true
- iPhone Safari-like user agent
- URL: `http://127.0.0.1:5177/monster-jump-rope-game/`

Observed after pressing 시작:

| Item | Value |
|---|---:|
| viewport | 390×844 |
| app class | `app app--game app--playing` |
| global header display | `none` |
| view switch display | `none` |
| topbar bottom | 69px |
| board top | 73px |
| board bottom | 691px |
| card button top | 715px |
| rank strip bottom | 835px |
| board/control overlap | false |
| broken images | 0 |

Screenshot artifact: `/tmp/powerjumping-iphone-smoke.png`

## Visual assessment
- App/setup/editor shell is cleaner and less toy-heavy via neutral modern cards/shadows.
- Active game still keeps colorful, playful board/character styling.
- Gameplay on 390px portrait no longer loses height to global header/tabs.

## Not performed
- Direct physical iPhone Safari UAT. Use the deployed URL for final human device confirmation.
