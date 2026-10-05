# Combat rules

How a match plays out. Numbers live in `src/sim/data.ts`; logic in `src/sim/sim.ts`. Background for each rule: [decisions.md](decisions.md).

## Rounds, evolution and move choice

**Rounds and evolution:** a match is **best of 3 rounds**. A round ends when one trainer has no creatures left. Between rounds everyone's creatures **evolve** (with an evolution animation): round 1 uses stage-1 forms, round 2 stage 2, round 3 the final stage. Each stage has more HP, deals more damage (×1.15, then ×1.3) and learns one new move. HP and stamina are fully restored at the start of each round. To always play all 3 rounds, set `ROUNDS_TO_WIN = 3` in `src/sim/data.ts`.

**Choosing your moves:** before every round a panel shows each of your creatures' moves with what they do. Each creature brings **4 moves** into the round, picked from everything it has learned: in round 1 that's simply its 4 moves (time to read them), round 2 adds the move learned by evolving, round 3 another one. To swap, click a move from "Other learned moves", then the move it replaces. By default a newly learned move takes the last slot. Press **Ready** (or say "ready" / "pronto"); the round starts when both players are ready or after 30 s. Only the chosen moves can be used (and are understood by the voice parser) during the round, and your choice is kept for the next round.

## Rules in short

- **Damage** = power × type multiplier × 1.25 if the move matches the creature's type × random 0.9–1.1.
- **Stamina:** max 100, regenerates 10/s, and regen pauses for 0.8 s after spending.
- **Movement:** creatures move on their own, strafing sideways and stepping in and out on their own half of the arena (fast creatures move faster). A creature busy with a move stands still. The camera turns to keep both creatures in view.
- **Accuracy:** every attack has an accuracy % (shown on the move cards). It is ×1.2 against a creature that is busy with a move (it stands still), ×0.7 against an alert creature, and always misses a creature in the middle of a dodge dash. A miss shows "Miss!" and the target sidesteps.
- **Moves** have windup → active → recovery phases. Heavy moves have long windups, and the opponent's panel shows "Charging: …!" so you can arm a dodge.
- **Getting hit breaks your combo:** when an attack hits you, the commands still in your queue are lost ("Combo broken!"); the move you are doing continues. Missing, or having your attack dodged, does **not** cost you your queue.
- **Interrupts:** a single hit of **25+ damage** interrupts the target's windup.
- **Failure clears the whole queue:** if a move is interrupted, short on stamina, or its target leaves the field, your queue is cleared, you hear a buzz and see "Move failed: give a new command".
- **Fainting:** if you have another creature, pick it (click or voice). After 10 s it's sent out automatically. Lose both creatures and you lose the round; win 2 rounds to win the match.

