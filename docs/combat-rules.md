# Combat rules

How a match plays out. Numbers live in `src/sim/data.ts`; logic in `src/sim/sim.ts`. Background for each rule: [decisions.md](decisions.md).

## Rounds, evolution and move choice

**Rounds and evolution:** a match is **best of 3 rounds**. A round ends when one trainer has no creatures left. Between rounds everyone's creatures **evolve** (with an evolution animation): round 1 uses stage-1 forms, round 2 stage 2, round 3 the final stage. Each stage has more HP, deals more damage (×1.15, then ×1.3) and learns one new move. HP and stamina are fully restored at the start of each round. To always play all 3 rounds, set `ROUNDS_TO_WIN = 3` in `src/sim/data.ts`.

**Choosing your moves:** before every round a panel shows each of your creatures' moves with what they do. Each creature brings **4 moves** into the round, picked from everything it has learned: in round 1 that's simply its 4 moves (time to read them), round 2 adds the move learned by evolving, round 3 another one. To swap, click a move from "Other learned moves", then the move it replaces. By default a newly learned move takes the last slot. Press **Ready** (or say "ready" / "pronto"); the round starts when both players are ready or after 30 s. Only the chosen moves can be used (and are understood by the voice parser) during the round, and your choice is kept for the next round.

## Rules in short

- **Damage** = power × type multiplier × 1.25 if the move matches the creature's type × random 0.9–1.1.
- **Stamina:** max 100, regenerates 10/s, and regen pauses for 0.8 s after spending.
- **Move uses:** each creature can start each move a limited number of times per round (shown as "x/y" on the move cards; resets every round). By base stamina cost: 35+ (strongest) **5**, 30 (strong) **10**, 20–25 (normal) **15**, 15 (common) **20**. A move with no uses left fails ("no uses left this round"), clearing the queue like any failure. The bot only picks moves it can still use.
- **Movement:** creatures move on their own, strafing sideways and stepping in and out on their own half of the arena (fast creatures move faster). A creature busy with a move stands still. The camera turns to keep both creatures in view.
- **Accuracy:** every attack has an accuracy % (shown on the move cards). It is ×1.2 against a creature that is busy with a move (it stands still), ×0.7 against an alert creature, and always misses a creature in the middle of a dodge dash. A miss shows "Miss!" and the target sidesteps.
- **Creature name bonus:** saying your active creature's name (any of its 3 stage names) before a command gives **+10 accuracy** (capped at 100%, `NAME_ACC_BONUS`) to every move said after the name in that command, before the ×1.2 / ×0.7 above. "Cindrix, cinder spit then shell ram" → both moves get it.
- **Encouragements:** instant, free, don't interrupt the running move or the queue, only while your creature is on the field (`CHEERS` in data.ts). **Come on / Forza** and **Perfect / Perfetto**: +5% of max stamina. **Stay strong / Resisti**: +2% of max HP as temporary HP. **Courage / Coraggio**: +1% temporary HP. **Don't give up / Non arrenderti**: heals 5% of max HP. Temporary HP soaks damage first, lasts 10 s (refreshed by a new one) and is capped at 10% of max HP; it is lost on recall/faint. At least **5 s** between any two encouragements (a word inside the gap is ignored). The same word again within **10 s** has a **50%** chance of doing nothing (it still starts the 5 s gap).
- **Moves** have windup → active → recovery phases. Heavy moves have long windups, and the opponent's panel shows "Charging: …!" so you can arm a dodge.
- **Getting hit breaks your combo:** when an attack hits you, the commands still in your queue are lost ("Combo broken!"); the move you are doing continues. Missing, or having your attack dodged, does **not** cost you your queue.
- **Interrupts:** a single hit of **25+ damage** interrupts the target's windup.
- **Failure clears the whole queue:** if a move is interrupted, short on stamina, or its target leaves the field, your queue is cleared, you hear a buzz and see "Move failed: give a new command".
- **Fainting:** if you have another creature, pick it (click or voice). After 10 s it's sent out automatically. Lose both creatures and you lose the round; win 2 rounds to win the match.


## Verbal boosts (how a command is said)
Measured from the player's own mic against their normal voice (decision #73). At most one per move, the strongest:
- **SNAP!** / **SCATTO!** (sudden, loud start): the move winds up 1.5× faster (`SNAP_SPEED`).
- **HYPE!** / **GRINTA!** (clearly higher pitch): +10% of max stamina when the move starts (`HYPE_STAMINA`).
- **FULL POWER!** / **MASSIMA POTENZA!** (held, stretched vowel): accuracy and damage ×1.3 (`FULL_POWER_MULT`, accuracy capped at 100%), then unusable for 60 s (`FULL_POWER_COOLDOWN_S`); the cooldown keeps counting between rounds. During the cooldown, or on a self move (shield, heal, mirror), the move runs normally and no cooldown is spent.
- The boost travels with the move command; the host's sim applies it and announces it (`boost` event). The practice bot doesn't use boosts.
