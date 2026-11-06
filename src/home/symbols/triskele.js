// A triskele: three arms curling out of the centre.

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)
  limit: 0.36, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ strokes }) {
    const t = 0.12,
      A = k => {
        const a = Math.PI / 2 + (k * Math.PI * 2) / 3,
          o = [];
        for (let i = 0; i <= 60; i++) {
          const u = i / 60,
            rr = 0.08 + 1.05 * Math.pow(u, 0.9),
            th = a - 2.5 + u * 2.5;
          o.push([Math.cos(th) * rr, Math.sin(th) * rr, 1.2 - 0.85 * u]);
        }
        return o;
      };
    const a0 = A(0),
      a1 = A(1),
      a2 = A(2),
      lift = (p, q) => [
        [p[0], p[1], t],
        [q[0], q[1], t],
      ];
    strokes([a1, lift(a1[a1.length - 1], a2[0]), a2, lift(a2[a2.length - 1], a0[0]), a0]);
    return [0, 1.24];
  },

  /** The coloured lines. */
  // orange, green and purple each echo one arm on its inner side (the same curve, drawn in a little), ending well inside it
  lines: () =>
    [
      [4, 1],
      [5, 2],
      [6, 0],
    ].map(([li, k]) => ({
      li,
      path: Array.from({ length: 31 }, (_, q) => {
        const u = 0.3 + (q / 30) * 0.6,
          a = Math.PI / 2 + (k * Math.PI * 2) / 3,
          th = a - 2.5 + u * 2.5,
          rr = (0.08 + 1.05 * Math.pow(u, 0.9)) * 0.78;
        return [Math.cos(th) * rr, Math.sin(th) * rr];
      }),
    })),

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return { freediving: [cx + 0.62 * R, cy + 1.12 * R] };
  },
};
