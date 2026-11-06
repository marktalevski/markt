// The buoy the rope hangs from, with its flag. Its orange and the flag's red arrive along lines from the orange and red menu dots, and
// leave the same way.
import { clamp, smooth } from '../lib/math.js';
import { navDot, navDotEl } from '../lib/nav.js';
import { absorb } from './brush.js';

/** The buoy at (x, y), `size` its scale. s.buoyDrain and s.flagDrain (0..1) say how far its colours have drained to bare cream. */
export function drawBuoy(s, ctx, x, y, size, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.rotate(Math.sin(t * 1.1) * 0.06);
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, -46);
  ctx.stroke();
  {
    const k = s.flagDrain || 0,
      c = s.red || [240, 68, 58],
      m = (a, b) => Math.round(a + (b - a) * k);
    ctx.fillStyle = `rgb(${m(c[0], 236)},${m(c[1], 230)},${m(c[2], 218)})`;
  }
  ctx.beginPath();
  ctx.rect(0, -46, 22, 14);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f6efe0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(1.8, -44.2);
  ctx.lineTo(20.2, -33.8);
  ctx.stroke();
  {
    const k = s.buoyDrain || 0,
      m = (a, b) => Math.round(a + (b - a) * k);
    ctx.fillStyle = `rgb(${m(255, 236)},${m(118, 230)},${m(18, 218)})`;
  }
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 13, 0, 0, 6.2832);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f6efe0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 3.5, 0, 0, 6.2832);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 13, 0, 0, 6.2832);
  ctx.stroke();
  ctx.restore();
}

// arriving, the buoy and flag are bare (cream) until their dots colour them: once the buoy has dropped in, a line runs out of the orange
// menu dot into the buoy and out of the red one into the flag (the leave's thread, played backwards), and the colour floods in as each
// line arrives. Dots handed over from another page (Sound's pads, the Library's books) have risen into the menu with the rest by then
const PAINT = { lead: 0.55, run: 1.05, lag: { c4: 0, sound: 0.15 } };
const paintStart = s => (s.fromHome ? 1.15 : s.dropT + 0.4) - PAINT.lead;
/** How far (0..1) the colour line for dot k has run, T seconds into the arrival. */
const paintProgress = (s, T, k) => clamp((T - paintStart(s) - PAINT.lag[k]) / PAINT.run, 0, 1);
/** How far (0..1) that colour has flooded in. */
export const paintFill = (s, T, k) => smooth(clamp((paintProgress(s, T, k) - 0.6) / 0.4, 0, 1));

/**
 * The buoy's and flag's colour lines (see absorb): where each goes in or out (along the top of the float, and along the flag's top
 * edge) and how it looks. The same lines paint them arriving and drain them leaving. B: the buoy's [x, y, scale].
 */
export function colourLines(s, B) {
  const BS = B[2] || 1,
    RC = s.red || [232, 34, 44];
  return {
    c4: {
      src: Array.from({ length: 13 }, (_, q) => {
        const a = Math.PI + (q / 12) * Math.PI;
        return [B[0] + Math.cos(a) * 22 * BS, B[1] + Math.sin(a) * 13 * BS];
      }),
      w: 3.4,
      colA: [255, 118, 18],
      colB: [255, 118, 18],
      lift: 40,
      sway: 12,
      ph: 0.4,
    },
    sound: {
      src: [
        [B[0], B[1] - 46 * BS],
        [B[0] + 11 * BS, B[1] - 46.5 * BS],
        [B[0] + 22 * BS, B[1] - 46 * BS],
      ],
      w: 3,
      colA: RC,
      colB: RC,
      lift: 30,
      sway: 8,
      ph: 1.9,
    },
  };
}

/** Arriving: draws the two colour lines on their way from the menu dots to the buoy. */
export function paintBuoy(s, ctx, T, B) {
  if (!s.painted) s.painted = {};
  if (s.painted.c4 && s.painted.sound) return;
  if (!s.paintFrom) s.paintFrom = {};
  const CL = colourLines(s, B);
  ['c4', 'sound'].forEach(k => {
    if (s.painted[k]) return;
    const M = s.paintFrom[k] || (s.paintFrom[k] = navDot(k));
    if (!M) return;
    const e = paintProgress(s, T, k);
    if (e > 0 && e < 1) {
      absorb(ctx, CL[k].src, M, 1 - e, CL[k]);
      pulseDot(k, e);
    }
    if (e >= 1) s.painted[k] = true;
  });
}

/** A menu dot breathes once as the tail of its line goes in (g: 0..1 through the line's move). */
export function pulseDot(key, g) {
  const d = navDotEl(key);
  if (!d) return;
  const u = clamp((g - 0.88) / 0.3, 0, 1);
  d.style.transform = 'scale(' + (1 + 0.22 * Math.sin(Math.PI * u)).toFixed(3) + ')';
  d.style.boxShadow = 'none';
}
