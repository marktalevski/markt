// Three triangles that make a fourth, in one line.

export default {
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)
  limit: 0.5, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ lineTo }) {
    lineTo([
      [0, 0.82],
      [-1.05, 0.82],
      [0, -0.98],
      [1.05, 0.82],
      [0, 0.82],
      [-0.525, -0.08],
      [0.525, -0.08],
      [0, 0.82],
    ]);
    return [0, 1.2];
  },

  /** The coloured lines. */
  // each small triangle gets its own pattern. Orange spirals in to the heart of the top one, green zigzags along the left one's base like
  // a row of little peaks, purple traces a smaller triangle inside the right one
  lines: () => [
    {
      li: 4,
      path: Array.from({ length: 49 }, (_, q) => {
        const u = q / 48,
          a = -Math.PI / 2 + u * Math.PI * 2 * 1.4,
          r = 0.24 * (1 - 0.9 * u);
        return [Math.cos(a) * r, -0.36 + Math.sin(a) * r];
      }),
    },
    {
      li: 5,
      path: [
        [-0.86, 0.68],
        [-0.75, 0.5],
        [-0.64, 0.68],
        [-0.53, 0.44],
        [-0.42, 0.68],
        [-0.31, 0.5],
        [-0.2, 0.68],
      ],
    },
    {
      li: 6,
      path: [
        [0.3, 0.66],
        [0.4, 0.665],
        [0.65, 0.665],
        [0.75, 0.66],
        [0.7, 0.57],
        [0.58, 0.33],
        [0.525, 0.24],
        [0.47, 0.33],
        [0.36, 0.55],
        [0.33, 0.61],
      ],
    },
  ],
};
