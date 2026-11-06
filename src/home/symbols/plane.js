// An aeroplane, seen from above, climbing to the upper right.

// the plane's wind: a wavy stream blowing back off a wingtip (sd -1 port, 1 starboard), in the plane's tilted frame
const planeWind = (sd, ph) =>
  Array.from({ length: 15 }, (_, q) => {
    const u = q / 14,
      x = sd * (1.27 + 0.13 * u + 0.05 * Math.sin(u * Math.PI * 3 + ph) * u),
      y = 0.33 + 0.8 * u;
    return [(x - y) * Math.SQRT1_2, (x + y) * Math.SQRT1_2];
  });

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  ownLines: true, // its page lines follow their own path all the way to their dots
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)

  /** The black line. */
  ink({ lineTo }) {
    const half = [
        [0, -1.28],
        [0.09, -1.22],
        [0.15, -1.02],
        [0.16, -0.34],
        [1.22, 0.2],
        [1.26, 0.3],
        [1.24, 0.4],
        [0.16, 0.1],
        [0.14, 0.7],
        [0.52, 0.98],
        [0.54, 1.08],
        [0.5, 1.12],
        [0.06, 1.0],
        [0, 1.02],
      ],
      full = [
        ...half,
        ...half
          .slice(0, -1)
          .reverse()
          .map(p => [-p[0], p[1]]),
      ],
      ra = Math.PI / 4;
    lineTo(full.map(p => [p[0] * Math.cos(ra) - p[1] * Math.sin(ra), p[0] * Math.sin(ra) + p[1] * Math.cos(ra)]));
    return [-0.95, 1.05];
  },

  /** The coloured lines. */
  // red and green are the wind streaming back off the port and starboard wingtips; the others stream behind as contrails
  lines: () =>
    (() => {
      const rot = ([x, y]) => [(x - y) * Math.SQRT1_2, (x + y) * Math.SQRT1_2],
        trail = (ex, L, ph) =>
          Array.from({ length: 9 }, (_, q) => {
            const u = q / 8,
              ey = 0.4 - 0.3 * (ex < 0 ? (ex + 1.24) / 1.08 : (1.24 - ex) / 1.08);
            return rot([ex + 0.03 * Math.sin(u * Math.PI * 2 + ph) * u, ey + 0.07 + L * u]);
          });
      // red and green are the wind streaming back off the port and starboard wingtips
      return [
        { li: 1, path: planeWind(-1, 0.6) },
        { li: 5, path: planeWind(1, 2.4) },
        { li: 2, path: trail(-0.86, 0.9, 0.4) },
        { li: 4, path: trail(-0.48, 0.45, 1.6) },
        { li: 6, path: trail(0.48, 0.45, 2.9) },
        { li: 3, path: trail(0.86, 0.9, 4.1) },
      ];
    })(),

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return (() => {
      const end = (ex, L) => {
        const ey = 0.4 - 0.3 * (ex < 0 ? (ex + 1.24) / 1.08 : (1.24 - ex) / 1.08) + 0.07 + L;
        return [cx + (ex - ey) * Math.SQRT1_2 * R, cy + (ex + ey) * Math.SQRT1_2 * R];
      };
      const w = planeWind(-1, 0.6).pop();
      return { sound: [cx + w[0] * R, cy + w[1] * R], library: end(-0.86, 0.9), freediving: end(0.86, 0.9) };
    })();
  },
};
