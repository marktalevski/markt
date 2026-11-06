// A Muay Thai bag on its ring, swivel and straps, just kicked from the left, so it swings a little to the right.
import { TAU } from '../../lib/math.js';
import { cat, link } from '../curves.js';

// the Muay Thai bag hangs from its ring at BAG_HOOK and has just been kicked from the left, so it's tipped by BAG_SWING (radians, the bottom to the right)
const BAG_HOOK = [0, -1.27],
  BAG_SWING = -0.1,
  BAG_ROT = ([x, y, w]) => {
    const dx = x - BAG_HOOK[0],
      dy = y - BAG_HOOK[1],
      c = Math.cos(BAG_SWING),
      s = Math.sin(BAG_SWING);
    return [BAG_HOOK[0] + dx * c - dy * s, BAG_HOOK[1] + dx * s + dy * c, w];
  };
// its coloured lines, before the swing: red, yellow and blue are strips of tape wrapped round its middle, slanting alternately like a criss-cross
// repair, each ending at the bag's edge (Sound and Freediving's dots on the left, Library's on the right); orange, green and purple are speed
// streaks trailing behind it as it swings to the right: arcs about the hook, longer lower down where the bag moves fastest, running in to just
// short of its left side so their dots lead into it
const BAG_TAPE = (yc, slope, toLeft) =>
  Array.from({ length: 13 }, (_, q) => {
    const a = toLeft ? (q / 12) * Math.PI : Math.PI - (q / 12) * Math.PI,
      x = Math.cos(a) * 0.37;
    return [x, yc + Math.sin(a) * 0.09 + slope * x];
  });
const BAG_STREAK = (r, span) => {
  const a0 = Math.asin(0.36 / r) + 0.065;
  return Array.from({ length: 9 }, (_, q) => {
    const a = Math.PI / 2 + a0 + span * (1 - q / 8);
    return [BAG_HOOK[0] + Math.cos(a) * r, BAG_HOOK[1] + Math.sin(a) * r];
  });
};
const BAG_LINES = [
  { li: 1, path: BAG_TAPE(-0.2, 0.22, true) },
  { li: 2, path: BAG_TAPE(0.02, -0.22, false) },
  { li: 3, path: BAG_TAPE(0.24, 0.22, true) },
  { li: 6, path: BAG_STREAK(1.72, 0.2) },
  { li: 5, path: BAG_STREAK(1.98, 0.26) },
  { li: 4, path: BAG_STREAK(2.24, 0.32) },
];

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  ownLines: true, // its page lines follow their own path all the way to their dots
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)
  limit: 0.55, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ strokes }) {
    // a Muay Thai bag on its ring, swivel and straps, just kicked from the left so it swings a little to the right

    const lin = (a, b, w = 1) => {
      const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.03));
      return Array.from({ length: n + 1 }, (_, q) => [
        a[0] + ((b[0] - a[0]) * q) / n,
        a[1] + ((b[1] - a[1]) * q) / n,
        w,
      ]);
    };
    const ell = (c, rx, ry, a0, a1, n, w) =>
      Array.from({ length: n + 1 }, (_, q) => {
        const a = a0 + ((a1 - a0) * q) / n;
        return [c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry, w];
      });
    const ring = ell([0, -1.27], 0.07, 0.07, Math.PI / 2, Math.PI / 2 + TAU, 24, 0.8),
      hang = lin([0, -1.2], [0, -0.98]),
      strapL = lin([0, -0.98], [-0.36, -0.7], 0.85);
    const bodyPts = [...lin([-0.36, -0.7], [-0.36, 0.9])];
    cat(
      [
        [-0.36, 0.9],
        [-0.3, 1.0],
        [0, 1.05],
        [0.3, 1.0],
        [0.36, 0.9],
      ],
      10,
      (x, y) => bodyPts.push([x, y, 1])
    );
    bodyPts.push(...lin([0.36, 0.9], [0.36, -0.7]));
    const strapR = lin([0.36, -0.7], [0, -0.98], 0.85),
      rim = ell([0, -0.7], 0.36, 0.085, Math.PI, Math.PI + TAU, 40, 0.8),
      band1 = ell([0, -0.46], 0.36, 0.085, Math.PI, 0, 24, 0.65),
      band2 = ell([0, 0.7], 0.36, 0.085, Math.PI, 0, 24, 0.65);
    const seq = [[...ring, ...hang, ...strapL, ...bodyPts, ...strapR], rim, band1, band2],
      list = [];
    seq.forEach((q, k) => {
      if (k) list.push(link(seq[k - 1][seq[k - 1].length - 1], q[0]));
      list.push(q);
    });
    strokes(list.map(q => q.map(BAG_ROT)));
    return BAG_ROT(BAG_LINES.find(l => l.li === 3).path.slice(-1)[0]);
  },

  /** The coloured lines. */
  lines: () => BAG_LINES.map(({ li, path }) => ({ li, path: path.map(p => BAG_ROT(p)) })),

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return (() => {
      const end = li => {
        const e = BAG_ROT(BAG_LINES.find(l => l.li === li).path.slice(-1)[0]);
        return [cx + e[0] * R, cy + e[1] * R];
      };
      return { sound: end(1), library: end(2), freediving: end(3) };
    })();
  },
};
