/**
 * Linear Congruential Generator (LCG) - a simple seeded random number generator
 * Based on the formula: next = (a * seed + c) mod m
 * This produces deterministic sequences given the same seed
 */
export class SeededRandom {
  private seed: number;
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = 2 ** 32;

  constructor(seed: number) {
    this.seed = seed >>> 0; // Ensure seed is a 32-bit unsigned integer
  }

  /**
   * Returns a pseudo-random number between 0 (inclusive) and 1 (exclusive)
   * Matches the behavior of Math.random()
   */
  next(): number {
    this.seed = (this.a * this.seed + this.c) >>> 0; // Keep as 32-bit unsigned
    return this.seed / (this.m - 1);
  }

  /**
   * Returns a random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

/**
 * Helper to create a seeded RNG from a session ID
 */
export function createSeededRandom(sessionId: number | null): SeededRandom {
  if (sessionId === null || !Number.isFinite(sessionId)) {
    throw new Error("Invalid sessionId for seeded random");
  }
  return new SeededRandom(sessionId);
}
