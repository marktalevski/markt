// Arriving from Sound or the Library: their menu dots are handed over where Sound's beat pads closed into them, or where the
// Library's books folded into them. Home's dot and this page's draw the water's three surface lines; the rest fly up into the menu.
import { clamp, cubicAt, easeInOutCubic, smooth } from '../lib/math.js';
import { navDotEl, navDots } from '../lib/nav.js';
import { waveY } from '../lib/surface.js';
import { mix, rgb } from './palette.js';

// the beads' timings (s). Each line's bead comes down to the left edge, sweeps across (its line drawn behind it), then lifts off the
// right end and up into its menu dot. Lines: 0 black (Home's dot), 1 light blue and 2 deep blue (this page's dot, split in two)
const HANDED = { down: 0.75, sweep: 1.5, lag: [0, 0.1, 0.2], up: 0.8 };

/** How much (0..1) of surface line k its bead has drawn, T seconds in. */
export function surfaceDrawn(T, k) {
  const u = (T - HANDED.down - HANDED.lag[k]) / HANDED.sweep;
  return u <= 0 ? 0 : smooth(clamp(u, 0, 1));
}

/** The handed-over dots on their way: three beads drawing the surface, the others flying up to the menu. */
export function drawHandedDots(s, ctx, T, sy, o, t, W) {
  const S = HANDED,
    nf = s.handed,
    ease = easeInOutCubic,
    bz = cubicAt;
  if (!s.menuDots) {
    s.menuDots = navDots();
    document.querySelectorAll('[data-navdot]').forEach(d => {
      d.style.opacity = '0';
    });
  }
  const NV = s.menuDots,
    land = k => {
      const d = navDotEl(k);
      if (d && d.style.opacity !== '1') d.style.opacity = '1';
    };
  const bead = (p, col, r) => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgb(col);
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, 6.2832);
    ctx.fill();
  };
  const COL = [
      [20, 20, 20],
      [0, 158, 224],
      [34, 86, 186],
    ],
    FD = [24, 88, 224];
  // the three surface beads
  for (let k = 0; k < 3; k++) {
    const from = k ? nf.freediving : nf.home,
      L = [-6, sy + waveY(-6 - o.x, k, t)],
      R = [W - 6, sy + waveY(W - 6 - o.x, k, t)],
      D = NV[k ? 'freediving' : 'home'] || [W - 40, 28];
    const g0 = (T - S.lag[k] * 0.5) / S.down,
      rv = surfaceDrawn(T, k),
      gu = (T - S.down - S.lag[k] - S.sweep) / S.up;
    let p,
      col = COL[k],
      r = 4.5 - k * 0.6;
    if (g0 < 1) {
      const u = ease(clamp(g0, 0, 1));
      p = bz(from, [from[0], from[1] - 120], [L[0] + 140, L[1] - 60], L, u);
      if (k) col = mix(FD, COL[k], u);
    } else if (gu <= 0) {
      const x = -20 + (W + 40) * rv,
        xx = Math.min(x, W - 6);
      p = [xx, sy + waveY(xx - o.x, k, t)];
    } else if (gu < 1) {
      const u = ease(clamp(gu, 0, 1));
      p = bz(R, [R[0] + 30, R[1] - 90], [D[0] - 20, D[1] + 120], D, u);
      if (k) col = mix(COL[k], FD, u);
      r = r + (4.5 - r) * u;
    } else {
      land(k ? 'freediving' : 'home');
      continue;
    }
    bead(p, col, r);
  }
  // the other dots fly straight up into their places in the menu
  const RGB = {
    sound: [232, 34, 44],
    library: [255, 196, 0],
    c4: [255, 118, 18],
    c5: [22, 168, 82],
    c6: [138, 64, 214],
  };
  Object.keys(RGB).forEach((k, i) => {
    const from = nf[k],
      D = NV[k];
    if (!from || !D) {
      land(k);
      return;
    }
    const g = (T - 0.15 - i * 0.08) / 1.1;
    if (g >= 1) {
      land(k);
      return;
    }
    const u = ease(clamp(g, 0, 1)),
      p = bz(from, [from[0] - 60, from[1] - 220], [D[0] - 40, D[1] + 160], D, u);
    bead(p, RGB[k], 4);
  });
}
