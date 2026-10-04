/** mulberry32 — tiny deterministic PRNG. State is a uint32 kept inside SimState. */
export function nextRandom(seed: number): [value: number, nextSeed: number] {
  const s = (seed + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** Stateful convenience wrapper (used by the bot, tests). */
export class Rng {
  constructor(public seed: number) {}
  next(): number {
    const [v, s] = nextRandom(this.seed);
    this.seed = s;
    return v;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }
}
