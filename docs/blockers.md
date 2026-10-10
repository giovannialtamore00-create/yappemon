# Blockers

Parked problems. Format: what's wrong / repro / tried / hypotheses / help needed.

- **`smoke.mjs --full` page crash (2026-10-06).** Headless Chrome crashes mid-match with "The AudioContext encountered an error from the audio device or the WebAudio renderer". Repro: `node scripts/smoke.mjs --full` (random seed, plays to the end). Also happens on `86dcc03` (before verbal boosts), 2 of 3 runs; the short smoke, flow, net and Italian voice scripts pass. Hypothesis: this machine's audio device / headless WebAudio during long runs, not game code. Possible fix: launch with `--mute-audio` or a fake audio output for the test.

- **`boost-test.mjs` flaky (2026-10-09).** Fails at random checks (e.g. "plain command, no boost (null)", "HYPE stamina") in some runs, also on the M2 commit without M3 changes. Hypothesis: fixed `waitForTimeout` waits vs slow headless frames (sim falls behind real time). Fix: wait on sim state instead (as cheer-test.mjs does). Not fixed yet.

- **spectator-test.mjs fails at connect** (found 2026-10-10 during M6): the clients get "Could not connect to peer" to a spectator-hosted room, also on the commit before M5/M6. Plain host/join (`net-test.mjs`) works. Not investigated; the spectator rename path (`spectatorTeams`) is therefore untested end to end.
