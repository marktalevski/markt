// The great wave: its back rises from the water to a curl that is a golden spiral. A row of small waves, exact copies of it, runs under
// it (the coloured lines), and blue rides the big one.
import { cat, catW, link } from '../curves.js';

// golden spiral: from the top of a circle of radius r0 round c (angle a0), turning clockwise, the radius shrinks by φ every quarter turn,
// the curve of a golden rectangle's nested squares. n points per turn, w(u) the brush weight along it
const PHI = (1 + Math.sqrt(5)) / 2;
const goldSpiral = (c, r0, a0, turns, n, w) => {
  const m = Math.max(2, Math.round(n * turns));
  return Array.from({ length: m }, (_, q) => {
    const u = (q + 1) / m,
      t = u * turns * Math.PI * 2,
      r = r0 * Math.pow(PHI, -t / (Math.PI / 2));
    const p = [c[0] + Math.cos(a0 + t) * r, c[1] + Math.sin(a0 + t) * r];
    return w ? [p[0], p[1], w(u)] : p;
  });
};
// the big black wave's line: its back (from the water up to the top of its curl) and its golden-spiral curl, in unit coordinates.
// The wave symbol draws it, and every small wave is an exact scaled copy of it
const WAVE_BACK = [
    [-1.9, 0.74],
    [-1.45, 0.7],
    [-1.0, 0.6],
    [-0.6, 0.36],
    [-0.3, -0.02],
    [-0.05, -0.42],
    [0.22, -0.68],
    [0.5, -0.76],
    [0.72, -0.72],
  ],
  WAVE_C = [0.72, -0.38],
  WAVE_R = 0.34,
  WAVE_TURNS = 1.0;
// the same line in a small wave's own units: crest top at 0,0 and the wave 1 tall
const WAVE_H = WAVE_BACK[0][1] - (WAVE_C[1] - WAVE_R),
  MINI_BACK = WAVE_BACK.map(p => [(p[0] - WAVE_C[0]) / WAVE_H, (p[1] - WAVE_C[1] + WAVE_R) / WAVE_H]),
  MINI_R = WAVE_R / WAVE_H;
// how much bigger than its WAVES box a small wave is drawn, so its curl reads clearly round the dot
const MINI_GROW = 1.9;
// scale s and crest top T so the wave starts at (x0, y0) on the water and fits width w and height h
const miniFit = (x0, y0, w, h) => {
  const b = MINI_BACK[0],
    s = Math.min(w / (-b[0] + MINI_R), h / b[1]) * MINI_GROW;
  return [s, [x0 - b[0] * s, y0 - b[1] * s]];
};
const miniC = (x0, y0, w, h) => {
  const [s, T] = miniFit(x0, y0, w, h);
  return [[T[0], T[1] + MINI_R * s], MINI_R * s, s];
};
const miniWave = (x0, y0, w, h) => {
  const [s, T] = miniFit(x0, y0, w, h),
    [C, r] = miniC(x0, y0, w, h),
    out = [];
  cat(
    MINI_BACK.map(p => [T[0] + p[0] * s, T[1] + p[1] * s]),
    6,
    (x, y) => out.push([x, y])
  );
  for (const p of goldSpiral(C, r, -Math.PI / 2, WAVE_TURNS, 44)) out.push(p);
  return out;
};
// [line, start x, start y (on the water), width, height] in unit coordinates; li 3 (blue) rides the big wave instead
// the small waves sit in one row under the big one, evenly spaced and alternately high and low (blue rides the big wave)
const WAVES = [
  [3, -1.6, 0.66, 1.6, 1.0],
  ...[1, 4, 5, 2, 6].map((li, k) => [li, -2.25 + k * 0.85, k % 2 ? 1.74 : 1.52, 0.6, 1]),
];
// blue rides the big wave: up its back just inside the black line, over the crest, and curls into the heart of the curl
const blueRide = (() => {
  const o = [];
  cat(
    [
      [-1.05, 0.7],
      [-0.62, 0.48],
      [-0.3, 0.1],
      [-0.06, -0.3],
      [0.2, -0.57],
      [0.48, -0.66],
      [0.72, -0.63],
    ],
    10,
    (x, y) => o.push([x, y])
  );
  for (const p of goldSpiral([0.72, -0.38], 0.25, -Math.PI / 2, 0.92, 44)) o.push(p);
  return o;
})();

export default {
  hideLinks: true, // the brush's unseen moves between its strokes are hidden completely
  ownLines: true, // its page lines follow their own path all the way to their dots
  loops: true, // where its line turns sharply the brush swings round in a small loop
  limit: 0.6, // (how far along the ink line a small coloured line may start, when no better place is found)

  /** The black line. */
  ink({ strokes }) {
    const back = catW(WAVE_BACK, 12, 0.7, 1.1),
      cur = [],
      c = WAVE_C;
    // the curl is a golden spiral round the heart of the wave
    for (const p of goldSpiral(c, WAVE_R, -Math.PI / 2, WAVE_TURNS, 70, u => 1.05 - 0.4 * u)) cur.push(p);
    const face = catW(
      [
        [0.56, 0.06],
        [0.66, 0.34],
        [0.9, 0.58],
        [1.3, 0.7],
        [1.9, 0.74],
      ],
      12,
      0.95,
      0.6
    );
    strokes([back, cur, link(cur[cur.length - 1], face[0]), face]);
    return [-0.25, 1.25];
  },

  /** The coloured lines. */
  lines: () => WAVES.map(([li, x0, y0, w, h]) => ({ li, path: li === 3 ? blueRide : miniWave(x0, y0, w, h) })),

  /** Where its page dots and their labels sit. */
  dots({ cx, cy, R }) {
    const wEnd = li => {
      const W0 = WAVES.find(v => v[0] === li),
        p = li === 3 ? blueRide : miniWave(...W0.slice(1)),
        e = p[p.length - 1];
      return [cx + e[0] * R, cy + e[1] * R];
    };
    return {
      sound: wEnd(1),
      library: wEnd(2),
      freediving: wEnd(3),
      labelAt: (() => {
        const lc = (li, dx, dy, deg, sc) => {
          const W0 = WAVES.find(v => v[0] === li),
            [C, r] = miniC(...W0.slice(1));
          return [cx + (C[0] + dx * r) * R, cy + (C[1] + dy * r) * R, deg, sc];
        };
        return {
          freediving: [cx + 1.3 * R, cy - 0.58 * R, -9, 1.18],
          sound: lc(1, -1.6, -1.7, -12, 0.92),
          library: lc(2, -1.3, -2.3, -4, 1.04),
        };
      })(),
    };
  },
};
