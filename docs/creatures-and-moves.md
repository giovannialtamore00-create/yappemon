# Creatures and moves

Player-facing numbers. Source of truth for values is `src/sim/data.ts` (stats, moves, costs) and `src/movedesc.ts` (descriptions); update this file when those change.

## Creatures

| Creature (stage 1 → 2 → 3) | Type | HP by stage | Speed |
|---|---|---|---|
| Cindrix → Pyroxen → Calderox: a round magma beetle → a long armored rhino beetle with a great horn → a hulking walking volcano with a lava crater and huge pincers | Fire | 110 / 138 / 165 | Medium |
| Brinkle → Tsunafin → Abyssmaw: a pufferfish in a water bubble → a streamlined shark-finned fish surfing a water ring → a deep-sea angler with a giant toothed jaw, glowing spots and a lure, in a swirling vortex | Water | 120 / 150 / 180 | Medium |
| Vinram → Thornhorn → Elderoot: a woolly mossy ram → a lean long-legged goat with forward thorn horns and a bramble mane → a bark-bodied tree ram on root legs with branching antlers and a leafy canopy | Grass | 125 / 156 / 188 | Slow |
| Joltmoth → Stormoth → Tempestra: a fluffy electric moth → a sleek moth with swept pointed wings and lightning antennae → a six-winged storm moth with jagged wings, a spiked crown and orbiting sparks | Electric | 95 / 119 / 143 | Fast |
| Gravelo → Boulderax → Tectonyx: a round pebble-plated armadillo → a long lizard with boulders on its back, a horn ridge and a rock-club tail → a walking mountain, a huge shell crowned with glowing crystal spires | Rock/Earth | 130 / 163 / 195 | Slow |
| Pipwing → Galehawk → Zephyrion: a round yellow chick with stubby wings → a sleek brown hawk with a hooked beak and tail fan → a long white-and-teal storm eagle with two pairs of wings, a feather crest, ribbon tail and wind rings | Flying | 90 / 113 / 135 | Fast |
| Wispurr → Mystiline → Astralynx: a small lavender kitten with a pink brow gem → a tall indigo cat on long legs with two tails and floating orbs → a floating star lynx with tufted ears, leaf-shaped ear fans, ribbon tails and halo rings | Psychic | 100 / 125 / 150 | Medium |
| Dusklet → Gloamwraith → Nightpall: a pale round lantern ghost with a wispy tail → a dark hooded wraith with glowing eyes, skeletal claws and a tattered hem → a huge tattered reaper cloak with a horned crown, six red eyes, floating hands and shadow wisps | Ghost/Dark | 100 / 125 / 150 | Fast |
| Scalet → Drakonet → Wyverno: a teal wingless hatchling with horn nubs → a blue wyvern with bat wings, swept horns and a spiked tail → a huge purple-and-gold dragon with great wings, a horned crest, glowing chest and blade-tipped tail | Dragon | 115 / 144 / 173 | Medium |
| Gloopit → Toxifrog → Plaguelord: a glossy green slime frog → a warty purple-green frog with spore sacs and a throat sac → a bloated toad king with a spotted-mushroom crown, tusks, glowing pustules and a spore cloud | Poison | 128 / 160 / 192 | Slow |
| Cogling → Gearhound → Mechadon: a round steel ball-bot with one lens eye and a back cog → an angular robot dog with plated flanks, antenna ears and shoulder cogs → a huge walking fortress with a back cannon, smoke stacks and a glowing furnace core | Steel | 125 / 156 / 188 | Slow |
| Flurrbit → Hailstag → Glaciarch: a fluffy snow bunny with a blue scarf → a pale-blue stag with crystal antlers → a towering glacier beast with tusks of ice, a crystal spine and drifting snowflakes | Ice | 105 / 131 / 158 | Medium |

## Type chart

Super effective = **+25%** (`SUPER_EFFECTIVE`), not very effective = **−25%** (×0.75, `NOT_VERY_EFFECTIVE`); the same-type bonus (+25%, `STAB`) stacks with it; Normal moves are always neutral; no immunities.
**Dual-type creatures** (Rock/Earth, Ghost/Dark): moves of either type get the +25% same-type bonus, and incoming damage multiplies both types (0.56×–1.56×).
Chart lives in `CHART` in `src/sim/data.ts`. Attack type: ×1.25 vs … / 0.75× vs …

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
| | Cinder Spit | Sputo di Brace | 20 | 95% | Fire projectile, 16 dmg |
| | Heat Shell | Guscio Rovente | 27 | – | Take 50% damage for 4 s |
| | Magma Burst | Esplosione di Magma | 47 | 85% | Eruption under target, 30 dmg, long windup |
| **Brinkle** (Water) | Bubble Bump | Spinta di Bolla | 20 | 100% | **Quick** melee bounce, 8 dmg |
| | Water Jet | Getto d'Acqua | 20 | 95% | Water beam, 16 dmg |
| | Healing Rain | Pioggia Curativa | 34 | – | Heal 18 HP over 3 s |
| | Tidal Crash | Schianto di Marea | 47 | 85% | Water wave, 30 dmg |
| **Vinram** (Grass) | Horn Charge | Carica di Corna | 20 | 100% | **Quick** melee headbutt, 9 dmg |
| | Leaf Volley | Raffica di Foglie | 20 | 95% | Grass projectile spread, 15 dmg |
| | Vine Snare | Laccio di Liane | 27 | 90% | Root target 2 s (can't dodge or move) |
| | Thorn Quake | Terremoto di Spine | 47 | 85% | Ground spikes, 30 dmg |
| **Joltmoth** (Electric) | Wing Flick | Colpo d'Ala | 20 | 100% | **Quick** melee wing strike, 8 dmg |
| | Spark Dart | Dardo Scintilla | 20 | 95% | Fast electric projectile, 15 dmg |
| | Static Field | Campo Statico | 27 | 90% | Halve target's stamina regen for 5 s |
| | Thunder Lance | Lancia di Tuono | 47 | 80% | Electric bolt, 29 dmg, very fast |

**Moves learned by evolving** (evolved forms keep all earlier moves):

| Evolution | English | Italiano | Stamina | Accuracy | Effect |
|---|---|---|---|---|---|
| **Pyroxen** (stage 2 of Cindrix) | Molten Leap | Balzo Fuso | 41 | 90% | Leaps high and slams onto the target, 24 dmg |
| **Calderox** (stage 3) | Volcanic Ruin | Rovina Vulcanica | 61 | 80% | Triple eruption under the target, 40 dmg, very long windup |
| **Tsunafin** (stage 2 of Brinkle) | Tide Mirror | Specchio di Marea | 34 | – | For 1.5 s, the next hit is reflected back at the attacker |
| **Abyssmaw** (stage 3) | Maelstrom | Gorgo Abissale | 54 | 85% | Whirlpool, 26 dmg + roots 1.5 s |
| **Thornhorn** (stage 2 of Vinram) | Bramble Stampede | Carica di Rovi | 41 | 95% | Charge whose windup can't be interrupted, 24 dmg |
| **Elderoot** (stage 3) | Ancient Bloom | Fioritura Antica | 47 | – | Heal 35 HP over 3 s |
| **Stormoth** (stage 2 of Joltmoth) | Chain Storm | Tempesta a Catena | 41 | 90% | 3 bolts of 10 dmg, each dodgeable separately |
| **Tempestra** (stage 3) | Sky Judgement | Giudizio Celeste | 61 | 80% | Lightning from the sky, 38 dmg, very long windup |

| **Gravelo** (Rock/Earth) | Pebble Bump | Botta di Sasso | 20 | 100% | **Quick** melee, 9 dmg (Normal) |
| | Gravel Shot | Colpo di Ghiaia | 20 | 95% | Rock projectile, 15 dmg |
| | Stone Skin | Pelle di Pietra | 27 | – | Take 50% damage for 4 s |
| | Fault Quake | Faglia Sismica | 47 | 85% | Earth eruption under target, 30 dmg |
| **Pipwing** (Flying) | Beak Peck | Beccata | 20 | 100% | **Quick** melee, 8 dmg (Normal) |
| | Feather Dart | Dardo di Piuma | 20 | 95% | Fast feather projectile, 15 dmg |
| | Dizzy Gale | Vento Stordente | 27 | 90% | Halve target's stamina regen for 5 s |
| | Hurricane | Uragano | 47 | 85% | Wind wave, 30 dmg |
| **Wispurr** (Psychic) | Paw Tap | Zampata | 20 | 100% | **Quick** melee, 8 dmg (Normal) |
| | Psy Orb | Sfera Psichica | 20 | 95% | Slow psychic orb, 15 dmg |
| | Calm Mind | Mente Calma | 34 | – | Heal 18 HP over 3 s |
| | Mind Crush | Schianto Mentale | 47 | 85% | Psychic beam, 30 dmg |
| **Dusklet** (Ghost/Dark) | Shade Nip | Pizzico Ombra | 20 | 100% | **Quick** melee, 8 dmg (Normal) |
| | Spook Bolt | Dardo Spettrale | 20 | 95% | Fast ghost projectile, 15 dmg |
| | Dread Stare | Sguardo Gelido | 27 | 90% | Root target 2 s (can't dodge or move) |
| | Nightmare Wave | Onda Incubo | 47 | 85% | Dark wave, 30 dmg |
| **Scalet** (Dragon) | Claw Swipe | Graffio | 20 | 100% | **Quick** melee, 9 dmg (Normal) |
| | Wyrm Spit | Sputo di Drago | 20 | 95% | Dragon projectile, 16 dmg |
| | Scale Guard | Guardia di Scaglie | 27 | – | Take 50% damage for 4 s |
| | Meteor Fall | Meteora Draconica | 47 | 85% | Meteor strike under target, 30 dmg |
| **Gloopit** (Poison) | Goo Slap | Schiaffo Viscido | 20 | 100% | **Quick** melee, 8 dmg (Normal) |
| | Acid Spit | Sputo Acido | 20 | 95% | Poison projectile, 15 dmg |
| | Sticky Goo | Melma Appiccicosa | 27 | 90% | Root target 2 s (can't dodge or move) |
| | Sludge Wave | Onda Fangosa | 47 | 85% | Toxic wave, 30 dmg |
| **Cogling** (Steel) | Cog Bash | Botta di Ingranaggio | 20 | 100% | **Quick** melee, 8 dmg (Normal) |
| | Nail Shot | Sparo di Chiodi | 20 | 95% | Fast steel projectile, 15 dmg |
| | Self Repair | Autoriparazione | 34 | – | Heal 18 HP over 3 s |
| | Iron Crush | Schianto di Ferro | 47 | 85% | Ground slam, 30 dmg |
| **Flurrbit** (Ice) | Snow Bump | Spinta di Neve | 20 | 100% | **Quick** melee, 8 dmg (Normal) |
| | Ice Shard | Scheggia di Ghiaccio | 20 | 95% | Fast ice projectile, 15 dmg |
| | Frost Bind | Morsa di Gelo | 27 | 90% | Root target 2 s (can't dodge or move) |
| | Blizzard | Bufera | 47 | 85% | Snow wave, 30 dmg |

**Off-type moves of the new lines** (one per evolution, always a different type than the creature's own; nothing else is learned):

| Evolution | English | Italiano | Type | Stamina | Accuracy | Effect |
|---|---|---|---|---|---|---|
| **Boulderax** | Magma Chunk | Blocco di Magma | Fire | 41 | 90% | Flaming boulder, 22 dmg |
| **Tectonyx** | Glacier Drop | Caduta Glaciale | Ice | 61 | 80% | Ice falls on the foe, 38 dmg, very long windup |
| **Galehawk** | Shadow Talon | Artiglio Ombra | Dark | 41 | 90% | Melee claw strike, 22 dmg |
| **Zephyrion** | Draco Zephyr | Soffio Draconico | Dragon | 61 | 80% | Dragon wind beam, 38 dmg, very long windup |
| **Mystiline** | Spirit Hex | Maleficio Spettrale | Ghost | 41 | 90% | Haunting curse projectile, 22 dmg |
| **Astralynx** | Astral Blade | Lama Astrale | Steel | 61 | 80% | Blade of starlight beam, 38 dmg, very long windup |
| **Gloamwraith** | Wisp Flame | Fuoco Fatuo | Fire | 41 | 90% | Ghost fire projectile, 22 dmg |
| **Nightpall** | Grave Miasma | Miasma Tombale | Poison | 61 | 80% | Slow toxic wave, 38 dmg, very long windup |
| **Drakonet** | Storm Fang | Zanna di Tempesta | Electric | 41 | 90% | Melee crackling bite, 22 dmg |
| **Wyverno** | Inferno Roar | Ruggito Infernale | Fire | 61 | 80% | Fire beam, 38 dmg, very long windup |
| **Toxifrog** | Swamp Jet | Getto di Palude | Water | 41 | 90% | Muddy water beam, 22 dmg |
| **Plaguelord** | Mire Slam | Schianto di Palude | Earth | 61 | 80% | Ground slam, 38 dmg, very long windup |
| **Gearhound** | Arc Weld | Saldatura ad Arco | Electric | 41 | 90% | Melee sparking weld, 22 dmg |
| **Mechadon** | Forge Blast | Getto di Fornace | Fire | 61 | 80% | Furnace beam, 38 dmg, very long windup |
| **Hailstag** | Aurora Gaze | Sguardo Aurorale | Psychic | 41 | 90% | Aurora ray projectile, 22 dmg |
| **Glaciarch** | Avalanche | Valanga | Rock | 61 | 80% | Ground avalanche, 38 dmg, very long windup |

**Off-type moves learned by evolving** (each existing evolution also learns one move of another type; every evolved form keeps all earlier moves, so stage 3 knows 8 and picks 4 in the loadout screen. The default loadout still swaps in the same-type move above, not these):

| Evolution | English | Italiano | Type | Stamina | Accuracy | Effect |
|---|---|---|---|---|---|---|
| **Pyroxen** | Rock Hurl | Lancio di Roccia | Rock | 41 | 90% | Boulder projectile, 22 dmg |
| **Calderox** | Tremor Crush | Frantuma Terra | Earth | 61 | 80% | Ground crush, 38 dmg, very long windup |
| **Tsunafin** | Frost Fin | Pinna Gelida | Ice | 41 | 90% | Ice-water beam, 22 dmg |
| **Abyssmaw** | Void Bite | Morso del Vuoto | Dark | 61 | 85% | Heavy melee bite, 38 dmg |
| **Thornhorn** | Toxic Thorns | Spine Tossiche | Poison | 41 | 90% | Thorn projectile, 22 dmg |
| **Elderoot** | Mind Bloom | Fiore Mentale | Psychic | 61 | 80% | Psychic beam, 37 dmg, very long windup |
| **Stormoth** | Gale Slash | Fendente di Vento | Flying | 41 | 90% | Fast wind projectile, 22 dmg |
| **Tempestra** | Razor Pinion | Penna Tagliente | Steel | 61 | 80% | Very fast steel feather, 38 dmg |

**Quick moves** (the four Normal melee moves) wind up in 0.15 s, always hit an unguarded foe and **can't be caught by the dodge window**; every other attack winds up at least 0.6 s.

Short keywords work too, for example *magma*, *jet*, *lance*, *spit*, *quake*, *tuono*, *spine*, *brace*, *marea*, *foglie*, *mirror*, *specchio*, *gorgo*, *rovi*. The parser is fuzzy, so common mishearings ("sinner spit", "water get", "thunder dance") still work.
