// Hovering a page's dot (or the black ink dot) fades every other line, like watercolour bleeding into paper: each washes from the
// start of its stroke to its tail, all in step, down to a quarter strength. It plays back in reverse when the hover ends.
import { clamp, easeInOut } from '../lib/math.js';
import { LINES } from './lines.js';

// seconds for the wash to cross a stroke, opacity reached, width of the wet edge (share of the stroke), how much that edge wanders
export const FADE = { sweep: 1.1, to: 0.25, soft: 0.9, wander: 0.07 };

/** Moves every line's wash along (s.fade: seconds into it, per line). */
export function fadeTick(s, dt) {
  dt = Math.max(0, dt);
  const pg =
      s.leaving != null || !(s.time >= s.readyT)
        ? null
        : s.overDive
          ? 'freediving'
          : s.overPage.sound
            ? 'sound'
            : s.overPage.library
              ? 'library'
              : s.overInk
                ? 'ink'
                : null,
    hl = pg === 'ink' ? 0 : pg ? LINES.findIndex(L => L.page === pg) : -1;
  s.fade = s.fade.map((c, li) => {
    const tg = hl >= 0 && li !== hl ? FADE.sweep : 0;
    return tg > c ? Math.min(tg, c + dt) : Math.max(tg, c - dt);
  });
}

/** How strong line li is at x along it (0 at the start of the visible stroke, 1 at its tail): 1 unfaded, down to FADE.to. */
export function fadeAt(s, li, x) {
  const c = s.fade && s.fade[li];
  if (!c) return 1;
  const p = easeInOut(clamp(c / FADE.sweep, 0, 1));
  if (p <= 0) return 1;
  // the wet edge creeps unevenly, a little ahead here and behind there (the same on every line, so they stay in step), and settles gently (smootherstep)
  const xw = x + FADE.wander * (Math.sin(x * 7.3 + 2.1) + 0.5 * Math.sin(x * 17.9 + 4.7)) * Math.sin(Math.PI * p),
    u = clamp((p * (1 + FADE.soft) - xw) / FADE.soft, 0, 1);
  return 1 - (1 - FADE.to) * u * u * u * (u * (u * 6 - 15) + 10);
}
