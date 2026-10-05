# PROGRESS

**Current work:** branch **`loadout-evolutions`** (from `main`, which now includes the movement update — merged locally, not pushed). Adds the move-choice panel before every round and distinct shapes per evolution stage (DECISIONS #71–72). NOT merged into `main` yet: ask the user first.
**Status:** both features done and verified (unit tests, smoke, flow, net, spectator, Italian voice, new `scripts/loadout-shots.mjs` and `scripts/creature-sheet.mjs`). Waiting for the user to try it and approve merging.

The user approved the plan (DECISIONS #61–66). Don't merge into `main` or change anything on `main` without the user's permission. The live link is no longer needed (the user said so), so `dist/` can be rebuilt freely.

## Agreed design (implement exactly this)

**Hit resolution (accuracy-based, no hitboxes):** when a strike resolves (`resolveStrike` in `src/sim/sim.ts`):
1. Target fainted / recalled → fizzle (unchanged).
2. Target mid-dash (`invulnTicks > 0`) → `dodged` event. **Attacker keeps its queue** (no `fail`).
3. Target has an armed dodge window (`dodgeReady > 0`), the move is NOT `quick`, the target isn't rooted and its own action isn't in the `active` phase → trigger a dash now (cancel the target's own windup if it was winding up; stamina already spent is lost), consume the window (`dodgeReady = 0`, events `dodge_ready` off + `dodge`), `dodged` event. Attacker keeps its queue.
4. Otherwise roll: `chance = min(1, accuracy/100 × stateMod)`, stateMod = **1.2** if the target is doing a move (any phase of a `move` action), **0.7** if `alertTicks > 0`, else **1.0**. Export a pure `hitChance(move, target)` for tests. Miss → `miss` event; attacker keeps its queue.
5. Hit → apply the effect as today (damage / root / static / mirror reflect / alsoRoot). Then **clear the target's remaining queue** (not its current action) and emit `combo_broken {p, lost}` if it had queued commands. A 25+ hit during a windup still cancels that action (existing `interrupted` fail). Reflect (Tide Mirror) counts as the attacker getting hit → the attacker's queue is cleared too.
6. `fail` remains only for: out of stamina, target recalled, no bench, rooted dodge. Remove the old "dodged → fail attacker" and "reflected → fail" behaviour; the `failOwner`/`quiet` multi-hit logic can be simplified.

**Moves (`src/sim/data.ts`):** add `accuracy` to every move:
- quick (`quick: true`): shell_ram, bubble_bump, horn_charge, wing_flick → windup **0.15 s** (not scaled by speed class), power **8, 8, 9, 8**, base cost **15** (→ 20 after the existing ×1.35 scaling), accuracy **100**.
- projectiles/beams (cinder_spit, water_jet, leaf_volley, spark_dart): **90**; status (vine_snare, static_field): **85**; heavies: magma_burst 80, tidal_crash 80, thorn_quake 80, thunder_lance 75, volcanic_ruin 75, maelstrom 80, sky_judgement 75; molten_leap 85, bramble_stampede 90, chain_storm 85 (per bolt); self moves 100 (ignored).
- **Minimum windup 0.6 s** for every non-quick attacking move (cinder_spit, water_jet, leaf_volley, vine_snare, spark_dart, static_field are 0.4–0.5 now → 0.6). Self moves keep their windups.
- Constants: `DODGE_COST = 5` (NOT scaled by ×1.35), `DODGE_WINDOW_S = 2`; dash: invulnerable 0.4 s, lasts 0.3 s, moves 1.8 m, 1 s cooldown after a dash. `ALERT_COST = 15` (not scaled), `ALERT_S = 3`, `ALERT_EVADE = 0.7`, `ATTACKING_EXPOSED = 1.2`.
- Drop the old "dodge jumps the queue and is a timed action" behaviour: a `dodge` QAction is now **instant** — when reached in the queue (or when sent alone: apply immediately even if the creature is busy), spend 5, set `dodgeReady = 2 s`, `dodgeDir` from `dir`, event `dodge_ready` on. Rooted → `fail('rooted')`. Not enough stamina → `fail('stamina')`. The window expires silently (event `dodge_ready` off).
- `alert` QAction = an action lasting 3 s (occupies the action slot so queued attacks wait; not interruptible); costs 15, sets `alertTicks`, events `alert` on/off.

**Movement (in the sim, deterministic):** each tick, when the active creature has no action (or is in `alert`) and isn't rooted: strafe along world x at species speed (slow 1.2, medium 1.6, fast 2.2 m/s; ×1.4 when alert); reverse `driftDir` at the bounds or when `strafeTicks` runs out (re-roll 0.8–2.2 s with the sim RNG); step in/out on z toward a preferred distance from the opponent (cindrix line 4.5, brinkle line 5.5, vinram line 4, joltmoth line 5), max 0.8 m/s. **Bounds: |x| ≤ 4.5; player 0 z ∈ [1.0, 5.2], player 1 z ∈ [−5.2, −1.0]** (each stays on its own half so the first-person camera works). While doing a move (windup/active/recovery) the creature stands still — that's why it's easier to hit. Dash: move 1.8 m along world x over 0.3 s (requested side converted to world x — player 1 faces +z so its "left" is world +x; auto = away from the nearer x-bound, else random), clamped. `sendOut` / round setup put the creature at its home spot (x 0, z ±3). This replaces the old lateral-drift code. Strike travel time = real distance between the creatures / speed (was a constant 6 m); store `fromX/fromZ/toX/toZ`.

**Voice (`src/voice/aliases.ts`, `parser.ts`):** the dodge command takes an optional direction word in the same segment: left / sinistra / sx → −1, right / destra / dx → +1. New `alert` command, aliases: alert, on guard, guard, careful, watch out, be careful / attento, attenta, guardia, in guardia, stai attento, occhio. `toIntents`: dodge → `{kind:'dodge', dir}`, alert → `{kind:'alert'}`. Add parser tests (EN/IT).

**Bot (`src/sim/bot.ts`):** arm a dodge when the foe starts a non-quick heavy windup (~50%), occasionally alert when low on HP, otherwise random affordable moves as now.

**Render:**
- `src/render/view.ts`: creature world position = smoothed sim (x, z) (no more `worldX`/`creatureZ` mirroring for creatures); yaw faces the opponent (`atan2(dx, dz)`; models face +z). Melee reach = current distance − 1.3 m: change `src/render/motion.ts` so `movePose(move, phase, k, time, reach)` takes the reach instead of the `REACH` constant; quick moves get a very short snappy lunge. Dash: quick lateral hop with roll (the sim moves x; the view smooths fast). Subtle ring/glow under a creature while `dodgeReady > 0`, stance glow while `alertTicks > 0`. On `miss`: the target does a small visual sidestep + floating "Miss!"; on `combo_broken`: toast "Combo broken!" / "Combo interrotta!" for the victim.
- Update every place that used `creatureZ(p)` / `worldX(p, x)` for creatures (creaturePos, headPos, mouthPos, forward(), recall beam, telegraph, strikes from/to). The evolution sequence can keep the home spots.
- **Dynamic camera** (`src/render/scene.ts`): the battle camera stays behind the trainer (z = ±7.6) but slides x toward ~40% of the own creature's x, looks at a point between the creatures (~60% toward the opponent, y ≈ 0.5), and backs off/raises slightly when they're far apart. Feed positions via a new `ctx.setFocus(mine, foe)` called by the view each frame. The spectator camera looks at the midpoint.
- HUD (`src/render/hud.ts`): move cards show accuracy % and a "QUICK" / "RAPIDA" tag; commands row: `dodge 5⚡` (glows while the window is armed), `alert 15⚡`, come back/go, stop, chain hint. New i18n strings EN/IT (`src/i18n.ts`); update `src/movedesc.ts` for the quick moves' new damage.
- Audio (`src/audio/sfx.ts`): small whoosh on `miss`, click on `dodge_ready`.

## Steps (commit after each)
1. ✅ types.
2. ✅ Sim + data changes above; rewrite/extend `tests/sim.test.ts` (accuracy + state modifiers via `hitChance`, miss keeps queue, hit clears queue + combo_broken, dodge window auto-dodges normal attacks but not quick ones, window expiry, dodge cost 5, alert, movement stays in bounds and is deterministic, bot-vs-bot still finishes). `npx tsc --noEmit && npx vitest run` green.
3. ✅ Voice parser (dodge direction, alert) + tests. ("to"/"verso" are now fillers; a side word without a dodge in its segment is reported as unmatched.)
4. ✅ Bot (arms the window when ≤1.2 s of a heavy windup is left, 50%; alert 25% per decision under 35% HP). Bot-vs-bot over 20 seeds: ~134 s per match, ~6% of attacks miss.
5. ✅ View + motion (positions, facing, reach, dash, miss sidestep, dodge ring + alert hexagon). Visual check: `node scripts/move-shots.mjs` → screenshots/move. Projectiles fly at the target's current spot. The "Combo broken!" toast is left for step 7 (needs i18n). Known for step 7: HUD queue chip labels `alert` as "Come back" (hud.ts ~227).
6. ✅ Dynamic camera (`ctx.setFocus(mine, foe)` from BattleView.update; home spots during the evolution sequence; `setFocus(null)` on dispose).
7. ✅ HUD / i18n / audio (accuracy % + QUICK/RAPIDA on cards, alert command chip, armed dodge chip glows, queue chips for alert and dodge sides, "Combo broken!" toast, miss whoosh / dodge_ready click / alert chime). Commands row now wraps to 2 lines at 1280 px.
8. ✅ Full verification (all scripts + 208 unit tests green, build OK; italian-voice-test updated for the dodge window/alert and the removed `.moves-title`). Original plan: `npx vitest run`, `node scripts/smoke.mjs --full`, `node scripts/flow-test.mjs`, `node scripts/italian-voice-test.mjs`, `node scripts/net-test.mjs`, `node scripts/spectator-test.mjs`, `node scripts/vfx-shots.mjs` + `node scripts/evo-shots.mjs` (review screenshots with `node scripts/contact-sheet.mjs <dir> <out.png>`). Some scripts assume the old dodge/queue rules and may need small updates. Update README (rules, commands, costs) and DECISIONS. Then tell the user it's ready to try (`npm run dev` → http://localhost:5173) and **ask before merging into `main`**.

## Context for a fresh session
- Windows; use the Bash tool (Git Bash). For multi-line code edits, write a small `.cjs` script to the scratchpad and run it with node, or use the Edit tool — never put backticks inside `node -e "..."` in bash.
- Headless WebGL needs chromium args `--use-angle=swiftshader --enable-unsafe-swiftshader` (already in the scripts). Three headless pages render slowly (~5 fps): use generous timeouts.
- Page test hook: `window.__yappemon.say(text)`, `.state()`, `.app` (e.g. `app.battle.session.runner` in practice mode). URL options: `?seed=7&botTeam=vinram,brinkle&bot=passive`.
- Already released on `main` (don't regress): best-of-3 rounds with 3 evolution stages, per-move animations (`src/render/motion.ts`), spectator rooms, 8-bit music (`src/audio/music.ts`), bottom move bar, energy gauge, commands row, EN/IT voice, balance (super effective ×1.25, costs ×1.35), no ambient loop.

## Implementation notes (step 2)
- `dodge` event `dir` is the **world-x** direction of the dash (already converted from the requested side); the view can use it directly.
- The 1 s dash cooldown only blocks the *window* from triggering another dash (re-arming is allowed; an attack landing during the cooldown rolls accuracy normally).
- The window also triggers during alert (alert keeps going) but not during a recall or while the dodger's own move is in its `active` phase.
- `FailReason` no longer has `dodged` / `reflected` (FAIL_REASON strings removed in `src/i18n.ts`). `net/sessions.ts` sanitizer now passes `alert` and `dodge.dir`.
- Tests use `sureHits()` (all accuracies 100, restored after each test) where they test other mechanics.
