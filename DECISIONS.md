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
