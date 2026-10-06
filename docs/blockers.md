# Blockers

Parked problems. Format: what's wrong / repro / tried / hypotheses / help needed.

- **`smoke.mjs --full` page crash (2026-10-06).** Headless Chrome crashes mid-match with "The AudioContext encountered an error from the audio device or the WebAudio renderer". Repro: `node scripts/smoke.mjs --full` (random seed, plays to the end). Also happens on `86dcc03` (before verbal boosts), 2 of 3 runs; the short smoke, flow, net and Italian voice scripts pass. Hypothesis: this machine's audio device / headless WebAudio during long runs, not game code. Possible fix: launch with `--mute-audio` or a fake audio output for the test.
