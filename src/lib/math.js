// The small maths every page shares.

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Eases in and out between 0 and 1 (smoothstep). x must already be within 0..1. */
export const smooth = x => x * x * (3 - 2 * x);

/** Eases in and out along a cosine. */
export const easeInOut = k => 0.5 - 0.5 * Math.cos(Math.PI * k);

/** Eases in and out along a cubic: slower to start and stop than easeInOut. */
export const easeInOutCubic = v => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);

/** The point u (0..1) along the cubic Bézier curve from A to D, pulled by B and C. The routes lines and dots fly along are built from it. */
export const cubicAt = (A, B, C, D, u) => {
  const a = (1 - u) ** 3,
    b = 3 * (1 - u) ** 2 * u,
    c = 3 * (1 - u) * u * u,
    d = u ** 3;
  return [a * A[0] + b * B[0] + c * C[0] + d * D[0], a * A[1] + b * B[1] + c * C[1] + d * D[1]];
};

/** A repeatable random number generator (mulberry32): the same seed always gives the same run of numbers in 0..1. */
export const rng = seed => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * How far a value that follows its target at `rate` per second gets in dt seconds (0..1). Used as
 * `x += (target - x) * follow(dt, rate)`, so the motion is the same whatever the screen's frame rate.
 */
export const follow = (dt, rate) => 1 - Math.exp(-dt * rate);
