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
- End of every task: once the user has tested and approved it, commit, save all progress (Status above + the relevant docs) so a
  fresh session can continue from the files alone, then ask the user to /clear before starting the next patch or task.

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
  (aliases.ts) and "hold on" means stop: handle both. Flash word + sound each. PAUSE after M3 for user playtest, then ask before merging.
- **Done:** M1 (decision #75: `MoveDef.uses`, `CreatureState.used`, `usesLeft`, fail `no_uses`, bot skips used-up moves, "x/y" on move cards;
  tests, `scripts/uses-shots.mjs`, net + flow OK).
- **Done:** M2 (decision #76: `named` flag parser → `QAction` → `Strike`, `NAME_ACC_BONUS` in hitChance; right-side Words box, name lights green when used; tests, `scripts/name-test.mjs`; net/flow/IT voice/boost scripts OK).
- **Next:** M3 (encouragements; their words go in the right-side Words box above the creature name).
- **Earlier feature (verbal boosts, decisions #73–74):** on `main`; user still to try boosts by voice in Chrome.
- **Known issues:** `smoke.mjs --full` crashes headless Chrome on an audio-device error, also before this feature (docs/blockers.md).
## Docs (read only what the task needs)
- [docs/architecture.md](docs/architecture.md): every `src/` file, how modules connect, where data lives. Read before touching code you haven't seen this session.
- [docs/combat-rules.md](docs/combat-rules.md): rounds, evolution, move choice, damage, accuracy, stamina, interrupts. Read for gameplay/balance changes.
- [docs/creatures-and-moves.md](docs/creatures-and-moves.md): creature stats, all moves (costs, accuracy, effects), type chart. Read for move/creature work.
- [docs/voice-commands.md](docs/voice-commands.md): all EN/IT commands, chaining, dodge/alert. Read for parser or command changes.
- [docs/testing.md](docs/testing.md): headless scripts, test URL options, page hooks, Windows/headless tips. Read before verifying.
- [docs/decisions.md](docs/decisions.md): numbered design decisions (#1–75, newest last). Grep for a topic; don't read it all.
- [docs/playing.md](docs/playing.md): player setup, online play, browser requirements, known limitations.
- [docs/deploy.md](docs/deploy.md): GitHub Pages / Netlify deploy and CI. Read only for deploy work.
- [docs/blockers.md](docs/blockers.md): parked problems.
- [docs/history/movement-update-plan.md](docs/history/movement-update-plan.md): finished plan of the movement update. Only for deep changes to hit resolution, dodge, movement or camera.
