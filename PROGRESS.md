# PROGRESS

**Current milestone:** 7 — Screens and polish (full lobby → rematch flow)
**Phase:** building (main branch)

## Done
- Kickoff: settings.json permissions, git init, deps installed (three, peerjs, vite 8, TS 7, vitest 5, playwright + chromium).
- M1 ✅ `src/sim/` (types, data, rng, sim, bot) + `tests/sim.test.ts` (28 tests). Bot-vs-bot matches end in ~25–45 s.
- M2 ✅ `src/voice/parser.ts` (normalize, fold, levenshtein, windowed fuzzy match, parse(), toIntents()), `src/voice/aliases.ts`, `tests/parser.test.ts` (99 tests).
- M3 ✅ Renderer: `src/render/{scene,creatures,view,vfx,hud,showcase}.ts`, `src/game/{session,battle}.ts`, `src/ui/screens.ts`, `src/main.ts`, `src/i18n.ts`, `src/style.css`. Practice vs Bot fully playable via debug box (backtick). `npm run smoke` (or `node scripts/smoke.mjs --full`) = headless Playwright run with screenshots in ./screenshots (gitignored).
- M4 ✅ `src/voice/speech.ts` (continuous, auto-restart w/ backoff, interim → HUD, final alternatives → `Battle.commandAlternatives` picks first that parses). Browser check `isSupportedBrowser()`. Smoke test injects a FakeRec to test the wiring. URL test options: `?seed=7&botTeam=vinram,brinkle&bot=passive`.
- M5 ✅ `src/audio/sfx.ts` (synth SFX per move, hit, whoosh, fail buzz, faint, recall, send-out, UI click, jingles, ambient wind+pad, volume slider in corner, unlocked on first gesture). VFX polish (tidal wave lip, heal height). `node scripts/vfx-shots.mjs [species]` + `node scripts/contact-sheet.mjs <dir> <out.png>` for visual review.
- M6 ✅ `src/net/{protocol,link,sessions}.ts`: hostRoom/joinRoom (PeerJS, id cbattle-CODE, STUN only), Link heartbeat (ping 1 s, timeout 6 s), HostSession (20 Hz snaps + events), ClientSession (tick-offset clock, 110 ms interp delay, events delivered when their snapshot is shown), sanitizeIntents/sanitizeTeam. Flows in main.ts: hostGame, joinGame, netTeamSelect, netEnd (rematch handshake), disconnected. `node scripts/net-test.mjs` = 2-page test over the real broker (needs internet).

## In progress
- M7 (in progress): done — how-to-play in lobby, mic-permission hint on team select, opponent windup warning in foe panel ("Charging: X!"), Leave button, opponent-failed toast, HUD relabel on language change, phone layout. `node scripts/flow-test.mjs` (Italian UI, voice forced switch, leave, phone). Next: gameplay feel pass (match pacing), final visual review, then M8.

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
