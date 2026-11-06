// A name stamp (dojang) reading 마크. The black ink writes ㅁ; the coloured lines cut the stamp's square and write the rest.

// the hangul stamp's square, in unit coordinates, clockwise from the top left corner and back to it
const SEAL = { x: 1.0, y: 1.02 };
const SEAL_SQ = (() => {
  const X = SEAL.x,
    Y = SEAL.y,
    e = 0.05;
  return [
    [-X, -Y],
    [-X + e, -Y],
    [0, -Y],
    [X - e, -Y],
    [X, -Y],
    [X, -Y + e],
    [X, 0],
    [X, Y - e],
    [X, Y],
    [X - e, Y],
    [0, Y],
    [-X + e, Y],
    [-X, Y],
    [-X, Y - e],
    [-X, 0],
    [-X, -Y + e],
    [-X, -Y + 0.01],
  ];
})();

export default {
  several: true, // it is drawn as several separate strokes (the ink tails off quickly at each one's end)
  ownLines: true, // its page lines follow their own path all the way to their dots
  fine: [6, 3], // drawn point by point, so its corners stay sharp (the spacing of its points, and how often they are rounded)
  limit: 0.9, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ strokes }) {
    // a name stamp (dojang): the red line cuts the square and the letters are written inside it, one stroke per line. The black ink writes ㅁ: its left side, then top and right as one stroke, then the base
    const t = 0.02;
    strokes([
      [
        [-0.78, -0.82, 1],
        [-0.78, -0.16, 1],
      ],
      [
        [-0.78, -0.16, t],
        [-0.78, -0.82, t],
      ],
      [
        [-0.78, -0.82, 1],
        [-0.12, -0.82, 1],
        [-0.12, -0.16, 1],
      ],
      [
        [-0.12, -0.16, t],
        [-0.78, -0.16, t],
      ],
      [
        [-0.78, -0.16, 1],
        [-0.12, -0.16, 1],
      ],
    ]);
    return [0.38, 0.85];
  },

  /** The coloured lines. */
  // red cuts the stamp's square, clockwise from its top left corner (Sound's dot ends there); the others write
  // the letters over the red: purple ㅏ's upright, yellow its arm (Library's dot at the tip), green ㅋ's top and side, orange ㅋ's middle bar
  // (right to left, so its dot sits clear of green), blue the ㅡ (Freediving's dot at its right end). Points close to each corner keep it square
  lines: () => [
    { li: 1, path: SEAL_SQ },
    {
      li: 6,
      path: [
        [0.3, -0.92],
        [0.3, -0.64],
        [0.3, -0.36],
        [0.3, -0.1],
      ],
    },
    {
      li: 2,
      path: [
        [0.3, -0.5],
        [0.45, -0.5],
        [0.6, -0.5],
        [0.74, -0.5],
      ],
    },
    {
      li: 5,
      path: [
        [-0.8, 0.1],
        [-0.2, 0.1],
        [0.4, 0.1],
        [0.68, 0.1],
        [0.72, 0.12],
        [0.72, 0.3],
        [0.72, 0.54],
      ],
    },
    {
      li: 4,
      path: [
        [0.62, 0.33],
        [0.14, 0.33],
        [-0.34, 0.33],
        [-0.8, 0.33],
      ],
    },
    {
      li: 3,
      path: [
        [-0.84, 0.76],
        [-0.28, 0.76],
        [0.28, 0.76],
        [0.84, 0.76],
      ],
    },
  ],

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return {
      sound: [cx - SEAL.x * R, cy - (SEAL.y - 0.01) * R],
      library: [cx + 0.74 * R, cy - 0.5 * R],
      freediving: [cx + 0.84 * R, cy + 0.76 * R],
      // labels sit just outside the stamp's right edge, clear of the letters
      labelAt: { library: [cx + SEAL.x * R + 58, cy - 0.5 * R], freediving: [cx + SEAL.x * R + 74, cy + 0.76 * R] },
    };
  },
};
