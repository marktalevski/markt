// A fried egg, sunny side up.
import { catW, link } from '../curves.js';

// the egg white's wobbly outline: angle a (clockwise on screen, 0 at the right), k scales it about the centre (below 1 runs inside it)
const EGG_WOB = a => 1 + 0.06 * Math.sin(a * 3 + 0.6) + 0.07 * Math.sin(a * 5 + 2.1) + 0.025 * Math.sin(a * 9 + 0.4);
const eggWhite = (a, k) => {
  const rr = EGG_WOB(a) * k;
  return [Math.cos(a) * 1.3 * rr, 0.02 + Math.sin(a) * 0.86 * rr];
};
const eggArc = (a0, a1, k, n = 40) => Array.from({ length: n + 1 }, (_, q) => eggWhite(a0 + ((a1 - a0) * q) / n, k));

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)

  /** The black line. */
  ink({ strokes }) {
    // sunny side up, seen at a slight angle: the wobbly white, then a domed yolk and the shine on it
    const white = Array.from({ length: 91 }, (_, q) => {
      const a = Math.PI * 0.55 + (q / 90) * Math.PI * 2.03;
      return [...eggWhite(a, 1), 1];
    });
    const Y = [0.18, -0.12],
      yolk = Array.from({ length: 61 }, (_, q) => {
        const a = -Math.PI * 0.6 + (q / 60) * Math.PI * 2.02;
        return [Y[0] + Math.cos(a) * 0.5, Y[1] + Math.sin(a) * 0.42, 1.1];
      });
    const shine = catW(
      [
        [Y[0] - 0.3, Y[1] - 0.02],
        [Y[0] - 0.22, Y[1] - 0.2],
        [Y[0] - 0.04, Y[1] - 0.28],
      ],
      6,
      0.85,
      0.7
    );
    const seq = [white, yolk, shine],
      list = [];
    seq.forEach((q, k) => {
      if (k) list.push(link(seq[k - 1][seq[k - 1].length - 1], q[0]));
      list.push(q);
    });
    // the brush's last move is an unseen one, off the yolk and back to where the white's outline closes: the black dot comes to
    // rest there, on the egg's edge, and not on the yolk
    list.push(link(shine[shine.length - 1], white[white.length - 1]));
    strokes(list);
    return [0, 1.25];
  },

  /** The coloured lines. */
  lines: () => [
    {
      li: 2,
      w: 2.1,
      path: [].concat(
        Array.from({ length: 141 }, (_, q) => {
          const u = q / 140,
            a = Math.PI * 0.22 - u * Math.PI * 2 * 4.4,
            rr = 0.42 * Math.min(1, 1.3 * (1 - u)) + 0.004;
          return [0.18 + Math.cos(a) * rr * 1.08, -0.12 + Math.sin(a) * rr * 0.9];
        })
      ),
    },
    // orange runs inside the white along its top, green inside it along the bottom, purple circles outside the yolk; each ends well apart
    { li: 4, path: eggArc(Math.PI * 0.97, Math.PI * 1.8, 0.78) },
    { li: 5, path: eggArc(Math.PI * 0.22, Math.PI * 0.8, 0.84) },
    {
      li: 6,
      path: Array.from({ length: 49 }, (_, q) => {
        const a = -Math.PI * 0.08 + (q / 48) * Math.PI * 1.1;
        return [0.18 + Math.cos(a) * 0.66, -0.12 + Math.sin(a) * 0.56];
      }),
    },
  ],

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return { library: [cx + 0.18 * R, cy - 0.12 * R], labelAt: { library: [cx + 0.18 * R, cy + 0.4 * R] } };
  },
};
