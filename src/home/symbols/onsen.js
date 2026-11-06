// The hot-spring mark: a bath with three wisps of steam.
import { catW, link } from '../curves.js';

// a wisp of steam rising from y0 to y1 at x, swaying more as it rises
const wisp = (x, y0, y1, amp, ph) =>
  Array.from({ length: 13 }, (_, q) => {
    const u = q / 12;
    return [x + amp * Math.sin(u * Math.PI * 2.2 + ph) * (0.35 + 0.65 * u), y0 + (y1 - y0) * u];
  });

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)

  /** The black line. */
  ink({ strokes }) {
    const chain = seq => {
      const list = [];
      seq.forEach((q, k) => {
        if (k) list.push(link(seq[k - 1][seq[k - 1].length - 1], q[0]));
        list.push(q);
      });
      strokes(list);
    };
    const ov = [];
    for (let k = 0; k <= 30; k++) {
      const th = Math.PI + 0.78 - (k / 30) * (Math.PI + 1.56);
      ov.push([Math.cos(th) * 1.08, 0.32 + Math.sin(th) * 0.62, 1]);
    }
    chain([
      ov,
      ...[
        [-0.42, -0.78],
        [0, -0.98],
        [0.42, -0.78],
      ].map(([x, top]) =>
        catW(
          [
            [x, 0.58],
            [x + 0.12, 0.32],
            [x - 0.08, 0.05],
            [x + 0.1, -0.24],
            [x - 0.04, (top - 0.24) / 2 - 0.12],
            [x + 0.04, top],
          ],
          10,
          1,
          0.6
        )
      ),
    ]);
    return [0, 1.25];
  },

  /** The coloured lines. */
  // orange, green and purple are wisps of steam rising out of the bath beside the black ones
  lines: () => [
    { li: 4, path: wisp(-0.78, 0.36, -0.36, 0.07, 0.3) },
    { li: 6, path: wisp(-0.21, 0.3, -0.42, 0.05, 2.1) },
    { li: 5, path: wisp(0.79, 0.36, -0.36, 0.07, 4.0) },
  ],
};
