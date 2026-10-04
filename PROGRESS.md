# PROGRESS

**Current milestone:** COMPLETE + post-MVP feature: rounds/evolutions/move animations (done, tested).
**Phase:** all build milestones done on `main`. BLOCKERS.md has no parked technical problems; only items that need the user.

## Done
- Kickoff: `.claude/settings.json` permissions, git init, deps (three, peerjs, vite 8, TS 7, vitest 5, playwright + chromium).
- M1 ✅ `src/sim/` (types, data, rng, sim, bot) + `tests/sim.test.ts`.
- M2 ✅ `src/voice/parser.ts`, `src/voice/aliases.ts` + `tests/parser.test.ts`.
- M3 ✅ `src/render/{scene,creatures,view,vfx,hud,showcase}.ts`, `src/game/{session,battle}.ts`, `src/ui/screens.ts`, `src/main.ts`, `src/i18n.ts`, `src/style.css`.
- M4 ✅ `src/voice/speech.ts` (continuous, auto-restart with backoff, alternatives → `Battle.commandAlternatives`).
- M5 ✅ `src/audio/sfx.ts` (all synthesized) + VFX polish.
- M6 ✅ `src/net/{protocol,link,sessions}.ts` + flows in `main.ts` (hostGame, joinGame, netTeamSelect, netEnd/rematch, disconnected) + `tests/net.test.ts`.
- M7 ✅ how-to-play, mic hint, opponent windup warning, Leave button, phone layout, heavy windups tuned (DECISIONS #42).
- M8 ✅ `.github/workflows/deploy.yml`, `scripts/publish.ps1`, `README.md`, background-tab keep-alive worker.

- Post-MVP ✅ spectator rooms ("Host as spectator", SpectatorHostSession, side camera; `node scripts/spectator-test.mjs` = 3-browser test).
- Post-MVP ✅ best-of-3 rounds, 3 evolution stages (8 new forms, 8 new moves), evolution sequence, per-move animations (src/render/motion.ts), round HUD/banners, sounds. DECISIONS #46–52. Visual check script: node scripts/evo-shots.mjs.

## Status of checks (last run)
- `npm test`: 166 passing. `npm run build`: OK.
- `node scripts/smoke.mjs [--full]`, `node scripts/flow-test.mjs`, `node scripts/net-test.mjs` (real PeerJS broker, needs internet), `node scripts/preview-test.mjs`: all OK.

## Next steps (in order)
1. Parking lot: nothing parked. Items needing the user are in BLOCKERS.md ("Needs the user").
2. ✅ Final summary delivered. If resumed: wait for user feedback from real voice/online tests; add misheard words to `src/voice/aliases.ts`.

## Context for a fresh session
- Windows; use the Bash tool (Git Bash). Commands: `npm test`, `npm run build`, `npm run dev`, plus the scripts above.
- Headless WebGL needs chromium args `--use-angle=swiftshader --enable-unsafe-swiftshader` (already in the scripts).
- Page test hook: `window.__yappemon.say(text)`, `.state()`, `.app`. URL test options: `?seed=7&botTeam=vinram,brinkle&bot=passive`.
- GitHub CLI is NOT installed/logged in (the kickoff winget install was waiting on a UAC prompt when the user left). Deployment = the user runs `scripts/publish.ps1` (README §2).
- Gotcha: don't put text with backticks inside `node -e "..."` in bash — bash runs them as commands. Use the Write/Edit tools for such text.
