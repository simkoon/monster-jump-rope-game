# Phase 06 — Deferred Items (out of scope, logged by executors)

## From 06-01

- **npm audit: 6 vulnerabilities in the existing dev toolchain** (vite 8.1.5, vitest 3.2.4 and their transitive
  tinypool / @vitest/mocker / nanoid / source-map-js). These came before the 3D install, and none of them
  come from three / @react-three/*. `npm audit fix --force` would move vite outside the pinned range, so it
  was not run. Revisit as a separate toolchain-upgrade task (vite >= 8.3.5, vitest upgrade).
