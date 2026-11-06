// An octopus: a round head and four arms that curl at their tips.

const arm = (sd, spread, inner, li) => {
  const b0 = sd * 0.22 * (inner ? 0.5 : 1),
    ex = b0 + sd * spread;
  return { li, f: [b0 + sd * spread * 0.6, 0.3], t: [ex, 1.0], e: [ex - sd * 0.27, 1.03] };
};

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  ownLines: true, // its page lines follow their own path all the way to their dots
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)
  limit: 0.45, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ strokes }) {
    const t = 0.1,
      L2 = [],
      head = [];
    for (let q = 0; q <= 48; q++) {
      const a = Math.PI * 0.5 + (q / 48) * Math.PI * 2;
      head.push([Math.cos(a) * 0.5, -0.55 + Math.sin(a) * 0.45, 1.1]);
    }
    L2.push(head);
    let prev = head[head.length - 1];
    [
      [-1, 1.15],
      [-1, 0.55],
      [1, 0.55],
      [1, 1.15],
    ].forEach(([sd, spread], k) => {
      const arm = [],
        b = [sd * 0.22 * (k === 1 || k === 2 ? 0.5 : 1), -0.12];
      for (let q = 0; q <= 40; q++) {
        const u = q / 40,
          x = b[0] + sd * spread * Math.sin(u * Math.PI * 0.5),
          y = b[1] + u * 1.15;
        arm.push([x, y, 1 - 0.45 * u]);
      }
      const e = arm[arm.length - 1],
        r0 = 0.27,
        c = [e[0] - sd * r0, e[1]];
      for (let q = 1; q <= 60; q++) {
        const u = q / 60,
          a = u * Math.PI * 2.2,
          r = r0 * (1 - u * 0.5);
        arm.push([c[0] + sd * Math.cos(a) * r, c[1] + Math.sin(a) * r, 0.55 - 0.12 * u]);
      }
      L2.push(
        [
          [prev[0], prev[1], t],
          [b[0], b[1], t],
        ],
        arm
      );
      prev = arm[arm.length - 1];
    });
    strokes(L2);
    return [0, 1.55];
  },

  /** The coloured lines. */
  lines: () => [arm(-1, 1.15, 0, 3), arm(-1, 0.55, 1, 4), arm(1, 0.55, 1, 5), arm(1, 1.15, 0, 6)],

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return { freediving: [cx + (-0.22 - 1.15 + 0.27) * R, cy + 1.03 * R] };
  },
};
