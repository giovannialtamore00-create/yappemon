# PROGRESS

**Current milestone:** 4 — Live voice input
**Phase:** building (main branch)

## Done
- Kickoff: settings.json permissions, git init, deps installed (three, peerjs, vite 8, TS 7, vitest 5, playwright + chromium).
- M1 ✅ `src/sim/` (types, data, rng, sim, bot) + `tests/sim.test.ts` (28 tests). Bot-vs-bot matches end in ~25–45 s.
- M2 ✅ `src/voice/parser.ts` (normalize, fold, levenshtein, windowed fuzzy match, parse(), toIntents()), `src/voice/aliases.ts`, `tests/parser.test.ts` (99 tests).
- M3 ✅ Renderer: `src/render/{scene,creatures,view,vfx,hud,showcase}.ts`, `src/game/{session,battle}.ts`, `src/ui/screens.ts`, `src/main.ts`, `src/i18n.ts`, `src/style.css`. Practice vs Bot fully playable via debug box (backtick). `npm run smoke` (or `node scripts/smoke.mjs --full`) = headless Playwright run with screenshots in ./screenshots (gitignored).

## In progress
- M4: `src/voice/speech.ts` (webkitSpeechRecognition wrapper, continuous, auto-restart, interim → HUD transcript, final → Battle.command), mic indicator, browser warning, click-to-start gate.

## Next steps (in order)
1. Finish sim + tests (M1), checkpoint.
2. Voice parser + tests (M2).
3. Renderer + Practice vs Bot via debug box (M3).
4. Live voice (M4). 5. VFX/audio (M5). 6. PeerJS (M6). 7. Screens/polish (M7). 8. Deploy + README (M8). 9. Parking lot (M9).

## Context for a fresh session
- Shell: Windows; use the Bash tool (Git Bash). `npm test`, `npm run build`, `npm run dev`.
- GitHub CLI is NOT logged in (user was remote at kickoff). Deploy is left as a final documented step for the user (README "Deploy").
- TypeScript is v7 (native compiler); `tsc --noEmit` runs in `npm run build`.
- Test hook: `window.__yappemon.say(text)` / `.state()` in the page (used by scripts/smoke.mjs).
- Headless WebGL works with chromium args `--use-angle=swiftshader --enable-unsafe-swiftshader`.
