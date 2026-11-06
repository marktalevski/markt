// A spiral, winding in to its centre.

const spP = (u, dr = 0) => {
  const r = 1.15 * Math.pow(1 - u, 0.8) + 0.04 + dr,
    th = Math.PI * 0.5 + u * Math.PI * 2 * 2.4;
  return [Math.cos(th) * r, Math.sin(th) * r];
};

export default {
  limit: 0.7, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ push }) {
    for (let i = 0; i <= 420; i++) {
      const u = i / 420,
        r = 1.15 * Math.pow(1 - u, 0.8) + 0.04,
        th = Math.PI * 0.5 + u * Math.PI * 2 * 2.4;
      push(Math.cos(th) * r, Math.sin(th) * r);
    }
    return [0, 1.2];
  },

  /** The coloured lines. */
  lines: () => [0.4, 0.58, 0.74].map((u, k) => ({ li: 4 + k, f: spP(u - 0.07), t: spP(u), e: spP(u + 0.01, -0.15) })),
};
