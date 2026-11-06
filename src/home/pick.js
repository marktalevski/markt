// Which symbol to paint.
import { SHAPES } from './symbols/index.js';

const SEEN_KEY = 'shape-seen-v2';

/**
 * A weighted pick: every symbol shown is counted (in this browser, across visits), and the more often one has been shown the less
 * likely it is to come up again: one not seen yet is 8 times as likely as one seen once, 27 times as one seen twice. Once every
 * symbol has been seen, all the counts drop by the smallest, so it starts favouring the least-seen again rather than settling.
 * `exclude`: the one showing now (or shown last), which never repeats.
 */
export function pickShape(exclude) {
  let seen = {};
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
  } catch (e) {}
  const opts = SHAPES.filter(x => x !== exclude),
    w = opts.map(x => 1 / Math.pow(1 + (seen[x] || 0), 3)),
    tot = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot,
    k = 0;
  while (k < opts.length - 1 && (r -= w[k]) > 0) k++;
  const pick = opts[k];
  seen[pick] = (seen[pick] || 0) + 1;
  const low = Math.min(...SHAPES.map(x => seen[x] || 0));
  if (low > 0)
    SHAPES.forEach(x => {
      seen[x] = (seen[x] || 0) - low;
    });
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    sessionStorage.setItem('home-shape', pick);
  } catch (e) {}
  return pick;
}
