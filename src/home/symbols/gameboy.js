// A Game Boy.
import { TAU } from '../../lib/math.js';
import { catW, link } from '../curves.js';

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)
  limit: 0.42, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ strokes }) {
    const rr = (x0, y0, x1, y1, r, rBR) => {
      const o = [],
        arcq = (c0, c1, a0, rad) => {
          for (let q = 0; q <= 8; q++) {
            const a = a0 + ((q / 8) * Math.PI) / 2;
            o.push([c0 + Math.cos(a) * rad, c1 + Math.sin(a) * rad, 1]);
          }
        };
      arcq(x0 + r, y0 + r, Math.PI, r);
      arcq(x1 - r, y0 + r, -Math.PI / 2, r);
      arcq(x1 - rBR, y1 - rBR, 0, rBR);
      arcq(x0 + r, y1 - r, Math.PI / 2, r);
      o.push(o[0].slice());
      return o;
    };
    const body = rr(-0.68, -1.12, 0.68, 1.12, 0.07, 0.34),
      scr = rr(-0.5, -0.94, 0.5, -0.14, 0.05, 0.05).map(p => [p[0], p[1], 0.8]);
    const dpH = catW(
        [
          [-0.55, 0.4],
          [-0.39, 0.4],
          [-0.23, 0.4],
        ],
        6,
        1.15,
        1.15
      ),
      dpV = catW(
        [
          [-0.39, 0.24],
          [-0.39, 0.4],
          [-0.39, 0.56],
        ],
        6,
        1.15,
        1.15
      );
    const btn = (x, y) => {
      const o = [];
      for (let q = 0; q <= 18; q++) {
        const a = -Math.PI / 2 + (q / 18) * TAU;
        o.push([x + Math.cos(a) * 0.085, y + Math.sin(a) * 0.085, 0.85]);
      }
      return o;
    };
    const bA = btn(0.46, 0.28),
      bB = btn(0.2, 0.44),
      sp = catW(
        [
          [0.2, 0.86],
          [0.32, 0.74],
        ],
        4,
        0.6,
        0.6
      ),
      sp2 = catW(
        [
          [0.3, 0.9],
          [0.42, 0.78],
        ],
        4,
        0.6,
        0.6
      );
    const seq = [body, scr, dpH, dpV, bB, bA, sp, sp2],
      list = [];
    seq.forEach((q, k) => {
      if (k) list.push(link(seq[k - 1][seq[k - 1].length - 1], q[0]));
      list.push(q);
    });
    strokes(list);
    return [-0.95, 1.2];
  },

  /** The coloured lines. */
  lines: () => [
    {
      li: 4,
      path: [
        [-0.42, -0.22],
        [-0.3, -0.3],
        [-0.18, -0.44],
        [-0.02, -0.56],
      ],
    },
    {
      li: 5,
      path: [
        [0.8, -0.05],
        [0.72, 0.1],
        [0.6, 0.2],
        [0.47, 0.27],
      ],
    },
    {
      li: 6,
      path: [
        [0.62, 0.72],
        [0.48, 0.62],
        [0.32, 0.52],
        [0.21, 0.45],
      ],
    },
  ],
};
