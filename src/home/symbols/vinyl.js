// A record on its turntable, the tone arm resting on it.
import { TAU } from '../../lib/math.js';

export default {
  ringExtra: 30, // extra room (px) for the small dots beyond the drawing, so they stand clear of the band round the record
  limit: 0.45, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ push, lineTo, circ }) {
    lineTo([
      [1.45, -1.15],
      [1.35, -0.35],
      [0.7, -0.12],
    ]);
    circ([0, 0], 1.0, -0.17, 1, 160);
    for (let q = 1; q <= 260; q++) {
      const u = q / 260,
        a = -0.17 + u * TAU * 2.2,
        r = 1.0 - 0.55 * u;
      push(Math.cos(a) * r, Math.sin(a) * r);
    }
    {
      const a0 = -0.17 + TAU * 2.2;
      circ([0, 0], 0.3, a0, 1, 60);
      circ([0, 0], 0.07, a0, 1, 20);
    }
    return [-0.6, 1.3];
  },
};
