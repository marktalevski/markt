// A pair of long freediving fins.
import { catW, link } from '../curves.js';

// a point in a fin's own frame (the longfins symbol: fin centred at sx, tilted by rot) placed on the symbol
const finPt = (sx, rot, [x, y]) => [sx + x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)];

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)
  limit: 0.32, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ strokes }) {
    const fin = (sx, rot) => {
      const c = Math.cos(rot),
        sn = Math.sin(rot),
        P2 = [
          [0, -1.12],
          [0.17, -1.05],
          [0.2, -0.78],
          [0.18, -0.5],
          [0.26, -0.1],
          [0.34, 0.5],
          [0.38, 1.05],
          [0.24, 1.2],
          [0, 1.1],
          [-0.24, 1.2],
          [-0.38, 1.05],
          [-0.34, 0.5],
          [-0.26, -0.1],
          [-0.18, -0.5],
          [-0.2, -0.78],
          [-0.17, -0.05 - 1],
          [0, -1.12],
        ];
      return catW(
        P2.map(p => [sx + p[0] * c - p[1] * sn, p[0] * sn + p[1] * c]),
        10,
        1.05,
        1.05
      );
    };
    const f1 = fin(-0.4, 0.16),
      f2 = fin(0.4, -0.16);
    const rib = (sx, rot) => {
      const c = Math.cos(rot),
        sn = Math.sin(rot);
      return catW(
        [
          [0, -0.42],
          [0, 0.2],
          [0, 0.85],
        ].map(p => [sx + p[0] * c - p[1] * sn, p[0] * sn + p[1] * c]),
        8,
        0.6,
        0.3
      );
    };
    const r1 = rib(-0.4, 0.16),
      r2 = rib(0.4, -0.16);
    strokes([
      f1,
      link(f1[f1.length - 1], r1[0]),
      r1,
      link(r1[r1.length - 1], r2[0]),
      r2,
      link(r2[r2.length - 1], f2[0]),
      f2,
    ]);
    return [0, 1.42];
  },

  /** The coloured lines. */
  // green runs down the left blade beside its rib, orange down the right blade beside its rib, purple down the outside of the right
  // fin, ending clear of its outline
  lines: () => [
    {
      li: 5,
      path: [
        [0.1, -0.35],
        [0.1, 0.1],
        [0.1, 0.55],
        [0.1, 0.95],
      ].map(p => finPt(-0.4, 0.16, p)),
    },
    {
      li: 4,
      path: [
        [-0.1, -0.35],
        [-0.1, 0.1],
        [-0.1, 0.55],
        [-0.1, 0.95],
      ].map(p => finPt(0.4, -0.16, p)),
    },
    {
      li: 6,
      path: [
        [0.3, -0.55],
        [0.32, -0.3],
        [0.39, -0.1],
        [0.49, 0.5],
        [0.57, 0.9],
        [0.66, 1.06],
      ].map(p => finPt(0.4, -0.16, p)),
    },
  ],
};
