# DECISIONS

Judgment calls made where the spec was silent. Newest at the bottom.

1. **GitHub deploy left to the user.** The user went remote before `gh auth login` could be done (it needs a browser + admin prompt). Everything is prepared; README has the one-time steps.
2. **Project name** "YAPPEMON" kept as working title (user may rename).
3. **Hit resolution is invulnerability-based, not positional.** Every attack becomes a "strike" that resolves after a travel time (melee instant; projectiles distance/speed; beams/ground short delay). If the target is in its dodge invuln window at resolution → dodged. Creatures' lateral drift is cosmetic for aiming. Keeps the sim simple, deterministic and fair under network latency.
4. **Dodge jumps the queue.** A command that *starts* with dodge cancels the current windup/recovery (stamina already spent is lost) and runs immediately; anything said after it ("dodge then spit") runs next, then the old queue. Otherwise dodge would be useless behind a queued move. A dodge in the middle of a chain ("spit then dodge") is queued normally.
5. **Dodge on cooldown waits** at the head of the queue instead of failing. **Dodge while rooted fails** (counts as a failed action → queue cleared), matching "target cannot dodge".
6. **Root** stops dodging and idle drift. Melee dashes still animate in place.
7. **Stamina** is spent when an action starts (windup), so an interrupted/dodged move still costs stamina. Bench creatures also regenerate stamina.
8. **Recall** = 1.5 s action (vulnerable, not interruptible), then the other creature is sent out automatically (teams have 2 creatures, so there is only one possible replacement). Send-out takes 1.0 s during which the newcomer is untargetable; attacks that resolve then fail with "target recalled".
9. **"go <creature>"** outside a forced switch = recall into that creature, if it's the benched one.
10. **When a creature faints**, the opponent's queue and current move are cleared silently (not a "failure": nothing to aim at). In-flight strikes at the fainted creature vanish.
11. **Both trainers out on the same tick → draw.**
12. **Damage** is rounded to an integer, minimum 1. HP is a float internally (healing over time); HUD shows ceil.
13. **Speed class** scales move phase durations: slow ×1.15, medium ×1, fast ×0.85; also idle drift speed.
14. **Move timings** (s, windup/active/recovery): light melee ≈0.35/0.25/0.35; projectiles ≈0.45/0.15/0.45; heavies 1.1–1.4 s windup. Projectile speeds: Cinder Spit 14 m/s, Leaf Volley 12, Vine Snare 11, Spark Dart 22, Thunder Lance 45, Tidal Crash wave 9, Thorn Quake spikes 10; Magma Burst erupts 0.15 s after active start; Water Jet 0.15 s.
15. **Vine Snare and Static Field can be dodged** (they're attacks on the opponent). Missing them fails the action like any other.
16. **Practice bot** dodges only heavy windups (≈45% of the time, timed late in the windup) and recalls rarely when low.
17. **Parser accepts both languages at once** regardless of the selected recognition language (Italians often say English move names and vice versa). Connectors also include "and", "e", "ed", "than" (common mishearing of "then").
18. **Parser is context-aware:** when the active creature is known, only its moves are matched (plus universal commands and creature names). Much fewer false matches.
19. **Matching:** token windows vs every phrase; similarity = 1 − Levenshtein/len on space-less text, max of raw and a phonetic fold (h dropped, c/q→k, z→s, y→i, w→v, doubles collapsed). Thresholds: phrases ≤4 letters exact only; 5–6 letters ≥0.8; longer ≥0.74.
20. **Adjacent identical matches in one segment are merged** (pieces of one garbled name). Saying the same move twice needs a connector: "spit then spit".
21. **A creature name said with other commands is just addressing it** ("Cindrix, magma burst") and is dropped. A bare name or "go/vai <name>" = switch to it. "first/second/primo/secondo" only matter during a forced switch.
22. Common exclamations ("mamma mia", "wow", "no", "si"…) are ignored words, since some sit one edit away from keywords.
23. **Teams must be 2 different species** per player (cards toggle), so "go <name>" is never ambiguous. Both players may still pick the same species as each other.
24. **UI language follows the voice language** chosen in the lobby (EN/IT), remembered in localStorage.
25. **Practice bot team** is 2 random distinct species.
26. **Render layout:** sim distance is 6 m; creatures render at z = ±3, trainers at z = ±7.6, camera FOV 56°, eye height 1.6 m. Each player sees their own creature from behind; the opponent's trainer figure stands at the far end.
27. **Heavy ground moves telegraph** a pulsing circle under the target during the windup, so dodging by voice is feasible.
28. **HUD is DOM-based** (crisp text, cheap), the 3D scene only renders the world and VFX. Floating damage numbers are DOM elements positioned by projecting 3D points.
29. **Recognizer alternatives:** with `maxAlternatives = 4`, the first alternative that parses into an actionable command is used (helps a lot with invented names).
30. **Voice runs only during a battle** (incl. the forced-switch prompt); it stops on the end screen and in menus. Recognition auto-restarts when Chrome ends a session, with exponential backoff on errors; "mic blocked" stops retrying and shows a toast.
31. **Supported-browser check:** SpeechRecognition must exist and the browser must be Chrome/Edge/Chromium (Brave/Opera excluded — they expose the API but it doesn't work). Others get a warning in the lobby and a toast in battle; the debug box still works.
32. **Test-only URL options** `?seed=`, `?botTeam=a,b`, `?bot=passive` for deterministic headless tests. Harmless for players.
33. **Room codes** use a 31-character alphabet without 0/O/1/I/L so they can be read aloud; PeerJS id = `cbattle-<CODE>`. If the id is taken, the host silently picks a new code (up to 5 tries).
34. **Host = player 0, joiner = player 1.** The host sends `start` with both teams once both are ready; the client renders host snapshots 110 ms behind (clock offset estimated from snapshot ticks), and receives events when their snapshot is displayed so effects line up with motion.
35. **Remote input is sanitized** on the host (only known intent shapes, max 8 intents, max 4 actions each); a remote team must be 2 distinct known species.
36. **Disconnect detection:** data-channel close, or 6 s without any message (1 s heartbeat). Quitting sends an explicit `quit`. Either way the other player gets "Opponent disconnected" + Back to lobby.
37. **Rematch** requires both players to press Rematch; whoever presses second triggers it (via the host), then both return to team select. The waiting player sees "Opponent wants a rematch!".
38. **STUN only, no TURN server** (no free reliable TURN exists). Works on most home networks; strict corporate/symmetric NATs can fail — documented in README.
39. **Opponent windup is shown in their HUD panel** ("Charging: Magma Burst!", pulsing red for heavy moves) — voice latency makes reacting to animation alone too hard.
40. **Leave button** during battle (top-right, click) returns to the lobby; online it notifies the opponent.
41. **Phone layout:** panels side-by-side at the top, move list as a 2-column grid above the voice box, toasts lower. The game targets desktop Chrome/Edge but Android Chrome also supports speech recognition.
42. **Heavy windups lengthened** to Magma Burst 1.7 s, Tidal Crash 1.5 s, Thorn Quake 1.5 s (×1.15 slow), Thunder Lance 1.4 s (×0.85 fast) — supersedes the heavy numbers in #14. Speech recognition delivers final results ~0.6–1.2 s after speaking, so shorter windups made voice dodging nearly impossible. Longer windups also make interrupting (25+ dmg) a real tactic.
43. **Deployment:** GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`, runs tests + build on every push to main). Vite `base: './'` so the same build works under `/<repo>/` and on Netlify. `scripts/publish.ps1` automates the one-time GitHub setup for a non-expert on Windows (install gh, log in, create public repo, enable Pages with source "GitHub Actions", push, watch the run).
44. **Node 22.12+ required** (`engines` in package.json) because Vitest 5 needs it; CI uses Node 22.
45. **Background-tab keep-alive:** during online matches a tiny Web Worker timer drives `battle.frame()` while the tab is hidden (rAF is paused there), so the host alt-tabbing doesn't freeze the match.
