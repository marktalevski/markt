// A samurai crest: six rings over a triangle.
import { TAU } from '../../lib/math.js';
import { link } from '../curves.js';

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  ownLines: true, // its page lines follow their own path all the way to their dots
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)

  /** The black line. */
  ink({ strokes }) {
    const list = [];
    const ring = (x, y, k) => {
      const o = [],
        a0 = -1.9 + k * 0.7;
      for (let q = 0; q <= 30; q++) {
        const a = a0 + (q / 30) * TAU * 1.06;
        o.push([x + Math.cos(a) * 0.14, y + 0.33 + Math.sin(a) * 0.14, 0.8 + 0.3 * Math.sin((q / 30) * Math.PI)]);
      }
      return o;
    };
    const parts = [
      [-0.26, -0.94],
      [0.26, -0.94],
      [-0.26, -0.6],
      [0.26, -0.6],
      [-0.26, -0.26],
      [0.26, -0.26],
    ].map(([x, y], k) => ring(x, y, k));
    parts.push([
      [0, 0.33, 0.9],
      [0.24, 0.69, 1],
      [-0.24, 0.69, 1],
      [0, 0.33, 0.9],
      [0.05, 0.41, 0.8],
    ]);
    parts.forEach((q, k) => {
      if (k) list.push(link(parts[k - 1][parts[k - 1].length - 1], q[0]));
      list.push(q);
    });
    strokes(list);
    return [0, 1.05];
  },

  /** The coloured lines. */
  // one coloured line comes in to the middle of each of the six rings
  lines: () => [
    {
      li: 1,
      path: [
        [-0.95, -1.05],
        [-0.7, -0.9],
        [-0.45, -0.7],
        [-0.26, -0.61],
      ],
    },
    {
      li: 2,
      path: [
        [0.95, -1.05],
        [0.7, -0.9],
        [0.45, -0.7],
        [0.26, -0.61],
      ],
    },
    {
      li: 3,
      path: [
        [-1.0, -0.2],
        [-0.7, -0.32],
        [-0.45, -0.31],
        [-0.26, -0.27],
      ],
    },
    {
      li: 4,
      path: [
        [0.82, -0.67],
        [0.64, -0.47],
        [0.44, -0.32],
        [0.26, -0.27],
      ],
    },
    {
      li: 5,
      path: [
        [-0.9, 0.45],
        [-0.66, 0.3],
        [-0.44, 0.13],
        [-0.26, 0.07],
      ],
    },
    {
      li: 6,
      path: [
        [0.9, 0.45],
        [0.66, 0.3],
        [0.44, 0.13],
        [0.26, 0.07],
      ],
    },
  ],

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return {
      sound: [cx - 0.26 * R, cy - 0.61 * R],
      library: [cx + 0.26 * R, cy - 0.61 * R],
      freediving: [cx - 0.26 * R, cy - 0.27 * R],
      labelAt: {
        sound: [cx - 0.26 * R, cy - 0.99 * R],
        library: [cx + 0.26 * R, cy - 0.99 * R],
        freediving: [cx - 0.68 * R, cy - 0.1 * R],
      },
    };
  },
};
