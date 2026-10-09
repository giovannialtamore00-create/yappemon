# Voice commands

Code: `src/voice/aliases.ts` (all EN/IT words), `src/voice/parser.ts` (fuzzy matching, chaining), tests in `tests/parser.test.ts`. Matching rules: [decisions.md](decisions.md) #17–22, #29, #51. Move names: [creatures-and-moves.md](creatures-and-moves.md).

The big **energy gauge** on the left shows your stamina with a mark at each move's cost, and the **Commands** row in the voice box lists dodge / alert / come back / stop (greyed out when unavailable; dodge glows while it is armed). The **move bar** at the bottom of the screen always lists your active creature's moves with their stamina cost, accuracy, a **QUICK** tag for quick moves, and what they do (in your language).

Speak naturally and **pause briefly** after a command: the game acts when the recognizer finalizes your sentence. The live transcript appears at the bottom of the screen (green = understood, struck through = not understood). You can chain up to **4 actions**.

## Universal commands

| Action | English | Italiano |
|---|---|---|
| Arm a dodge (5 stamina): for 2 s, the first normal or heavy attack that reaches you is dodged automatically with a dash | "dodge" | "schiva" |
| Dodge to a side | "dodge left" / "dodge right" | "schiva a sinistra" / "schiva a destra" (also "sx" / "dx") |
| Alert stance (15 stamina, 3 s): attacks are 30% less accurate against you, you strafe faster, but you don't attack meanwhile | "alert", "on guard", "watch out", "careful" | "attento", "guardia", "in guardia", "occhio" |
| Recall your creature and send out the other one | "come back" | "rientra" |
| Clear your command queue | "stop" | "fermati" |
| Switch to a specific creature | "go Joltmoth" | "vai Joltmoth" |
| Forced switch after a faint (or click) | "first" / "second" / the creature's name | "primo" / "secondo" / il nome |

## Chaining

| English | Italiano |
|---|---|
| "Cinder Spit **then** Shell Ram" | "Sputo di Brace **poi** Carica Corazzata" |
| "Heat Shell **and then** Magma Burst" | "Guscio Rovente **e poi** Esplosione di Magma" |
| "Water Jet, **after that** Tidal Crash" | "Getto d'Acqua **dopo** Schianto di Marea" |
| "Leaf Volley **next** Horn Charge" | "**Usa** Raffica di Foglie **quindi** Carica di Corna" |

Saying **"dodge"** at the start of a command arms the dodge window **immediately**, even in the middle of a move (the rest of the command is queued as usual). A dodge later in a chain ("spit then dodge") arms when it is reached. An unused window simply expires. Both languages are always understood, whatever language you picked.

**Testing without a microphone:** press the **backtick key** (`` ` ``) during a battle to open a hidden text box. Typed commands go through exactly the same parser.

## Creature name (+10 accuracy)

Say your active creature's name **before** the moves: every move after the name in that command gets +10 accuracy (max 100%). Any stage name of the same line works (Cindrix / Pyroxen / Calderox). Another creature's name gives nothing. The **Words** box on the right side shows the name; it lights green for 1.5 s when a move said after it starts (the effect itself is not shown).

| English | Italiano |
|---|---|
| "**Cindrix**, Cinder Spit then Shell Ram" (both boosted) | "**Cindrix**, Sputo di Brace poi Carica Corazzata" |
| "Cinder Spit then **Cindrix** Shell Ram" (only Shell Ram) | "Sputo di Brace poi **Cindrix** Carica Corazzata" |

## Encouragements

Say them any time your creature is on the field; they act instantly and don't touch your moves. The **Words** box on the right lists them (in your language) and lights a word green when it worked. Effects: [combat-rules.md](combat-rules.md).

| English | Italiano |
|---|---|
| "come on" | "forza" |
| "stay strong" | "resisti" |
| "courage" | "coraggio" |
| "perfect" | "perfetto" |
| "don't give up" | "non arrenderti" |

"Hold on" still means **stop**. They mix with moves: "forza, cinder spit then shell ram" cheers and queues both moves.

## Verbal boosts (how you say it)
No extra words: the way a command is said can boost its first move (one boost at most). SNAP!/SCATTO! = bark it (sudden, loud start): faster windup. HYPE!/GRINTA! = say it clearly higher: +10% stamina. FULL POWER!/MASSIMA POTENZA! = stretch the vowel ("fiiiire"): +30% accuracy and damage, then 60 s cooldown (💤 chip in the commands box). Before each match a short voice check (read 3 move names normally, skippable) learns the player's normal voice. Rules: combat-rules.md; detection: decision #73.
