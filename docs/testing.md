# Testing

## Commands

```bash
npm run dev              # dev server → http://localhost:5173
npm test                 # unit tests (tests/sim, parser, net) – Vitest
npx tsc --noEmit         # type-check only
npm run build            # type-check + production build to dist/
npm run preview          # serve dist/
```

Playwright needs Chromium once: `npx playwright install chromium`.

## Headless scripts (`node scripts/<name>.mjs`)

| Script | What it checks |
|---|---|
| `smoke.mjs [--full]` | Practice vs Bot end-to-end, screenshots in `./screenshots` |
| `flow-test.mjs` | Italian UI, voice forced switch, leave, phone layout |
| `italian-voice-test.mjs` | Italian voice commands incl. dodge window / alert |
| `boost-test.mjs` | Verbal boosts in a match: pre-match voice check (dots, done), boost reaches the sim, SNAP/HYPE/FULL POWER flashes (screenshots in `screenshots/boosts/`), FULL POWER chip + cooldown, Italian label |
| `prosody-test.mjs` | Verbal boosts: fake mic plays a synthetic WAV; debug panel must show HYPE!, SNAP!, FULL POWER! on the right words |
| `net-test.mjs` | Two headless players over the real PeerJS broker (needs internet) |
| `spectator-test.mjs` | Spectator room with two players |
| `preview-test.mjs` | Production build served under `/yappemon/` |
| `loadout-shots.mjs` | Move-choice panel screenshots |
| `creature-sheet.mjs` | Lineup of all 12 creature forms |
| `vfx-shots.mjs [species]` | Screenshot every move's VFX |
| `move-shots.mjs` | Move animations → `screenshots/move` |
| `evo-shots.mjs` | Evolution sequence |
| `music-test.mjs` | Battle music |
| `name-test.mjs` | Creature name bonus: "Cindrix, cinder spit" reaches the sim as a named move; plain / other-creature commands don't |
| `contact-sheet.mjs <dir> <out.png>` | Combine screenshots into one image for review |

**Full verification before a merge:** `npx vitest run`, `smoke.mjs --full`, `flow-test.mjs`, `italian-voice-test.mjs`, `net-test.mjs`, `spectator-test.mjs`, plus the screenshot scripts relevant to the change.

## Tips

- Windows; use the Bash tool (Git Bash). For multi-line code edits, write a small `.cjs` script to the scratchpad and run it with node, or use the Edit tool. Never put backticks inside `node -e "..."` in bash.
- Headless WebGL needs chromium args `--use-angle=swiftshader --enable-unsafe-swiftshader` (already in the scripts). Headless pages render slowly (~5 fps): use generous timeouts.
- Page test hook: `window.__yappemon.say(text, boost?)` (boost = `snap`/`hype`/`full`, skips the mic), `.state()`, `.app` (e.g. `app.battle.session.runner` in practice mode).
- URL options: `?seed=7&botTeam=vinram,brinkle&bot=passive&loadout=0` (`loadout=0` skips the move-choice panel). `?prosody=1` adds the voice-boost debug panel (live loudness/pitch, per-utterance scores) for tuning thresholds with a real mic.
- In battle, the backtick key (`` ` ``) opens a hidden text box that goes through the same voice parser.
- Sim tests use `sureHits()` (all accuracies 100, restored after each test) when testing other mechanics.

- Pre-match voice check: in headless Chrome without a fake mic it gives up after ~1.8 s and the match starts, so scripts should wait for `__yappemon.state()` instead of a fixed time. With `--use-fake-device-for-media-stream` the fake mic beeps once a second, which is measured as SNAP: tests clear `app.mic.recent` before commands (see boost-test.mjs).
