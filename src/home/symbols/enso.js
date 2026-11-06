// Ensō: the circle of Zen calligraphy, made in one breath and left a little open.

export default {
  /** The black line. */
  ink({ push }) {
    for (let i = 0; i <= 360; i++) {
      const u = i / 360,
        th = Math.PI * 0.5 + 0.35 + u * Math.PI * 2 * 0.9,
        wob = 1 + 0.018 * Math.sin(u * 5 + 1);
      push(Math.cos(th) * wob, Math.sin(th) * wob);
    }
    return [0, 1.12];
  },

  /** The coloured lines. */
  lines: () => [
    { li: 6, f: [Math.cos(3.3), Math.sin(3.3)], t: [Math.cos(4.0), Math.sin(4.0)], e: [-0.24, -0.42] },
    { li: 5, f: [1, 0], t: [Math.cos(0.62), Math.sin(0.62)], e: [0.38, 0.26] },
  ],
};
