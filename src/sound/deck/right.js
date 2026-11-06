// The deck's right side: the six numbered knobs and the beat pads, and the dots that fly in and become the pads (and close back
// into dots on the way out).
import { padOf } from '../../lib/deck-layout.js';
import { TAU, clamp, easeInOut, smooth } from '../../lib/math.js';
import { DOT_KEYS } from '../../lib/nav.js';
import { GREY, MICHROMA, MONO, PAD_COLOURS, PAD_LABEL_COLOURS, PAD_NAMES, glow, noGlow, roundRect } from './paint.js';

// arriving, each menu dot opens out into its beat pad over DOT_OPEN.dur seconds, starting at t0 + i * step (i in the menu's order);
// padReady(i) is when pad i is fully formed. The controller's fold-out is timed from these too
const DOT_OPEN = { t0: 1.45, step: 0.06, dur: 0.35 };
export const padReady = i => DOT_OPEN.t0 + i * DOT_OPEN.step + DOT_OPEN.dur;

/**
 * The six numbered knobs: a dark well, the numbers 0..9 round it, a raised cap with a pointer that clicks to each number; the number
 * it points at is lit. While the combination is set every number stays lit.
 */
export function drawKnobs(s, { ctx, G, t, dt, fade, accent }) {
  // arriving, the knobs sweep round once as the deck comes alive
  if (s.arrival && t > 2.55 && !s.knobsSwept) {
    s.knobsSwept = true;
    s.knobAngle = s.knobs.map(() => 150);
  }
  const comboOn = s.knobs.join('') === '523869',
    comboK = comboOn ? 1 : 0;
  G.knobs.forEach(([kx, ky, kr], i) => {
    const v = s.knobs[i],
      rw = s.knobRaw[i],
      tgt = -150 + (v * 300) / 9 + (rw != null ? (rw - (-150 + (v * 300) / 9)) * 0.3 : 0);
    s.knobAngle[i] += (tgt - s.knobAngle[i]) * Math.min(1, dt * (s.arrival ? 5 : 34));
    const kk = s.knobKick[i],
      kA = s.knobAngle[i] + (kk ? kk.d * 6 * Math.exp(-(t - kk.t) * 24) * Math.cos((t - kk.t) * 60) : 0);
    const hv = s.knobOver === i || s.knobHeld === i,
      fzk = clamp(kr * 0.48, 5.5, 8),
      nr = kr + fzk * 0.7 + 1.8,
      nh = s.knobPoint && s.knobPoint.i === i ? s.knobPoint.q : -1;
    ctx.globalAlpha = 1 - fade;
    ctx.fillStyle = '#060708';
    ctx.beginPath();
    ctx.arc(kx, ky + 1.5, kr + 3, 0, TAU);
    ctx.fill();
    ctx.font = '500 ' + fzk.toFixed(1) + 'px ' + MONO;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let q = 0; q <= 9; q++) {
      const mq = ctx.measureText(String(q)),
        dx = (mq.actualBoundingBoxLeft - mq.actualBoundingBoxRight) / 2,
        dy = (mq.actualBoundingBoxAscent - mq.actualBoundingBoxDescent) / 2;
      const a = ((-150 + (q * 300) / 9) * Math.PI) / 180,
        on = q === v,
        lit = on || comboK > 0,
        nx = kx + Math.sin(a) * nr,
        ny = ky - Math.cos(a) * nr;
      // the number under the pointer gets a small ring, so it reads as something to press
      if (q === nh) {
        ctx.globalAlpha = 1 - fade;
        ctx.fillStyle = accent.alpha(0.16);
        ctx.strokeStyle = accent.line;
        ctx.lineWidth = 1;
        glow(ctx, accent.line, 6);
        ctx.beginPath();
        ctx.arc(nx, ny, fzk * 0.62, 0, TAU);
        ctx.fill();
        ctx.stroke();
        noGlow(ctx);
      }
      ctx.globalAlpha = (1 - fade) * (lit || q === nh ? 1 : 0.55);
      ctx.fillStyle = lit ? (comboK > 0 && !on ? accent.alpha(0.4 + 0.6 * comboK) : accent.line) : GREY;
      if (on || comboK > 0) glow(ctx, accent.line, 6 + 6 * comboK);
      if (q === nh && !on) ctx.fillStyle = '#ffffff';
      ctx.fillText(String(q), nx + dx, ny + dy);
      noGlow(ctx);
    }
    ctx.globalAlpha = 1 - fade;
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    const kg = ctx.createLinearGradient(0, ky - kr, 0, ky + kr);
    kg.addColorStop(0, hv ? '#4c535b' : '#40464d');
    kg.addColorStop(1, hv ? '#24282d' : '#1d2024');
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.arc(kx, ky, kr, 0, TAU);
    ctx.fill();
    noGlow(ctx);
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(kx, ky, kr - 0.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    // fine grip lines round the cap's edge
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    for (let q = 0; q < 24; q++) {
      const a = (q / 24) * TAU + (kA * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(kx + Math.sin(a) * kr * 0.82, ky - Math.cos(a) * kr * 0.82);
      ctx.lineTo(kx + Math.sin(a) * kr * 0.97, ky - Math.cos(a) * kr * 0.97);
      ctx.stroke();
    }
    const pa = (kA * Math.PI) / 180;
    ctx.strokeStyle = '#f2f2f0';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(kx + Math.sin(pa) * kr * 0.25, ky - Math.cos(pa) * kr * 0.25);
    ctx.lineTo(kx + Math.sin(pa) * kr * 0.78, ky - Math.cos(pa) * kr * 0.78);
    ctx.stroke();
    ctx.lineCap = 'butt';
  });
}

/**
 * The beat pads, square, all the same rubbery grey, a shade lighter than the deck so they stand off it, each outlined and labelled in
 * its page's colour: Sound's glows (this page), the others glow under the pointer, the three to come are dimmer, the spare is blank.
 * Each one stands up out of a dark well with a lit top edge. A pad flashes as its dot lands in it.
 */
export function drawPads(s, { ctx, G, t, fade, accent, A }) {
  const flash = i => (A ? Math.sin(Math.PI * clamp((t - 1.4 - i * 0.06) / 0.7, 0, 1)) : 0);
  ctx.font = '400 ' + clamp(G.pads[0][2] / 9.5, 6, 8.5).toFixed(1) + 'px ' + MICHROMA;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...G.pads, ...G.cpads, G.spare].forEach(([px, py, pw, ph], i) => {
    const spare = i === 7,
      soon = i > 3 && !spare,
      col = spare ? accent.line : PAD_COLOURS[i],
      k = clamp(s.padGlow[i], 0, 1);
    const lit = spare
      ? clamp(
          Math.max(k * 0.15, s.kickAt != null ? Math.exp(-Math.max(0, performance.now() / 1000 - s.kickAt) * 7) : 0),
          0,
          1
        )
      : clamp(Math.max(i === 2 ? 1 : 0, k, flash(i)), 0, 1);
    ctx.globalAlpha = 1 - fade;
    ctx.fillStyle = '#060708';
    roundRect(ctx, px - 2, py - 1, pw + 4, ph + 5, 8);
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    const pg = ctx.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, '#3a3f46');
    pg.addColorStop(0.55, '#2c3036');
    pg.addColorStop(1, '#23262b');
    ctx.fillStyle = pg;
    roundRect(ctx, px, py, pw, ph, 7);
    ctx.fill();
    noGlow(ctx);
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(px + 6, py + 1.5, pw - 12, 1);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(px + 6, py + ph - 2.5, pw - 12, 1);
    if (lit > 0.02) {
      ctx.globalAlpha = (1 - fade) * (spare ? 0.7 : 0.18) * lit;
      ctx.fillStyle = col;
      if (spare) glow(ctx, col, 22 * lit);
      roundRect(ctx, px + 2, py + 2, pw - 4, ph - 4, 6);
      ctx.fill();
    }
    ctx.globalAlpha = (1 - fade) * (spare ? 0.3 + 0.7 * lit : soon ? 0.55 + 0.45 * k : 0.7 + 0.3 * lit);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6 + lit * 0.6;
    if (lit > 0.2) glow(ctx, col, 14 * lit);
    roundRect(ctx, px + 1.5, py + 1.5, pw - 3, ph - 3, 6);
    ctx.stroke();
    noGlow(ctx);
    if (!spare) {
      ctx.globalAlpha = (1 - fade) * (soon ? 0.75 + 0.25 * k : 0.85 + 0.15 * lit);
      ctx.fillStyle = i < 4 ? PAD_LABEL_COLOURS[i] : col;
      // the label shrinks to fit its pad; Freediving, if it still won't fit, breaks over two lines (FREE / DIVING)
      const lab = soon ? 'SOON' : PAD_NAMES[i].toUpperCase();
      let fz = clamp(pw / 9.5, 6, 9);
      ctx.font = '400 ' + fz + 'px ' + MICHROMA;
      while (ctx.measureText(lab).width > pw - 10 && fz > (lab === 'FREEDIVING' ? 5.6 : 4.8)) {
        fz -= 0.25;
        ctx.font = '400 ' + fz + 'px ' + MICHROMA;
      }
      if (ctx.measureText(lab).width > pw - 10 && lab === 'FREEDIVING') {
        const h2 = 4;
        fz = clamp(pw / 7.5, 6, 9);
        ctx.font = '400 ' + fz + 'px ' + MICHROMA;
        ctx.fillText(lab.slice(0, h2), px + pw / 2, py + ph / 2 - fz * 0.7);
        ctx.fillText(lab.slice(h2), px + pw / 2, py + ph / 2 + fz * 0.75);
      } else ctx.fillText(lab, px + pw / 2, py + ph / 2 + 0.5);
      noGlow(ctx);
    }
    ctx.globalAlpha = 1 - fade;
  });
}

/**
 * Arriving and leaving, each page is a dot: arriving, the dots fly in from where the last page left them and open out into their beat
 * pads; leaving, the pads close back into dots, which the next page picks up (s.dotAt: where each is, for handing over).
 */
export function drawDots(s, { ctx, dots, G, t, ds, A, O, asm, slide }) {
  s.dotAt = {};
  const dc = dots || ctx;
  if ((A && t < 2.85) || O)
    for (let i = 0; i < 7; i++) {
      const k = DOT_KEYS[i],
        cap = padOf(G, k),
        pd = i < 4 ? G.pads[i] : G.cpads[i - 4];
      let p = cap,
        a = 1;
      const fm = A ? smooth(clamp((t - DOT_OPEN.t0 - i * DOT_OPEN.step) / DOT_OPEN.dur, 0, 1)) : asm;
      if (A) {
        const f0 = A.dots[k] || (k === 'home' && A.dots.ink),
          f2 = f0 && [f0[0] / ds, f0[1] / ds];
        if (f2) {
          const u = clamp((t - 0.2 - i * 0.07) / 0.9, 0, 1),
            ub = t - (1.1 + i * 0.07);
          p = [
            f2[0] + (cap[0] - f2[0]) * easeInOut(u),
            f2[1] + (cap[1] - f2[1]) * u * u - (ub > 0 && ub < 0.3 ? Math.sin((ub / 0.3) * Math.PI) * 7 : 0),
          ];
        } else a *= smooth(clamp((t - 0.6) / 0.5, 0, 1));
      }
      s.dotAt[k] = [p[0] * ds, p[1] * ds];
      a *= A ? 1 - smooth(clamp((t - 2.45) / 0.35, 0, 1)) : 1 - 0.9 * fm * fm;
      if (a <= 0.01) continue;
      const pp = A ? fm : 1 - slide,
        c0 =
          i === 0
            ? 'rgb(' + [20, 20, 20].map((v, q) => Math.round(v + ([242, 242, 240][q] - v) * pp)).join(',') + ')'
            : PAD_COLOURS[i];
      const r0 = i < 4 ? 8 : 5.5,
        dw = 2 * r0 + (pd[2] - 2 * r0) * fm,
        dh = 2 * r0 + (pd[3] - 2 * r0) * fm,
        rad = r0 + (6 - r0) * fm;
      dc.globalAlpha = a;
      dc.fillStyle = c0;
      if (fm > 0) {
        dc.shadowColor = c0;
        dc.shadowBlur = 10 * fm;
      }
      dc.beginPath();
      if (fm <= 0) dc.arc(p[0], p[1], r0, 0, TAU);
      else if (dc.roundRect) dc.roundRect(p[0] - dw / 2, p[1] - dh / 2, dw, dh, rad);
      else dc.rect(p[0] - dw / 2, p[1] - dh / 2, dw, dh);
      dc.fill();
      dc.shadowBlur = 0;
      dc.shadowColor = 'transparent';
    }
  dc.globalAlpha = 1;
  ctx.globalAlpha = 1;
  ctx.lineJoin = 'round';
}
