// The dive's colours: the water at each depth, and what reads on it.
import { clamp, smooth } from '../lib/math.js';

export const PAPER = [245, 243, 238];
export const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export const mix = (a, b, u) => a.map((v, j) => v + (b[j] - v) * u);

// the water's colour by depth in metres: pale at the surface, near black at 52 m
const WATER = [
  [0, [152, 202, 222]],
  [8, [82, 150, 198]],
  [20, [40, 98, 166]],
  [35, [20, 50, 108]],
  [52, [8, 16, 46]],
];
/** The water's colour at depth m. */
export function waterAt(m) {
  m = clamp(m, 0, 52);
  for (let i = 1; i < WATER.length; i++)
    if (m <= WATER[i][0]) {
      const k = (m - WATER[i - 1][0]) / (WATER[i][0] - WATER[i - 1][0]);
      return WATER[i - 1][1].map((v, j) => v + (WATER[i][1][j] - v) * k);
    }
  return WATER[WATER.length - 1][1];
}

// tints that come into the light as the dive goes on: how far through the dive (0..1) each starts and is fully in
export const HUES = { r: [126, 196, 220], b: [34, 86, 186], y: [150, 222, 255] };
const HUE_RANGE = { r: [0.02, 0.24], y: [0.58, 0.88] };
/** How far in (0..1) tint k is, for how far through the dive the page is (s.diveFraction). */
export function colourIn(s, k) {
  const r = HUE_RANGE[k],
    f = s.diveFraction || 0;
  return smooth(clamp((f - r[0]) / (r[1] - r[0]), 0, 1));
}

// which of dark ink and paper white reads better on a colour (by contrast ratio, as in the accessibility guidelines)
const luminance = c => {
  const l = c.map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const LUM_INK = luminance([20, 20, 20]),
  LUM_PAPER = luminance(PAPER);
/** Dark ink or paper white: whichever reads better on the water at depth m. */
export function inkFor(m) {
  const c = luminance(waterAt(m));
  return contrast(c, LUM_INK) >= contrast(c, LUM_PAPER) ? '#141414' : '#f5f3ee';
}
