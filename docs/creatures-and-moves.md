# Creatures and moves

Player-facing numbers. Source of truth for values is `src/sim/data.ts` (stats, moves, costs) and `src/movedesc.ts` (descriptions); update this file when those change.

## Creatures

| Creature (stage 1 → 2 → 3) | Type | HP by stage | Speed |
|---|---|---|---|
| Cindrix → Pyroxen → Calderox: a round magma beetle → a long armored rhino beetle with a great horn → a hulking walking volcano with a lava crater and huge pincers | Fire | 110 / 138 / 165 | Medium |
| Brinkle → Tsunafin → Abyssmaw: a pufferfish in a water bubble → a streamlined shark-finned fish surfing a water ring → a deep-sea angler with a giant toothed jaw, glowing spots and a lure, in a swirling vortex | Water | 120 / 150 / 180 | Medium |
| Vinram → Thornhorn → Elderoot: a woolly mossy ram → a lean long-legged goat with forward thorn horns and a bramble mane → a bark-bodied tree ram on root legs with branching antlers and a leafy canopy | Grass | 125 / 156 / 188 | Slow |
| Joltmoth → Stormoth → Tempestra: a fluffy electric moth → a sleek moth with swept pointed wings and lightning antennae → a six-winged storm moth with jagged wings, a spiked crown and orbiting sparks | Electric | 95 / 119 / 143 | Fast |

## Type chart

Super effective = **+25%** (`SUPER_EFFECTIVE`), not very effective = 0.5× (`NOT_VERY_EFFECTIVE`); Normal moves are always neutral; no immunities.
**Dual-type creatures** (Rock/Earth, Ghost/Dark): moves of either type get the +25% same-type bonus, and incoming damage multiplies both types (0.25×–1.56×).
Chart lives in `CHART` in `src/sim/data.ts`. Attack type: ×1.25 vs … / 0.5× vs …

- Fire: Grass, Ice, Steel / Fire, Water, Rock, Dragon
- Water: Fire, Rock, Earth / Water, Grass, Dragon
- Grass: Water, Rock, Earth / Grass, Fire, Poison, Flying, Dragon, Steel
- Electric: Water, Flying / Electric, Grass, Dragon, Earth
- Rock: Fire, Ice, Flying / Earth, Steel
- Earth: Fire, Electric, Poison, Rock, Steel / Grass, Flying
- Flying: Grass / Electric, Rock, Steel
- Psychic: Poison / Psychic, Steel, Dark
- Ghost: Psychic, Ghost / Dark
- Dark: Psychic, Ghost / Dark
- Dragon: Dragon / Steel
- Poison: Grass / Poison, Earth, Rock, Ghost, Steel
- Steel: Rock, Ice / Fire, Water, Steel, Electric
- Ice: Grass, Earth, Flying, Dragon / Fire, Water, Ice, Steel

## Moves (base stage)

Uses per round (see combat-rules.md): Stamina 47+ → 5 uses, 41 → 10, 27–34 → 15, 20 → 20.

| Creature | English | Italiano | Stamina | Accuracy | Effect |
|---|---|---|---|---|---|
| **Cindrix** (Fire) | Shell Ram | Carica Corazzata | 20 | 100% | **Quick** melee roll, 8 dmg |
| | Cinder Spit | Sputo di Brace | 20 | 90% | Fire projectile, 16 dmg |
| | Heat Shell | Guscio Rovente | 27 | – | Take 50% damage for 4 s |
| | Magma Burst | Esplosione di Magma | 47 | 80% | Eruption under target, 30 dmg, long windup |
| **Brinkle** (Water) | Bubble Bump | Spinta di Bolla | 20 | 100% | **Quick** melee bounce, 8 dmg |
| | Water Jet | Getto d'Acqua | 20 | 90% | Water beam, 16 dmg |
| | Healing Rain | Pioggia Curativa | 34 | – | Heal 18 HP over 3 s |
| | Tidal Crash | Schianto di Marea | 47 | 80% | Water wave, 30 dmg |
| **Vinram** (Grass) | Horn Charge | Carica di Corna | 20 | 100% | **Quick** melee headbutt, 9 dmg |
| | Leaf Volley | Raffica di Foglie | 20 | 90% | Grass projectile spread, 15 dmg |
| | Vine Snare | Laccio di Liane | 27 | 85% | Root target 2 s (can't dodge or move) |
| | Thorn Quake | Terremoto di Spine | 47 | 80% | Ground spikes, 30 dmg |
| **Joltmoth** (Electric) | Wing Flick | Colpo d'Ala | 20 | 100% | **Quick** melee wing strike, 8 dmg |
| | Spark Dart | Dardo Scintilla | 20 | 90% | Fast electric projectile, 15 dmg |
| | Static Field | Campo Statico | 27 | 85% | Halve target's stamina regen for 5 s |
| | Thunder Lance | Lancia di Tuono | 47 | 75% | Electric bolt, 29 dmg, very fast |

**Moves learned by evolving** (evolved forms keep all earlier moves):

| Evolution | English | Italiano | Stamina | Accuracy | Effect |
|---|---|---|---|---|---|
| **Pyroxen** (stage 2 of Cindrix) | Molten Leap | Balzo Fuso | 41 | 85% | Leaps high and slams onto the target, 24 dmg |
| **Calderox** (stage 3) | Volcanic Ruin | Rovina Vulcanica | 61 | 75% | Triple eruption under the target, 40 dmg, very long windup |
| **Tsunafin** (stage 2 of Brinkle) | Tide Mirror | Specchio di Marea | 34 | – | For 1.5 s, the next hit is reflected back at the attacker |
| **Abyssmaw** (stage 3) | Maelstrom | Gorgo Abissale | 54 | 80% | Whirlpool, 26 dmg + roots 1.5 s |
| **Thornhorn** (stage 2 of Vinram) | Bramble Stampede | Carica di Rovi | 41 | 90% | Charge whose windup can't be interrupted, 24 dmg |
| **Elderoot** (stage 3) | Ancient Bloom | Fioritura Antica | 47 | – | Heal 35 HP over 3 s |
| **Stormoth** (stage 2 of Joltmoth) | Chain Storm | Tempesta a Catena | 41 | 85% | 3 bolts of 10 dmg, each dodgeable separately |
| **Tempestra** (stage 3) | Sky Judgement | Giudizio Celeste | 61 | 75% | Lightning from the sky, 38 dmg, very long windup |

**Off-type moves learned by evolving** (each existing evolution also learns one move of another type; every evolved form keeps all earlier moves, so stage 3 knows 8 and picks 4 in the loadout screen. The default loadout still swaps in the same-type move above, not these):

| Evolution | English | Italiano | Type | Stamina | Accuracy | Effect |
|---|---|---|---|---|---|---|
| **Pyroxen** | Rock Hurl | Lancio di Roccia | Rock | 41 | 85% | Boulder projectile, 22 dmg |
| **Calderox** | Tremor Crush | Frantuma Terra | Earth | 61 | 75% | Ground crush, 38 dmg, very long windup |
| **Tsunafin** | Frost Fin | Pinna Gelida | Ice | 41 | 85% | Ice-water beam, 22 dmg |
| **Abyssmaw** | Void Bite | Morso del Vuoto | Dark | 61 | 80% | Heavy melee bite, 38 dmg |
| **Thornhorn** | Toxic Thorns | Spine Tossiche | Poison | 41 | 85% | Thorn projectile, 22 dmg |
| **Elderoot** | Mind Bloom | Fiore Mentale | Psychic | 61 | 75% | Psychic beam, 37 dmg, very long windup |
| **Stormoth** | Gale Slash | Fendente di Vento | Flying | 41 | 85% | Fast wind projectile, 22 dmg |
| **Tempestra** | Razor Pinion | Penna Tagliente | Steel | 61 | 75% | Very fast steel feather, 38 dmg |

**Quick moves** (the four Normal melee moves) wind up in 0.15 s, always hit an unguarded foe and **can't be caught by the dodge window**; every other attack winds up at least 0.6 s.

Short keywords work too, for example *magma*, *jet*, *lance*, *spit*, *quake*, *tuono*, *spine*, *brace*, *marea*, *foglie*, *mirror*, *specchio*, *gorgo*, *rovi*. The parser is fuzzy, so common mishearings ("sinner spit", "water get", "thunder dance") still work.
