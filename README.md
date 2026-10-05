# YAPPEMON

A 1v1 browser-based 3D creature-battle game you play **with your voice**. You are a trainer at one end of a stone arena; your creature fights your opponent's in real time, and you command it by shouting move names in **English or Italian**. The mouse is only used for menus.

- 4 original creatures that evolve twice (12 forms), 24 moves, best-of-3 rounds, a type chart, stamina, creatures that move around the arena, accuracy, a dodge window, an alert stance, switching, and a command queue
- Online 1v1 with a friend (room codes, peer-to-peer, no game server) or **Practice vs Bot**
- Everything is procedural: 3D models built from primitives, all sound synthesized, no asset files


## Quick start

You need **Node.js 22.12 or newer**.

```bash
npm install
npm run dev
```

Open http://localhost:5173 in **Chrome or Edge** and allow the microphone.

## Guides

- [Playing](docs/playing.md): run locally, play with a friend, browser requirements, known limitations
- [Voice commands](docs/voice-commands.md): what to say (English / Italiano), chaining, dodge, alert
- [Creatures and moves](docs/creatures-and-moves.md): the 12 forms, every move, type chart
- [Combat rules](docs/combat-rules.md): rounds, evolution, move choice, damage, accuracy, stamina
- [Deploy](docs/deploy.md): put the game online (GitHub Pages or Netlify)

## For developers

- [Architecture](docs/architecture.md): code layout and how modules connect
- [Testing](docs/testing.md): unit tests, headless scripts, test URL options
- [Decisions](docs/decisions.md): design notes and judgment calls
- [Blockers](docs/blockers.md): open problems
