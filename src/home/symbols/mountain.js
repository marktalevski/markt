// A mountain under the sun.
import { TAU } from '../../lib/math.js';
import { catW, link } from '../curves.js';

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  ownLines: true, // its page lines follow their own path all the way to their dots
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
    const sun = [];
    for (let q = 0; q <= 60; q++) {
      const a = -0.6 + (q / 60) * TAU;
      sun.push([0.98 + Math.cos(a) * 0.26, -0.62 + Math.sin(a) * 0.26, 0.8]);
    }
    chain([
      sun,
      catW(
        [
          [-1.75, 0.72],
          [-1.2, 0.48],
          [-0.75, 0.05],
          [-0.42, -0.42],
          [-0.22, -0.7],
          [-0.08, -0.62],
          [0.08, -0.72],
          [0.22, -0.68],
          [0.45, -0.38],
          [0.8, 0.06],
          [1.25, 0.48],
          [1.75, 0.72],
        ],
        14,
        1,
        1
      ),
    ]);
    return [0, 1.05];
  },

  /** The coloured lines. */
  // red circles the sun on its own; orange is a second halo round it. Yellow is the snow line under the summit, blue a river winding
  // down from where the snow melts, purple a gull gliding in the sky to the left
  lines: () => [
    {
      li: 2,
      path: [
        [-0.4, -0.44],
        [-0.29, -0.35],
        [-0.18, -0.45],
        [-0.06, -0.34],
        [0.06, -0.45],
        [0.17, -0.35],
        [0.28, -0.44],
        [0.36, -0.4],
      ],
    },
    {
      li: 3,
      path: [
        [-0.17, -0.26],
        [0.05, 0.02],
        [-0.13, 0.3],
        [0.08, 0.56],
        [0.02, 0.86],
      ],
    },
    {
      li: 4,
      path: Array.from({ length: 25 }, (_, q) => {
        const a = 2.25 + (q / 24) * 2.6;
        return [0.98 + Math.cos(a) * 0.44, -0.62 + Math.sin(a) * 0.44];
      }),
    },
    {
      li: 6,
      path: [
        [-1.66, -0.96],
        [-1.54, -1.05],
        [-1.42, -1.0],
        [-1.33, -0.92],
        [-1.24, -1.0],
        [-1.12, -1.06],
        [-0.99, -0.98],
      ],
    },
  ],

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return { freediving: [cx + 0.02 * R, cy + 0.86 * R], library: [cx + 0.36 * R, cy - 0.4 * R] };
  },
};
