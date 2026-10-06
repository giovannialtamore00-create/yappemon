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

## Commands
`npm run dev` · `npm test` · `npm run build` · `node scripts/smoke.mjs --full` (more in docs/testing.md)

## Status
- **Branch:** `verbal-enhancements`, from `loadout-evolutions` (move-choice panel + evolution shapes, #71–72), which still
  awaits the user's OK to merge into `main` (`main` has the movement update, merged locally, not pushed). Ask before merging.
- **Feature:** verbal boosts = how a command is said: SNAP (sharp attack), HYPE (pitch rise), FULL POWER (stretched vowel). See decision #73.
  Milestones: M1 voice measurement · M2 sim effects (+ sanitizer, docs) · M3 voice→intents, mic calibration at match start, flash words + sounds, FULL POWER cooldown icon (ZZZ…).
- **Done:** M1 (`src/voice/prosody.ts`, `mic.ts`, `?prosody=1` debug panel; user approved detection by voice).
  M2 (boosts in the sim: `boost` on move `QAction`, `SimState.fullPowerCd`, `boost` event; sanitizer; tests; combat-rules.md).
- **Next:** M3 (wire voice → move boost on the first move of the command, calibration step at match start, flashes, cooldown icon). Ask before starting.
- **Known issues:** `smoke.mjs --full` crashes headless Chrome on an audio-device error, also before this feature (docs/blockers.md). The live deploy link isn't needed for now, so `dist/` can be rebuilt freely.

## Docs (read only what the task needs)
- [docs/architecture.md](docs/architecture.md): every `src/` file, how modules connect, where data lives. Read before touching code you haven't seen this session.
- [docs/combat-rules.md](docs/combat-rules.md): rounds, evolution, move choice, damage, accuracy, stamina, interrupts. Read for gameplay/balance changes.
- [docs/creatures-and-moves.md](docs/creatures-and-moves.md): creature stats, all moves (costs, accuracy, effects), type chart. Read for move/creature work.
- [docs/voice-commands.md](docs/voice-commands.md): all EN/IT commands, chaining, dodge/alert. Read for parser or command changes.
- [docs/testing.md](docs/testing.md): headless scripts, test URL options, page hooks, Windows/headless tips. Read before verifying.
- [docs/decisions.md](docs/decisions.md): numbered design decisions (#1–72, newest last). Grep for a topic; don't read it all.
- [docs/playing.md](docs/playing.md): player setup, online play, browser requirements, known limitations.
- [docs/deploy.md](docs/deploy.md): GitHub Pages / Netlify deploy and CI. Read only for deploy work.
- [docs/blockers.md](docs/blockers.md): parked problems.
- [docs/history/movement-update-plan.md](docs/history/movement-update-plan.md): finished plan of the movement update. Only for deep changes to hit resolution, dodge, movement or camera.
