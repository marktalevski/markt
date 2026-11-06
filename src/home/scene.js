// One frame of Home: the lines as far as they have been drawn (strokes.js, paint.js), then the dots at their ends, the pages' labels,
// and the paper's grain over everything.
import { clamp, smooth } from '../lib/math.js';
import { fadeAt } from './fade.js';
import { LABEL, labelFx, labelPulse, placeLabel } from './labels.js';
import { layout, shapeWanted } from './layout.js';
import { drawBuoy, drawFlyingDots, exitQuads } from './leave.js';
import { LINES, durOf, endOf } from './lines.js';
import { paintQuads } from './paint.js';
import { lineQuads } from './strokes.js';

/**
 * Everything to paint this frame on a page W x H, as quads (see strokes.js). Lays the symbol out first if the page's size or the
 * symbol has changed. Gives { quads, topPid, gone (how far the lines have faded on the way out) }.
 */
export function frameQuads(s, W, H) {
  if (!s.geo || s.geo.W !== W || s.geo.H !== H || s.shapeName !== shapeWanted(s)) {
    const changed = s.geo && s.shapeName !== shapeWanted(s);
    layout(s, W, H);
    if (changed) s.time = 0;
  }
  const T = s.time,
    G = s.leaving,
    gone = G == null ? 0 : smooth(clamp(G / 0.5, 0, 1));
  s.readyT = endOf(s, s.paths[0]) + 0.3; // when the symbol is drawn and the page can be used
  if (s.previous && T > 8) s.previous = null;
  const made = lineQuads(s, T, G, gone);
  exitQuads(s, made, G, W, H);
  return { quads: made.quads, topPid: made.topPid, gone };
}

/** Paints the frame. */
export function drawFrame(s) {
  const cv = s.canvas,
    W = innerWidth,
    H = innerHeight,
    dpr = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    s.grainPattern = null;
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const { quads, topPid, gone } = frameQuads(s, W, H),
    T = s.time,
    G = s.leaving;
  paintQuads(s, ctx, quads, topPid);

  // the pages' buttons and labels follow their dots; a hovered dot has a soft glow of its colour round it
  const bP = s.paths.find(P => P.L.page === 'freediving'),
    bEnd = bP.L.d + durOf(s, bP);
  const dA = smooth(clamp((T - Math.max(s.readyT, bEnd)) / 0.5, 0, 1)) * (1 - gone);
  const hd = s.heads && s.heads.freediving,
    [stx, sty] = hd && hd.t === T ? hd.p : s.station,
    btn = s.buttons.freediving;
  const LAf = s.labelAt && s.labelAt.freediving;
  if (btn) {
    placeLabel(btn, [stx, sty], LAf, LAf ? null : s.labelSide && s.labelSide['freediving']);
    btn.style.opacity = dA.toFixed(3);
    btn.style.pointerEvents = dA > 0.5 ? 'auto' : 'none';
    labelFx(
      s,
      'freediving',
      btn,
      [stx, sty],
      !!s.overDive && dA > 0.5,
      LAf && LAf.length > 2 ? [LAf[2], LAf[3]] : null
    );
  }
  if (dA > 0) {
    const dx = stx,
      dy = sty;
    if (s.overDiveT > 0.01) {
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, 60);
      g.addColorStop(0, `rgba(30,90,190,${0.3 * s.overDiveT * dA})`);
      g.addColorStop(1, 'rgba(30,90,190,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(dx, dy, 60, 0, 6.2832);
      ctx.fill();
    }
  }
  [
    ['sound', [214, 40, 40]],
    ['library', [200, 150, 0]],
  ].forEach(([pg, c]) => {
    const P = s.paths.find(q => q.L.page === pg),
      S = s.stations[pg];
    if (!P || !S) return;
    const a2 = smooth(clamp((T - Math.max(s.readyT, endOf(s, P))) / 0.5, 0, 1)) * (1 - gone),
      el = s.buttons[pg];
    const LA = s.labelAt && s.labelAt[pg],
      hh = s.heads && s.heads[pg];
    if (el) {
      placeLabel(el, hh && hh.t === T ? hh.p : S, LA, LA ? null : s.labelSide && s.labelSide[pg]);
      el.style.opacity = a2.toFixed(3);
      el.style.pointerEvents = a2 > 0.5 ? 'auto' : 'none';
      labelFx(
        s,
        pg,
        el,
        hh && hh.t === T ? hh.p : S,
        !!s.overPage[pg] && a2 > 0.5,
        LA && LA.length > 2 ? [LA[2], LA[3]] : null
      );
    }
    const hv = s.overPageT[pg] || 0;
    if (hv > 0.01 && a2 > 0) {
      const hp = hh && hh.t === T ? hh.p : S,
        g = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 60);
      g.addColorStop(0, 'rgba(' + c.join(',') + ',' + (0.3 * hv * a2).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + c.join(',') + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hp[0], hp[1], 60, 0, 6.2832);
      ctx.fill();
    }
  });
  if (G != null && !s.dest && s.exits) drawBuoy(s, ctx, G, W, H);
  // arriving from another page: hold each menu dot in place until its line sets off from it
  if (s.arriving && G == null && T < 4)
    LINES.forEach((L, li) => {
      const key = L.keep ? 'ink' : L.page || 'c' + li,
        p = s.arriving[key],
        h = s.heads && s.heads[key];
      if (!p || (h && h.t === T)) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgb(${L.col[0]},${L.col[1]},${L.col[2]})`;
      ctx.beginPath();
      ctx.arc(p[0], p[1], /^c\d/.test(key) ? 5.5 : 8, 0, 6.2832);
      ctx.fill();
    });
  if (s.exitHeads)
    for (const eh of s.exitHeads) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = eh.col;
      ctx.beginPath();
      ctx.arc(eh.p[0], eh.p[1], eh.r, 0, 6.2832);
      ctx.fill();
    }
  if (G != null && s.flyFrom) drawFlyingDots(s, ctx, G, W, H);
  // the dot at each line's head
  if (s.heads)
    for (const pg in s.heads) {
      const h = s.heads[pg];
      if (h.t !== T) continue;
      if (G != null && s.flyFrom && s.flyFrom[pg]) continue;
      const hv = pg === 'freediving' ? s.overDiveT : pg === 'ink' ? s.overInkT * 1.6 : s.overPageT[pg] || 0,
        hs =
          [...(s.shapeName || '')].reduce((x, ch) => x + ch.charCodeAt(0), 0) +
          ['freediving', 'sound', 'library'].indexOf(pg) * 7,
        endR = [5, 8.5, 12.5][hs % 3],
        r = (pg === 'ink' ? 8 : 7.5 * (1 - h.set) + endR * h.set) + hv * 2 + LABEL.pulseR * labelPulse(s, pg),
        al =
          (1 - gone) * fadeAt(s, pg === 'ink' ? 0 : /^c\d$/.test(pg) ? +pg[1] : LINES.findIndex(L => L.page === pg), 1);
      if (al <= 0) continue;
      ctx.globalAlpha = al;
      ctx.fillStyle = `rgb(${h.col[0]},${h.col[1]},${h.col[2]})`;
      ctx.beginPath();
      ctx.arc(h.p[0], h.p[1], r, 0, 6.2832);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  s.overInkT += (s.overInk - s.overInkT) * (1 - Math.exp(-(s.frameDt || 1 / 60) * 9.75)); // by the clock (.15 a frame at 60fps), not per frame
  {
    const b = s.inkButton,
      h = s.heads && s.heads.ink;
    if (b) {
      const on = h && h.t === T && T >= s.readyT && G == null;
      if (h && h.t === T) {
        b.style.left = h.p[0] + 'px';
        b.style.top = h.p[1] + 'px';
      }
      b.style.pointerEvents = on ? 'auto' : 'none';
    }
  }
  if (!s.grainPattern) s.grainPattern = ctx.createPattern(s.grain, 'repeat');
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = s.grainPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
