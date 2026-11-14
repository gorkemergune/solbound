// Deterministic, seedable randomness. No Math.random anywhere in the engine.

/** 32-bit FNV-1a hash of a string, used to derive independent streams. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Derive a stream seed from the run seed and a stream label. */
export function deriveSeed(seed: number, ...labels: (string | number)[]): number {
  return hashString(`${seed >>> 0}|${labels.join('|')}`);
}

/** Mulberry32 PRNG. The state is a single uint32, so it serialises trivially. */
export class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, maxInclusive: number): number {
    return min + Math.floor(this.next() * (maxInclusive - min + 1));
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

/** A single deterministic roll bound to a decision identity (seed + event instance + option). */
export function decisionRoll(seed: number, eventInstanceId: string, optionId: string): number {
  return new Rng(deriveSeed(seed, 'decision', eventInstanceId, optionId)).next();
}
