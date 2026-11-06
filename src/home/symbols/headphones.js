// A pair of headphones.

export default {
  ownLines: true, // its page lines follow their own path all the way to their dots

  /** The black line. */
  ink({ cv, circ }) {
    circ([-0.72, 0.35], 0.28, -Math.PI / 2, 1, 70, 0.45);
    cv([
      [-0.72, -0.1],
      [-0.8, -0.58],
      [-0.45, -0.98],
      [0, -1.08],
      [0.45, -0.98],
      [0.8, -0.58],
      [0.72, -0.1],
    ]);
    circ([0.72, 0.35], 0.28, -Math.PI / 2, 1, 70, 0.45);
    return [0, 1.15];
  },

  /** The coloured lines. */
  lines: () =>
    [
      [1, -0.72, 1],
      [2, 0.72, -1],
    ].map(([li, x, sd]) => {
      const path = [];
      for (let q = 0; q <= 16; q++) {
        const u = q / 16,
          a = -Math.PI / 2 - sd * u * Math.PI * 1.7,
          r = 0.17 * (1 - 0.9 * u);
        path.push([x + Math.cos(a) * r, 0.35 + Math.sin(a) * r * 1.5]);
      }
      return { li, path };
    }),

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return {
      sound: [cx - 0.72 * R, cy + 0.35 * R],
      library: [cx + 0.72 * R, cy + 0.35 * R],
      labelAt: { sound: [cx - 0.72 * R, cy + 1.0 * R], library: [cx + 0.72 * R, cy + 1.0 * R] },
    };
  },
};
