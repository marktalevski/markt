// A lotus: five petals opening over the water.

export default {
  ownLines: true, // its page lines follow their own path all the way to their dots

  /** The black line. */
  ink({ cv }) {
    cv([
      [-1.55, 0.72],
      [-0.8, 0.62],
      [0, 0.55],
    ]);
    const B = [0, 0.55];
    [
      [-1.25, 0.9, 0.22],
      [-0.65, 1.15, 0.28],
      [0, 1.45, 0.3],
      [0.65, 1.15, 0.28],
      [1.25, 0.9, 0.22],
    ].forEach(([a, Lp, wp]) => {
      const d = [Math.sin(a), -Math.cos(a)],
        n = [Math.cos(a), Math.sin(a)],
        T = [B[0] + d[0] * Lp, B[1] + d[1] * Lp];
      cv(
        [
          B,
          [B[0] + d[0] * Lp * 0.5 - n[0] * wp, B[1] + d[1] * Lp * 0.5 - n[1] * wp],
          T,
          [B[0] + d[0] * Lp * 0.5 + n[0] * wp, B[1] + d[1] * Lp * 0.5 + n[1] * wp],
          B,
        ],
        16
      );
    });
    cv([
      [0, 0.55],
      [0.8, 0.62],
      [1.55, 0.72],
    ]);
    return [0, 1.1];
  },

  /** The coloured lines. */
  lines: () =>
    [
      [-1.25, 0.9, 0.22, 1],
      [-0.65, 1.15, 0.28, 4],
      [0, 1.45, 0.3, 3],
      [0.65, 1.15, 0.28, 5],
      [1.25, 0.9, 0.22, 2],
    ]
      .map(([a, Lp, wp, li]) => {
        const B = [0, 0.55],
          d = [Math.sin(a), -Math.cos(a)],
          n = [Math.cos(a), Math.sin(a)],
          sg = a > 0 ? 1 : -1,
          path = [];
        for (let q = 0; q <= 10; q++) {
          const u = 0.08 + (0.92 * q) / 10,
            b = Math.sin(Math.PI * u) * wp * 0.62 * sg;
          path.push([B[0] + d[0] * Lp * u + n[0] * b, B[1] + d[1] * Lp * u + n[1] * b]);
        }
        path.push([B[0] + d[0] * (Lp + 0.12), B[1] + d[1] * (Lp + 0.12)]);
        return { li, path };
      })
      .concat([
        {
          li: 6,
          path: [
            [0, 0.6],
            [0.01, 0.8],
            [0.03, 1.0],
            [0.02, 1.2],
            [-0.02, 1.38],
          ],
        },
      ]),

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    const lTip = (a, Lp) => [cx + Math.sin(a) * (Lp + 0.12) * R, cy + (0.55 - Math.cos(a) * (Lp + 0.12)) * R];
    return { sound: lTip(-1.25, 0.9), library: lTip(1.25, 0.9), freediving: lTip(0, 1.45) };
  },
};
