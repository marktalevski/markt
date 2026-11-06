// The seven brush lines every symbol is painted with: the black ink line that draws the symbol, and six coloured ones. Three of the
// colours are the site's pages (each ends in that page's dot); the other three are the pages still to come.
export const INK = [20, 20, 20],
  BLUE = [24, 88, 224];

/**
 * col: its colour; w: its width (px); d: when it sets off (s); spd: how fast it draws; keep: the ink line, which draws the whole
 * symbol; page: the page it leads to; u: for the others, about where along the symbol they would ride if nowhere better is found.
 */
export const LINES = [
  { col: INK, w: 11, d: 0.35, spd: 1, keep: 1 },
  { col: [232, 34, 44], w: 9, d: 0.45, spd: 1, page: 'sound' },
  { col: [255, 196, 0], w: 9, d: 0.55, spd: 0.97, page: 'library' },
  { col: BLUE, w: 9.5, d: 0.65, spd: 1.02, page: 'freediving' },
  { col: [255, 118, 18], w: 9, d: 0.75, spd: 1, u: 0.5 },
  { col: [22, 168, 82], w: 9, d: 0.85, spd: 0.97, u: 0.66 },
  { col: [138, 64, 214], w: 9, d: 0.95, spd: 1.02, u: 0.82 },
];

/** The dots at the lines' ends, in menu order. (Home's black dot is 'ink' here; the other pages call it 'home'.) */
export const DOT_KEYS = ['ink', 'freediving', 'sound', 'library', 'c4', 'c5', 'c6'];

// the ink line draws at its natural pace up to this many seconds of travel, then speeds up, so long symbols (vinyl, coffee) are ready
// as soon as short ones
const INK_RUN = 4.2;

/** How long line P takes to draw (s). */
export function durOf(s, P) {
  const fast = s.shapeName === 'spring' && s.colorPaths && s.colorPaths[LINES.indexOf(P.L)],
    run = P.len / (fast ? 2400 : s.shapeName === 'octopus' && P.L.keep ? 1300 : 650);
  return (2.8 + (P.L.keep ? Math.min(run, INK_RUN) : run)) / P.L.spd;
}

/** When line P has finished drawing (s). */
export function endOf(s, P) {
  return P.tr ? P.L.d * 0.6 + (1.6 + (P.len - P.oldLen) / 900) / P.L.spd : (P.d ?? P.L.d) + durOf(s, P);
}
