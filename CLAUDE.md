# YAPPEMON

1v1 browser 3D creature battler controlled by **voice** (English + Italian). 4 creatures × 3 evolution stages,
best-of-3 rounds, online P2P (PeerJS) or Practice vs Bot. Everything procedural (Three.js primitives, synthesized audio).

Stack: TypeScript, Vite, Three.js, PeerJS, Web Speech API, Vitest, Playwright. Node ≥ 22.12. Windows host.

## Rules
- `src/sim/` is deterministic (seeded RNG, 30 Hz, no DOM/Three.js). Keep it that way; gameplay logic goes there with unit tests.
- Game numbers live in `src/sim/data.ts`. When a player-facing value changes, update `docs/creatures-and-moves.md` or `docs/combat-rules.md`.
- New judgment call → append a numbered entry to `docs/decisions.md`. Parked problem → `docs/blockers.md`.
- Every new voice word goes in `src/voice/aliases.ts` in **both** EN and IT, with a parser test.
- Online play is host-authoritative: new player actions are sim intents, and must be allowed by the sanitizer in `src/net/sessions.ts`.
- Don't merge into `main` or change `main` without the user's OK. Never force-push.
- Before calling work done: `npx tsc --noEmit && npm test`, plus the relevant headless scripts (see testing doc).
- End of every milestone: once checks pass, commit on the branch right away (no waiting for a playtest) and tell the user; save all progress
  (Status above + the relevant docs) so a fresh session can continue from the files alone. The user playtests a whole feature at once,
  at the end, before any merge into `main`. Then ask the user to /clear before starting the next patch or task.

## Commands
`npm run dev` · `npm test` · `npm run build` · `node scripts/smoke.mjs --full` (more in docs/testing.md)

## Status
- **Branch:** `encouragements` (off `main`; merging to `main` publishes live, so ask first). `main` = live verbal-boosts version.
- **Live:** https://giovannialtamore00-create.github.io/yappemon/ (repo `giovannialtamore00-create/yappemon`, every push to
  `main` redeploys via CI). Linked from a card on Platypus (`C:\Users\giova\platypus-site`).
- **Feature (user request 2026-10-09):** M1 move uses per round (5/10/15/20 by cost tier) · M2 creature name before a command = +10 accuracy
  (capped 100, every move of that command, any stage name of the active creature) · M3 encouragement words, instant, free, don't interrupt:
  Forza/"come on" +5% stamina, Resisti/"stay strong" +2% temp HP, Coraggio/"courage" +1% temp HP, Perfetto/"perfect" +5% stamina,
  Non arrenderti/"don't give up" heal 5% (% of max). Temp HP soaks damage first, lasts 10 s, max 10% of max HP. Same word again within
  10 s = 50% chance of no effect (seeded sim RNG). 5 s gap between any two encouragements (user set). "forza" is currently a filler word
  (aliases.ts) and "hold on" means stop: handle both. Flash word + sound each. Then user playtest of everything, then ask before merging.
- **Done:** M1 (decision #75: `MoveDef.uses`, `CreatureState.used`, `usesLeft`, fail `no_uses`, bot skips used-up moves, "x/y" on move cards;
  tests, `scripts/uses-shots.mjs`, net + flow OK).
- **Done:** M2 (decision #76: `named` flag parser → `QAction` → `Strike`, `NAME_ACC_BONUS` in hitChance; right-side Words box, name lights green when used; tests, `scripts/name-test.mjs`; net/flow/IT voice/boost scripts OK).
- **Done:** M3 (decision #77: `cheer` intent, `CHEERS` in data.ts, temp HP, 5 s gap, 50% repeat fail; Words box + green flash + sound; tests, `scripts/cheer-test.mjs`; net/flow/IT voice/spectator/name OK, boost-test flaky (blockers)).
- **Rename feature (user request 2026-10-10, branch `rename` off `encouragements`):** M4 creature + move-first-word rename screen (practice) · M5 voice recognises new names (+ `named` bonus) · M6 online sync + `sanitizeNames`.
- **Done:** M4 (decision #78: `src/names.ts`, `Screens.rename`, HUD/toasts use names; `scripts/rename-test.mjs` OK, tests pass). Note: the "say …" hint shows the new move name but voice only knows the old one until M5.
- **Next:** M5 (parser `ParseContext.names`), then M6. Old Next, still pending: user playtests the whole feature (M1–M3) at once → fixes as new commits → ask before merging `encouragements` into `main` (publishes live).
- **Creatures feature (user request 2026-10-10, branch `creatures` off `rename`; plan in decisions #79):** 8 new 3-stage lines (Rock/Earth dual, Flying, Psychic, Ghost/Dark dual, Dragon, Poison, Steel, Ice) with different body shapes per stage; every evolution (new + existing lines) learns one off-type move (existing lines keep their same-type evo move and add one). M7 types engine · M8 existing lines +off-type moves · M9 batch A (Rock/Earth, Flying, Psychic) · M10 batch B (Ghost/Dark, Dragon, Poison) · M11 batch C (Steel, Ice, 12-card team screen) · M12 docs check + net check (balance dropped).
- **Done:** M7 (decision #79: 10 elements, dual types, chart, badges/VFX/SFX hooks; tests pass).
- **Done:** M8 (decision #80: 8 off-type evolution moves on the existing lines, EN+IT voice, fallback VFX/SFX; tests 289 pass, `scripts/offtype-shots.mjs`).
- **Done:** M9 (decision #81: Gravelo/Pipwing/Wispurr lines with 9 models, 18 moves, EN+IT voice, team screen 7 cards; tests 351 pass, `scripts/newcreatures-test.mjs`, flow/net OK). User approved the look (said go).
- **Done:** M10 (decision #82: Dusklet/Scalet/Gloopit lines, 9 models, 18 moves, EN+IT voice; tests 402 pass, `scripts/newcreatures-test.mjs` all 6 lines OK).
- **Done:** M11 (decision #83: Cogling/Gearhound/Mechadon Steel + Flurrbit/Hailstag/Glaciarch Ice, 6 models, 12 moves, EN+IT voice; tests 438 pass, `scripts/newcreatures-test.mjs` all 8 lines OK). 
- **Done:** team-screen fix (decision #84): scrolling card grid with a picture of each creature; `scripts/team-shots.mjs` OK.
- **Next:** M12 docs check + net check (balance dropped by user, 2026-10-10), then user playtest of everything and ask before merging.
- **Earlier feature (verbal boosts, decisions #73–74):** on `main`; user still to try boosts by voice in Chrome.
- **Known issues:** `smoke.mjs --full` crashes headless Chrome on an audio-device error, also before this feature (docs/blockers.md).
## Docs (read only what the task needs)
- [docs/architecture.md](docs/architecture.md): every `src/` file, how modules connect, where data lives. Read before touching code you haven't seen this session.
- [docs/combat-rules.md](docs/combat-rules.md): rounds, evolution, move choice, damage, accuracy, stamina, interrupts. Read for gameplay/balance changes.
- [docs/creatures-and-moves.md](docs/creatures-and-moves.md): creature stats, all moves (costs, accuracy, effects), type chart. Read for move/creature work.
- [docs/voice-commands.md](docs/voice-commands.md): all EN/IT commands, chaining, dodge/alert. Read for parser or command changes.
- [docs/testing.md](docs/testing.md): headless scripts, test URL options, page hooks, Windows/headless tips. Read before verifying.
- [docs/decisions.md](docs/decisions.md): numbered design decisions (#1–78, newest last). Grep for a topic; don't read it all.
- [docs/playing.md](docs/playing.md): player setup, online play, browser requirements, known limitations.
- [docs/deploy.md](docs/deploy.md): GitHub Pages / Netlify deploy and CI. Read only for deploy work.
- [docs/blockers.md](docs/blockers.md): parked problems.
- [docs/history/movement-update-plan.md](docs/history/movement-update-plan.md): finished plan of the movement update. Only for deep changes to hit resolution, dodge, movement or camera.
