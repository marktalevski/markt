// A maple leaf, in one stroke round its edge; the coloured lines are its veins.
import { cat } from '../curves.js';

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  ownLines: true, // its page lines follow their own path all the way to their dots
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)

  /** The black line. */
  ink({ strokes }) {
    // one stroke round the leaf: base notch, left half up to the top lobe, right half back down. Teeth are sharp turns the brush rounds a little
    const R0 = [
      [0, 0.6],
      [0.2, 0.62],
      [0.5, 0.5],
      [0.85, 0.5],
      [0.62, 0.32],
      [0.44, 0.2],
      [0.62, 0.04],
      [0.95, -0.04],
      [0.86, -0.22],
      [1.05, -0.45],
      [0.74, -0.42],
      [0.62, -0.6],
      [0.55, -0.42],
      [0.2, -0.3],
      [0.3, -0.58],
      [0.24, -0.58],
      [0.32, -0.86],
      [0.14, -0.82],
      [0, -1.15],
    ];
    const ring = R0.map(p => [-p[0], p[1]]).concat(R0.slice(0, -1).reverse()),
      out = [];
    for (let k = 0; k < ring.length - 1; k++) {
      const a = ring[k],
        b = ring[k + 1],
        n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.03));
      for (let q = k ? 1 : 0; q <= n; q++)
        out.push([a[0] + ((b[0] - a[0]) * q) / n, a[1] + ((b[1] - a[1]) * q) / n, 0.72]);
    }
    strokes([out]);
    return [0, -0.9];
  },

  /** The coloured lines. */
  lines: () =>
    (() => {
      const vp = (li, ctrl) => {
        const o = [];
        cat(ctrl, 10, (x, y) => o.push([x, y]));
        return { li, path: o };
      };
      return [
        vp(3, [
          [0, 0.5],
          [0.01, 0.05],
          [-0.01, -0.45],
          [0, -0.88],
        ]),
        vp(1, [
          [0, 0.5],
          [-0.3, 0.16],
          [-0.58, -0.18],
          [-0.84, -0.38],
        ]),
        vp(2, [
          [0, 0.5],
          [0.3, 0.16],
          [0.58, -0.18],
          [0.84, -0.38],
        ]),
        vp(4, [
          [0, 0.5],
          [-0.3, 0.44],
          [-0.66, 0.46],
        ]),
        vp(5, [
          [0, 0.5],
          [0.3, 0.44],
          [0.66, 0.46],
        ]),
        vp(6, [
          [0, 0.62],
          [0.02, 0.84],
          [0.07, 1.04],
          [0.05, 1.24],
        ]),
      ];
    })(),

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return {
      sound: [cx - 0.84 * R, cy - 0.38 * R],
      library: [cx + 0.84 * R, cy - 0.38 * R],
      freediving: [cx, cy - 0.88 * R],
      labelAt: {
        sound: [cx - 1.08 * R, cy - 0.72 * R],
        library: [cx + 1.08 * R, cy - 0.72 * R],
        freediving: [cx, cy - 1.38 * R],
      },
    };
  },
};
