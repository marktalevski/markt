// An open book. The coloured lines are handwritten notes on its pages.

// book: [line, dot x, row (0 top edge of the page, 1 bottom edge), other end x] in unit coordinates
const BOOK_NOTES = [
  [1, -1.17, 0.25, -0.37],
  [3, -1.16, 0.5, -0.42],
  [5, -1.17, 0.75, -0.36],
  [6, 1.16, 0.25, 0.29],
  [2, 1.15, 0.5, 0.32],
  [4, 1.14, 0.75, 0.41],
];
// height of a note row on the book: the pages' top and bottom edges sag the same way (through the spine, middle and outer corner), so a row
// arcs like they do. Exact for the three points the edges are drawn through, smooth in between
const bookRowY = (x, f) => {
  const ax = Math.abs(x),
    lag = (a, b, c) =>
      (a * (ax - 0.6) * (ax - 1.35)) / ((0 - 0.6) * (0 - 1.35)) +
      (b * ax * (ax - 1.35)) / (0.6 * (0.6 - 1.35)) +
      (c * ax * (ax - 0.6)) / (1.35 * (1.35 - 0.6));
  return lag(-0.48, -0.7, -0.6) * (1 - f) + lag(0.72, 0.55, 0.62) * f;
};

export default {
  ownLines: true, // its page lines follow their own path all the way to their dots

  /** The black line. */
  ink({ cv, lineTo }) {
    cv([
      [0, 0.72],
      [-0.6, 0.55],
      [-1.35, 0.62],
    ]);
    lineTo([
      [-1.35, 0.62],
      [-1.35, -0.6],
    ]);
    cv([
      [-1.35, -0.6],
      [-0.6, -0.7],
      [0, -0.48],
    ]);
    lineTo([
      [0, -0.48],
      [0, 0.72],
    ]);
    cv([
      [0, 0.72],
      [0.6, 0.55],
      [1.35, 0.62],
    ]);
    lineTo([
      [1.35, 0.62],
      [1.35, -0.6],
    ]);
    cv([
      [1.35, -0.6],
      [0.6, -0.7],
      [0, -0.48],
    ]);
    return [0, 1.05];
  },

  /** The coloured lines. */
  // left page: red, blue, green, each written towards its dot on the left; right page: purple, yellow, orange, each written out to
  // its dot on the right
  lines: () =>
    BOOK_NOTES.map(([li, dx, f, ex], i) => ({
      li,
      path: Array.from({ length: 15 }, (_, q) => {
        const u = q / 14,
          x = ex + (dx - ex) * u;
        return [x, bookRowY(x, f) + 0.01 * Math.sin(u * 19 + i * 1.7) + 0.005 * Math.sin(u * 47 + i)];
      }),
    })),

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    return {
      sound: [cx - 1.17 * R, cy + bookRowY(-1.17, 0.25) * R],
      freediving: [cx - 1.16 * R, cy + bookRowY(-1.16, 0.5) * R],
      library: [cx + 1.15 * R, cy + bookRowY(1.15, 0.5) * R],
      // labels sit just outside the pages, level with their dots (32 px gap plus half the label's width)
      labelAt: {
        sound: [cx - 1.17 * R - 69, cy + bookRowY(-1.17, 0.25) * R],
        freediving: [cx - 1.16 * R - 88, cy + bookRowY(-1.16, 0.5) * R],
        library: [cx + 1.15 * R + 73, cy + bookRowY(1.15, 0.5) * R],
      },
    };
  },
};
