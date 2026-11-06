// Spring: a branch of cherry blossom. Red brushes the petals.

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  ownLines: true, // its page lines follow their own path all the way to their dots
  fine: [7, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)

  /** The black line. */
  ink({ strokes, line, blooms, cx, cy, R }) {
    const t = 0.12;
    strokes([
      [
        [-1.95, 0.2, 1.1],
        [-1.6, -0.02, 1.5],
        [-1.1, -0.1, 1.35],
        [-0.55, 0.04, 1.1],
        [-0.05, 0.1, 0.9],
        [0.4, -0.04, 0.7],
        [0.82, -0.2, 0.45],
        [1.15, -0.26, 0.2],
      ],
      [
        [1.15, -0.26, t],
        [-1.35, 0.02, t],
      ],
      [
        [-1.35, 0.02, 1.15],
        [-1.42, 0.45, 1.0],
        [-1.28, 0.86, 0.7],
        [-0.92, 1.08, 0.4],
        [-0.7, 1.15, 0.22],
      ],
      [
        [-0.7, 1.15, t],
        [-0.62, 0.02, t],
      ],
      [
        [-0.62, 0.02, 0.7],
        [-0.46, -0.4, 0.45],
        [-0.34, -0.7, 0.22],
      ],
      [
        [-0.34, -0.7, t],
        [0.3, 0.04, t],
      ],
      [
        [0.3, 0.04, 0.6],
        [0.58, 0.24, 0.38],
        [0.9, 0.3, 0.22],
      ],
      [
        [0.9, 0.3, t],
        [0.62, -0.12, t],
      ],
      [
        [0.62, -0.12, 0.55],
        [0.72, -0.55, 0.35],
        [0.86, -0.9, 0.22],
      ],
    ]);
    // cherry petals, brushed by the red line: most resting along the branches, a few drifting in the air below them.
    // [centre x, y, angle, size] in unit coordinates; the brush visits them left to right and ends on the petal by the twig
    const PET = [
      [-1.76, 0.03, 2.6, 0.95],
      [-1.45, 0.5, 0.5, 1],
      [-1.2, 0.95, 1.9, 0.95],
      [-1.05, -0.17, 2.1, 1.05],
      [-0.95, 0.5, 2.9, 0.85],
      [-0.85, 1.12, 0.2, 0.9],
      [-0.55, -0.4, 1.2, 1],
      [-0.5, 0.1, 4.0, 0.95],
      [-0.3, -0.8, 3.6, 0.95],
      [-0.2, 0.6, 1.5, 0.85],
      [0.05, 0.02, 0.8, 1.05],
      [0.42, 0.17, 2.4, 0.95],
      [0.55, 0.75, 3.3, 0.8],
      [0.6, 0.28, 2.6, 1],
      [0.68, -0.38, 1.9, 0.95],
      [0.76, -0.62, 4.4, 1],
      [0.95, -0.2, 5.2, 0.95],
      [1.2, -0.33, 0.3, 1],
    ];
    const lp = [],
      lq = (x, y, w) => lp.push([cx + x * R, cy + y * R, w]);
    PET.forEach(([x, y, a, sz], k) => {
      blooms.push([cx + x * R, cy + y * R]);
      // one petal in one movement of the brush: out from its narrow base along one side, round the notched tip and back along the other,
      // so the brush fills it. It is a little cupped, so one side bows more than the other
      const L1 = 0.13 * sz,
        c = Math.cos(a),
        sn = Math.sin(a),
        bx = x - (c * L1) / 2,
        by = y - (sn * L1) / 2,
        at = (d, side) => [bx + c * d - sn * side, by + sn * d + c * side];
      // the brush lifts between petals: the lift is set a hair from the last mark, or resampling would drop it and fade the weight across the move
      if (k) {
        const p0 = lp[lp.length - 1];
        lq((p0[0] - cx) / R + 0.002, (p0[1] - cy) / R, t);
        lq(bx - 0.002, by, t);
      }
      // the brush sets down a little before the first petal, unseen, so that petal is already at full pressure
      else {
        lq(bx - 0.28, by + 0.04, t);
        lq(bx - 0.002, by, t);
      }
      [
        [0, 0, 0.45],
        [0.25, -0.018, 1],
        [0.58, -0.026, 1.15],
        [0.88, -0.02, 1],
        [1, -0.009, 0.85],
        [0.9, 0, 0.75],
        [1, 0.009, 0.85],
        [0.88, 0.018, 1],
        [0.58, 0.024, 1.15],
        [0.25, 0.016, 1],
        [0.02, 0, 0.5],
      ].forEach(([u, sw, w]) => lq(...at(L1 * u, sw * sz), w));
    });
    // after the last petal, red carries on as a little twig out to the Sound dot
    [
      [1.3, -0.27],
      [1.42, -0.22],
      [1.54, -0.26],
      [1.64, -0.39],
    ].forEach(([x, y]) => lq(x, y, 1));
    line(1, lp);
    return [-0.2, 1.42];
  },

  /** The coloured lines. */
  // red draws the blossoms (see ink), blue rides the drooping branch, yellow the upright branch and green the lower right one, each on
  // past its tip blossom so the dot sits clear of it; orange and purple are small twigs of their own
  lines: () => [
    {
      li: 3,
      path: [
        [-1.31, 0.08],
        [-1.37, 0.45],
        [-1.24, 0.82],
        [-0.9, 1.03],
        [-0.66, 1.11],
        [-0.52, 1.17],
        [-0.4, 1.24],
      ],
    },
    {
      li: 2,
      path: [
        [-0.58, 0],
        [-0.43, -0.4],
        [-0.31, -0.7],
        [-0.25, -0.87],
        [-0.2, -1.0],
      ],
    },
    {
      li: 4,
      path: [
        [-1.58, -0.04],
        [-1.67, -0.3],
        [-1.66, -0.52],
        [-1.57, -0.7],
      ],
    },
    {
      li: 5,
      path: [
        [0.36, 0.09],
        [0.6, 0.26],
        [0.9, 0.32],
        [1.06, 0.36],
        [1.2, 0.43],
      ],
    },
    {
      li: 6,
      path: [
        [0.66, -0.2],
        [0.62, -0.45],
        [0.52, -0.66],
        [0.38, -0.84],
      ],
    },
  ],

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return {
      sound: [cx + 1.64 * R, cy - 0.39 * R],
      library: [cx - 0.2 * R, cy - 1.0 * R],
      freediving: [cx - 0.4 * R, cy + 1.24 * R],
    };
  },
};
