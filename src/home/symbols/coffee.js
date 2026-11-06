// A latte, seen from above at an angle: rim, coffee, a heart in the foam, the bowl and its handle.
import { catW, link } from '../curves.js';

export default {
  hideLinks: true, // the brush's unseen moves between its strokes are hidden completely
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)

  /** The black line. */
  ink({ strokes }) {
    // 3/4 view latte: rim, coffee surface, heart in the foam, rosetta lines, bowl, handle, a highlight
    const ell = (c, rx, ry, a0, turns, n, w) =>
      Array.from({ length: n + 1 }, (_, q) => {
        const a = a0 + (q / n) * Math.PI * 2 * turns;
        return [c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry, w];
      });
    const rim = ell([0, -0.36], 1.0, 0.3, Math.PI, 1.02, 60, 1),
      liq = ell([0, -0.32], 0.84, 0.21, Math.PI * 0.95, 1.0, 50, 0.65);
    const heart = Array.from({ length: 41 }, (_, q) => {
      const a = (q / 40) * Math.PI * 2,
        x = 16 * Math.sin(a) ** 3,
        y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
      return [x * 0.019, -0.37 + y * 0.0098, 0.8];
    });
    const chev = (dy, wd) =>
      catW(
        [
          [-wd, -0.37 + dy * 0.3],
          [0, -0.3 + dy],
          [wd, -0.37 + dy * 0.3],
        ],
        10,
        0.5,
        0.5
      );
    const bowl = catW(
      [
        [-1.0, -0.36],
        [-0.96, 0.02],
        [-0.74, 0.42],
        [-0.34, 0.62],
        [0, 0.66],
        [0.34, 0.62],
        [0.74, 0.42],
        [0.96, 0.02],
        [1.0, -0.36],
      ],
      12,
      1,
      1
    );
    const handle = catW(
        [
          [0.95, -0.14],
          [1.24, -0.22],
          [1.42, -0.02],
          [1.3, 0.24],
          [0.84, 0.34],
        ],
        10,
        0.95,
        0.8
      ),
      shine = catW(
        [
          [-0.74, 0.02],
          [-0.66, 0.24],
          [-0.5, 0.42],
        ],
        6,
        0.5,
        0.35
      );
    const seq = [rim, liq, heart, chev(0.13, 0.5), shine, bowl, handle],
      list = [];
    seq.forEach((q, k) => {
      if (k) list.push(link(q === heart ? [0, -0.32] : seq[k - 1][seq[k - 1].length - 1], q[0]));
      list.push(q);
    });
    strokes(list);
    return [0, 1.15];
  },

  /** The coloured lines. */
  lines: () => [
    {
      li: 4,
      path: [
        [-0.66, -0.4],
        [-0.3, -0.49],
        [0.15, -0.5],
        [0.58, -0.43],
      ],
    },
    {
      li: 5,
      path: [
        [-0.8, -0.02],
        [-0.66, 0.28],
        [-0.4, 0.48],
        [-0.08, 0.57],
      ],
    },
    {
      li: 6,
      path: [
        [0.62, -0.24],
        [0.4, -0.27],
        [0.2, -0.3],
        [0.06, -0.33],
      ],
    },
  ],
};
