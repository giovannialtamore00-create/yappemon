# PROGRESS

**Current milestone:** 3 — Renderer + Practice vs Bot via debug box
**Phase:** building (main branch)

## Done
- Kickoff: settings.json permissions, git init, deps installed (three, peerjs, vite 8, TS 7, vitest 5, playwright + chromium).
- M1 ✅ `src/sim/` (types, data, rng, sim, bot) + `tests/sim.test.ts` (28 tests). Bot-vs-bot matches end in ~25–45 s.
- M2 ✅ `src/voice/parser.ts` (normalize, fold, levenshtein, windowed fuzzy match, parse(), toIntents()), `src/voice/aliases.ts`, `tests/parser.test.ts` (99 tests).

## In progress
- M3: index.html, src/main.ts, src/game/ (local match loop), src/render/ (scene, creatures, hud), debug text box.

## Next steps (in order)
1. Finish sim + tests (M1), checkpoint.
2. Voice parser + tests (M2).
3. Renderer + Practice vs Bot via debug box (M3).
4. Live voice (M4). 5. VFX/audio (M5). 6. PeerJS (M6). 7. Screens/polish (M7). 8. Deploy + README (M8). 9. Parking lot (M9).

## Context for a fresh session
- Shell: Windows; use the Bash tool (Git Bash). `npm test`, `npm run build`, `npm run dev`.
- GitHub CLI is NOT logged in (user was remote at kickoff). Deploy is left as a final documented step for the user (README "Deploy").
- TypeScript is v7 (native compiler); `tsc --noEmit` runs in `npm run build`.
