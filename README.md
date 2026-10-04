# YAPPEMON

A 1v1 browser-based 3D creature-battle game you play **with your voice**. You are a trainer at one end of a stone arena; your creature fights your opponent's in real time, and you command it by shouting move names in **English or Italian**. The mouse is only used for menus.

- 4 original creatures, 16 moves, a type chart, stamina, dodging, switching, and a command queue
- Online 1v1 with a friend (room codes, peer-to-peer, no game server) or **Practice vs Bot**
- Everything is procedural: 3D models built from primitives, all sound synthesized, no asset files

---

## Contents

1. [Run it on your computer](#1-run-it-on-your-computer)
2. [Put it online (deploy)](#2-put-it-online-deploy)
3. [Play with a friend](#3-play-with-a-friend)
4. [Voice command reference (English / Italiano)](#4-voice-command-reference)
5. [Creatures, types and rules](#5-creatures-types-and-rules)
6. [Browser requirements](#6-browser-requirements)
7. [Known limitations](#7-known-limitations)
8. [For developers](#8-for-developers)

---

## 1. Run it on your computer

You need **Node.js 22 or newer** ([download the LTS version](https://nodejs.org/)).

```bash
npm install
npm run dev
```

Open the address it prints (usually **http://localhost:5173**) in **Chrome or Edge**. The microphone works on `localhost` without HTTPS.

To build the static site: `npm run build` (output goes to `dist/`).

---

## 2. Put it online (deploy)

The microphone only works on **HTTPS** pages (or localhost), so put the game on a free HTTPS host. Pick **one** of these.

### Option A: GitHub Pages with one script (Windows, recommended)

This repository already contains a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and publishes the game every time you push.

1. Make a free account at [github.com](https://github.com/) if you don't have one.
2. Open **PowerShell** in the project folder (in File Explorer: click the address bar, type `powershell`, press Enter).
3. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\publish.ps1
   ```
   The script:
   - installs the GitHub CLI if needed (click **Yes** on the Windows admin prompt),
   - logs you in (a browser page opens; paste the code it shows),
   - creates a **public** repo called `yappemon`, turns on GitHub Pages and pushes the code,
   - waits for the deploy and prints your game's address: **`https://<your-username>.github.io/yappemon/`**

   To use another repo name: `... -File scripts\publish.ps1 -Repo my-game`.

After that, every `git push` redeploys automatically.

### Option B: GitHub Pages by hand

1. On github.com click **New repository**, name it (for example `yappemon`), choose **Public** and leave it empty (no README).
2. In the project folder run (replace `<you>`):
   ```bash
   git remote add origin https://github.com/<you>/yappemon.git
   git push -u origin main
   ```
3. On GitHub open the repo, then **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open the **Actions** tab. When "Deploy to GitHub Pages" turns green, the game is at `https://<you>.github.io/yappemon/`. If the first run failed because Pages wasn't on yet, click it and choose **Re-run all jobs**.

### Option C: Netlify drag-and-drop (no Git needed)

1. Run `npm install` then `npm run build`.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the **`dist`** folder onto the page.
3. Netlify gives you an `https://….netlify.app` address. Share it.

---

## 3. Play with a friend

Both players open the same game URL in **Chrome or Edge** on their own computers.

1. Both choose a **voice language** in the lobby (each player chooses independently).
2. **One** player clicks **Host game**. A big 5-character **room code** appears; click **Copy** and send it to your friend.
3. The **other** player types the code under **Join game** and clicks **Join**.
4. Both pick **2 creatures** (your first pick goes out first) and click **Ready**.
5. When the browser asks for the **microphone**, click **Allow**.
6. Talk to your creature!

After a match, **Rematch** needs both players to click it; **Quit** goes back to the lobby. If someone closes the tab or loses connection, the other sees "Opponent disconnected".

**Practice vs Bot** lets you play alone. The bot issues random moves every 1–3 seconds and sometimes dodges heavy attacks.

---

## 4. Voice command reference

Speak naturally and **pause briefly** after a command: the game acts when the recognizer finalizes your sentence. The live transcript appears at the bottom of the screen (green = understood, struck through = not understood). You can chain up to **4 actions**.

### Moves

| Creature | English | Italiano | Stamina | Effect |
|---|---|---|---|---|
| **Cindrix** (Fire) | Shell Ram | Carica Corazzata | 10 | Normal melee dash, 12 dmg |
| | Cinder Spit | Sputo di Brace | 15 | Fire projectile, 16 dmg |
| | Heat Shell | Guscio Rovente | 20 | Take 50% damage for 4 s |
| | Magma Burst | Esplosione di Magma | 35 | Eruption under target, 30 dmg, long windup |
| **Brinkle** (Water) | Bubble Bump | Spinta di Bolla | 10 | Normal melee, 12 dmg |
| | Water Jet | Getto d'Acqua | 15 | Water beam, 16 dmg |
| | Healing Rain | Pioggia Curativa | 25 | Heal 18 HP over 3 s |
| | Tidal Crash | Schianto di Marea | 35 | Water wave, 30 dmg |
| **Vinram** (Grass) | Horn Charge | Carica di Corna | 10 | Normal melee dash, 13 dmg |
| | Leaf Volley | Raffica di Foglie | 15 | Grass projectile spread, 15 dmg |
| | Vine Snare | Laccio di Liane | 20 | Root target 2 s (can't dodge or move) |
| | Thorn Quake | Terremoto di Spine | 35 | Ground spikes, 30 dmg |
| **Joltmoth** (Electric) | Wing Flick | Colpo d'Ala | 10 | Normal melee, 11 dmg |
| | Spark Dart | Dardo Scintilla | 15 | Fast electric projectile, 15 dmg |
| | Static Field | Campo Statico | 20 | Halve target's stamina regen for 5 s |
| | Thunder Lance | Lancia di Tuono | 35 | Electric bolt, 29 dmg, very fast |

Short keywords work too, for example *magma*, *jet*, *lance*, *spit*, *quake*, *tuono*, *spine*, *brace*, *marea*, *foglie*. The parser is fuzzy, so common mishearings ("sinner spit", "water get", "thunder dance") still work.

### Universal commands

| Action | English | Italiano |
|---|---|---|
| Dodge (15 stamina, 0.4 s invulnerable, 1 s cooldown) | "dodge" | "schiva" |
| Recall your creature and send out the other one | "come back" | "rientra" |
| Clear your command queue | "stop" | "fermati" |
| Switch to a specific creature | "go Joltmoth" | "vai Joltmoth" |
| Forced switch after a faint (or click) | "first" / "second" / the creature's name | "primo" / "secondo" / il nome |

### Chaining

| English | Italiano |
|---|---|
| "Cinder Spit **then** Shell Ram" | "Sputo di Brace **poi** Carica Corazzata" |
| "Heat Shell **and then** Magma Burst" | "Guscio Rovente **e poi** Esplosione di Magma" |
| "Water Jet, **after that** Tidal Crash" | "Getto d'Acqua **dopo** Schianto di Marea" |
| "Leaf Volley **next** Horn Charge" | "**Usa** Raffica di Foglie **quindi** Carica di Corna" |

Saying **"dodge"** at the start of a command jumps the queue, so you can react to an incoming attack. Both languages are always understood, whatever language you picked.

**Testing without a microphone:** press the **backtick key** (`` ` ``) during a battle to open a hidden text box. Typed commands go through exactly the same parser.

---

## 5. Creatures, types and rules

| Creature | Type | HP | Speed |
|---|---|---|---|
| Cindrix, a magma beetle with a cracked glowing shell | Fire | 110 | Medium |
| Brinkle, a pufferfish riding a water bubble | Water | 120 | Medium |
| Vinram, a mossy ram with vine-wrapped horns | Grass | 125 | Slow |
| Joltmoth, a moth with crackling luminous wings | Electric | 95 | Fast |

**Type chart** (2× super effective / 0.5× not very effective; Normal moves are always neutral):

- Fire: 2× vs Grass; 0.5× vs Fire, Water
- Water: 2× vs Fire; 0.5× vs Water, Grass
- Grass: 2× vs Water; 0.5× vs Grass, Fire
- Electric: 2× vs Water; 0.5× vs Electric, Grass

**Rules in short:**

- **Damage** = power × type multiplier × 1.25 if the move matches the creature's type × random 0.9–1.1.
- **Stamina:** max 100, regenerates 10/s, and regen pauses for 0.8 s after spending.
- **Moves** have windup → active → recovery phases. Heavy (35-stamina) moves have long windups, and the opponent's panel shows "Charging: …!" so you can dodge.
- **Interrupts:** a single hit of **25+ damage** interrupts the target's windup.
- **Failure clears the whole queue.** If a move is dodged, interrupted, short on stamina, or its target leaves the field, your queue is cleared, you hear a buzz and see "Move failed: give a new command". Your creature waits for new orders.
- **Fainting:** if you have another creature, pick it (click or voice). After 10 s it's sent out automatically. Lose both creatures and you lose the match.

---

## 6. Browser requirements

- **Google Chrome or Microsoft Edge** (desktop recommended; Chrome on Android also works). Firefox and Safari don't support the speech recognition this game uses; Brave and Opera expose it but it doesn't work. Other browsers show a warning; menus and the debug text box still work.
- **Microphone permission:** click **Allow** when asked. If you blocked it, click the lock or camera icon in the address bar, allow the microphone, and reload.
- **Internet connection:** needed for speech recognition (Chrome sends audio to Google's speech service) and for online matchmaking. A wired or stable Wi-Fi connection helps.
- **HTTPS** (or `localhost`) is required for the microphone. GitHub Pages and Netlify both use HTTPS.
- A computer that can run WebGL. Any machine from the last ~8 years should be fine.

---

## 7. Known limitations

- **Voice latency:** browsers deliver a final transcript about 0.5–1.5 s after you finish speaking. Short, clear commands and a brief pause work best. Dodging needs anticipation: watch for "Charging: …!" in the opponent panel.
- **Speech accuracy** drops in noisy rooms or with speakers near the mic. Headphones help, and they stop game sounds from reaching the mic.
- **Some networks block peer-to-peer.** The game uses public STUN servers and no TURN relay, so some strict corporate, school or mobile networks can't connect. Try another network (for example a phone hotspot) if joining hangs.
- **The public PeerJS broker** (`0.peerjs.com`) is only used to introduce the two browsers. If it's down, online play can't start (Practice still works).
- **No reconnection:** if either player disconnects, the match ends.
- **The host's browser runs the match.** It keeps running if the host switches tabs, but browsers may slow background tabs, so keep the game visible while playing.
- **Two players on one computer** can test the connection in two tabs, but the microphone can only be used by one tab at a time.
- **Speech recognition privacy:** in Chrome and Edge, audio is processed by Google or Microsoft speech services, not locally. The game itself never sends audio to the other player; only parsed commands travel over the connection.

---

## 8. For developers

```bash
npm run dev              # dev server
npm test                 # unit tests (sim, parser, net) – Vitest
npm run build            # type-check + production build to dist/
npm run preview          # serve dist/
node scripts/smoke.mjs [--full]      # headless Playwright run (Practice vs Bot), screenshots in ./screenshots
node scripts/flow-test.mjs           # Italian UI, voice forced switch, leave, phone layout
node scripts/net-test.mjs            # two headless players over the real PeerJS broker (needs internet)
node scripts/preview-test.mjs        # production build served under /yappemon/
node scripts/vfx-shots.mjs [species] # screenshot every move's VFX
```

Playwright needs Chromium once: `npx playwright install chromium`.

URL options for testing: `?seed=7&botTeam=vinram,brinkle&bot=passive`.

### Layout

```
src/sim/     deterministic combat simulation (30 Hz, seeded RNG), no DOM/Three.js — fully unit-tested
src/voice/   speech capture (Web Speech API) + pure EN/IT command parser with fuzzy matching
src/net/     PeerJS host/join, protocol, host-authoritative snapshots + client interpolation
src/render/  Three.js scene, procedural creatures, animation, VFX, HUD
src/audio/   Web Audio synthesized SFX, jingles, ambient
src/ui/      lobby, team select, switch prompt, end screen
src/game/    session (local/host/client) and battle controller
```

Design notes and judgment calls are in [DECISIONS.md](DECISIONS.md); open problems are in [BLOCKERS.md](BLOCKERS.md).
