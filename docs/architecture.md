# Architecture

TypeScript + Vite + Three.js + PeerJS, browser only. `index.html` has `#scene` (canvas), `#hud`, `#screens`, `#toasts` and loads `src/main.ts`.

## Layout and dependency direction

```
src/sim/     deterministic combat simulation (30 Hz, seeded RNG), no DOM/Three.js, fully unit-tested
src/voice/   speech capture (Web Speech API) + pure EN/IT command parser with fuzzy matching
src/net/     PeerJS host/join, protocol, host-authoritative snapshots + client interpolation
src/render/  Three.js scene, procedural creatures, animation, VFX, HUD
src/audio/   Web Audio synthesized SFX and music
src/ui/      lobby, team select, loadout panel, switch prompt, end screen
src/game/    session (local/host/client) and battle controller
```

`main` → `game/*`, `net/*`, `render/*`, `ui/*`, `voice/*`, `audio/*` → `sim/*`. `sim/` imports nothing outside itself.

## How it runs

- **Main loop** (`src/main.ts`): `requestAnimationFrame` → `battle.frame(dt)` → `showcase.update` → `ctx.update` / `ctx.render`. In online matches with the tab hidden, a Blob Worker `setInterval` (50 ms) keeps calling `battle.frame` so the host's sim doesn't freeze.
- **Sessions** (picked by mode): Practice = `LocalSession` (sim + `Bot`); online host = `HostSession`; joiner = `ClientSession`; spectator room = `SpectatorHostSession`.
- **Frame:** `Battle.frame(dt)` → `session.update(dt)` returns `SimEvent[]` → `view.update(dt, prev, curr, alpha)` (3D) + `hud.update(curr, me)` (DOM); events become toasts and sounds.
- **Voice path:** `Speech` (final results, up to 4 alternatives) → `parser.parse` / `toIntents` → `session.send(intents)` → sim.
- **Verbal boosts:** `MicProsody` (main, one per match, started by the pre-match voice check `App.voiceCheck` → `Screens.voiceCheck`) measures each utterance. On every recognizer final, `Battle.commandAlternatives` calls `voice.take()` (claims the last 3 s of utterances, teaches the baseline, returns the strongest boost) and puts it on the first move of the command (`attachBoost`). The sim applies it and emits `boost` → `Hud.boostFlash` + `Sfx.boost`. `Hud.setVoice` shows the in-match calibration pill (if the check was skipped) and the FULL POWER chip (`SimState.fullPowerCd`).
- **Loadout (move choice):** sim emits `loadout_start` / `loadout_end` → `Battle.openLoadout` → `screens.loadout(...)`. Changes send `{type:'loadout', slot, moves}` intents; "ready" sends a `ready` intent (voice ready words are `READY_WORDS` in `src/game/battle.ts`, not in aliases.ts). The sim validates with `validLoadout` / `defaultLoadout`.
- **Online:** host = player 0, runs the sim and broadcasts snapshots + events (~20 Hz). Client = player 1, sends only intents and renders snapshots ~110 ms behind. `link.ts` wraps PeerJS (peer id `cbattle-<CODE>`) with a 1 s heartbeat.
- **Rounds:** best of 3 (`ROUNDS_TO_WIN=2`, `MAX_ROUNDS=3`); between rounds creatures evolve (`speciesAtStage`) during a `INTERMISSION_S=7` break.

## src/ files

| File | Purpose | Key exports |
|---|---|---|
| `main.ts` | Bootstrap, menus → battle wiring, rAF loop, background ticker, URL test options | (runs on load) |
| `i18n.ts` | EN/IT UI strings | `t`, `setLang`, `getLang`, `StrKey`, `ELEMENT_LABEL`, `ELEMENT_COLOR`, `FAIL_REASON` |
| `movedesc.ts` | Move-bar effect text (`{d}` = stage-scaled damage) | `MOVE_DESC` |
| `style.css` | All UI/HUD styling | |
| `audio/music.ts` | Live-synthesized 8-bit battle theme | `ChipMusic` |
| `audio/sfx.ts` | All synthesized SFX; owns the music | `Sfx` |
| `game/battle.ts` | One match: drives session, view, HUD; voice/debug text → intents; toasts, sounds, loadout panel | `Battle`, `BattleAudio` |
| `game/session.ts` | Session interface over `SimState`; fixed-tick runner (capped catch-up) | `Session`, `SessionView`, `SimRunner`, `LocalSession` |
| `net/protocol.ts` | Wire messages (JSON), room codes | `PROTOCOL_VERSION`, `PEER_PREFIX`, `makeRoomCode`, `normalizeCode`, `peerIdFor`, `Msg`, `isMsg` |
| `net/link.ts` | PeerJS wrapper: host/join, reliable channel, heartbeat | `Link`, `Pending`, `hostRoom`, `joinRoom` |
| `net/sessions.ts` | Host / client / spectator sessions; remote input sanitizing | `HostSession`, `ClientSession`, `SpectatorHostSession`, `sanitizeTeam`, `sanitizeIntents` |
| `render/scene.ts` | Renderer, camera (dynamic, `setFocus`), arena, layout constants | `createScene`, `SceneCtx`, `CREATURE_Z`, `TRAINER_Z`, `EYE_HEIGHT`, `makeOrb` |
| `render/creatures.ts` | Procedural models for all 12 forms (face +z) | `buildCreature`, `CreatureModel` |
| `render/motion.ts` | Per-move body poses (windup/active/recovery), dodge, alert | `movePose`, `dodgePose`, `alertPose`, `Pose` |
| `render/vfx.ts` | Pooled VFX: particles, beams, arcs, rings, eruptions, spikes, waves | `Vfx`, `FxKind` |
| `render/view.ts` | `SimState` + events → 3D scene (placement, animation, VFX, floating text) | `BattleView`, `FloatText` |
| `render/hud.ts` | DOM HUD: panels, queue chips, move bar, energy gauge, commands row, transcript, toasts, damage numbers | `Hud`, `MicStatus`, `ToastKind` |
| `render/showcase.ts` | Menu background: one creature turning | `Showcase` |
| `ui/screens.ts` | Click menus: lobby, room code, team select, loadout panel, forced switch, end screen, disconnect | `Screens`, `onUiClick`, `setUiClickHandler` |
| `ui/prosodydebug.ts` | `?prosody=1` developer panel: live mic meters, utterance scores, boosts | `mountProsodyDebug` |
| `sim/types.ts` | Pure sim types | `SpeciesId`, `MoveId`, `MoveDef`, `SpeciesDef`, `Intent`, `SimState`, `SimEvent`, `CreatureState`, `TrainerState` |
| `sim/data.ts` | **All game data and tuning constants** | `SPECIES`, `MOVES`, constants below, `scaledCost`, `typeMultiplier`, `speciesAtStage`, `evolutionLine`, `defaultLoadout`, `validLoadout` |
| `sim/sim.ts` | The sim: `step()` mutates state, returns the tick's events | `createMatch`, `step`, `computeDamage`, `hitChance`, `createCreature`, `activeCreature`, `benchSlot`, `distance`, `travelTicks` |
| `sim/bot.ts` | Practice bot (own RNG): random moves every 1–3 s, dodges heavies, alerts at low HP | `Bot`, `BotOptions` |
| `sim/rng.ts` | mulberry32 PRNG (state kept in `SimState`) | `nextRandom`, `Rng` |
| `sim/index.ts` | Barrel re-export (used by tests) | |
| `voice/speech.ts` | Web Speech wrapper, auto-restart, interim text to HUD | `Speech`, `SpeechStatus`, `isSupportedBrowser`, `SPEECH_LANG` |
| `voice/parser.ts` | Transcript → commands → intents (normalize, phonetic fold, Levenshtein) | `parse`, `toIntents`, `normalize`, `fold`, `levenshtein`, `Command`, `ParseContext`, `ParseResult` |
| `voice/aliases.ts` | EN+IT phrases, mishearings, fillers, connectors | `MOVE_ALIASES`, `SPECIES_ALIASES`, `DODGE_ALIASES`, `ALERT_ALIASES`, `RECALL_ALIASES`, `STOP_ALIASES`, `PICK_ALIASES` |
| `voice/prosody.ts` | Pure: mic samples → utterances → scores vs the speaker's baseline → boosts (snap/hype/full); thresholds in `PROSODY` | `ProsodyAnalyzer`, `detectPitch`, `PROSODY`, `Utterance`, `Boosts` |
| `voice/mic.ts` | getUserMedia + AudioWorklet tap feeding a `ProsodyAnalyzer` (runs beside Web Speech); `take()` claims the voice of a recognized command, `calibration()` | `MicProsody` |

## Where data lives

- **`src/sim/data.ts`** (single source of truth): timing `TICK_HZ=30`, `DT`; stamina `STAMINA_MAX=100`, regen/pause, `STAMINA_COST_MULT`, `scaledCost`; `QUEUE_MAX`, `INTERRUPT_THRESHOLD`; damage `STAB`, `SUPER_EFFECTIVE`, `NOT_VERY_EFFECTIVE`; `DODGE_*`, `ALERT_*`, `RECALL_S`, `SENDOUT_S`, `FORCED_SWITCH_S`; arena/movement `ARENA_X_M`, `PREFERRED_GAP_M`, `STEP_SPEED`, `STRAFE_*`, `SPEED_MULT`; rounds/loadout `ROUNDS_TO_WIN`, `MAX_ROUNDS`, `INTERMISSION_S`, `LOADOUT_SIZE`, `LOADOUT_S`.
- **Creatures:** `SPECIES` (4 lines × 3 stages; stage 2 HP ×1.25, dmg ×1.15, +1 move; stage 3 HP ×1.5, dmg ×1.3, +1 move). ID unions in `sim/types.ts`. Models in `render/creatures.ts`.
- **Moves:** `MOVES` (24: 16 base, 4 stage-2, 4 stage-3). Adding a move touches: `types.ts` (id), `data.ts` (def incl. EN/IT `name`), `movedesc.ts` (text), `aliases.ts` (EN+IT words), `motion.ts` (pose), `view.ts`/`vfx.ts` (effects), tests.
- **UI strings:** `i18n.ts`. **3D/world constants:** `render/scene.ts`.

## Tests and CI

- `tests/sim.test.ts` (rules, determinism, rounds, loadout), `tests/parser.test.ts` (EN/IT parser), `tests/net.test.ts` (protocol, sanitizers), `tests/prosody.test.ts` (pitch, utterance split, boosts on synthetic audio). Run with `npm test` (`vite.config.ts`: `tests/**/*.test.ts`, node env). Headless scripts: [testing.md](testing.md).
- `.github/workflows/deploy.yml`: on push to `main`: `npm ci` → `npm test` → `npm run build` → GitHub Pages. See [deploy.md](deploy.md).
