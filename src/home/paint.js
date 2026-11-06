// Paint, not outline: how the quads of a frame (see strokes.js) are laid on the paper.
//
// Each line is filled as one shape, so it never overlaps itself or shows seams; lines then blend translucently with each other. For
// each line: an opacity mask is built with max-blending (overlaps keep the strongest value, and slight overlaps hide the joins), then
// page = page * (1 - mask) + colour * mask, which is exact translucency with no levels and no seams. The colour is not flat: see
// streaks.
import { clamp, smooth } from '../lib/math.js';

const colRGB = {};
/**
 * The texture of a real brush stroke, painted over a line's flat colour (cx3: where; qs: the line's quads; col: its colour; ink: the
 * black line). Four things real strokes do:
 * 1. ridges catch the light: one light from the upper left, so the edge facing it gets a pale highlight and the opposite edge a soft
 *    shadow, swapping as the stroke turns
 * 2. colour mixed on the brush stays in stripes: two or three bands of the same hue, a little lighter or deeper, running the length
 *    of the stroke
 * 3. the brush is fullest where it lands: the first stretch is richer and the ridges heavier
 * 4. it runs out: towards the tail bristles lose contact and paper shows through in fine gaps (dry brush)
 */
function streaks(cx3, qs, col, ink) {
  let base = colRGB[col];
  if (!base) {
    const m = col.match(/\d+/g);
    base = colRGB[col] = m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  }
  const mix = (c2, k) => 'rgb(' + base.map((v, i) => Math.round(v + (c2[i] - v) * k)).join(',') + ')',
    LT = ink ? [110, 108, 104] : [255, 253, 244],
    DK = ink ? [0, 0, 0] : [14, 8, 30],
    PAPER = [245, 243, 238];
  let sd = 0;
  for (let i = 0; i < col.length; i++) sd = (sd * 31 + col.charCodeAt(i)) % 997;
  const n = qs.length,
    lx = -0.6,
    ly = -0.8,
    bins = new Map(),
    P = (A, B, f) => [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
  const put = (key, style, a, q, f0a, f1a, f0b, f1b) => {
    let e = bins.get(key);
    if (!e) bins.set(key, (e = { style, a, p: new Path2D() }));
    const s0 = P(q[0], q[3], f0a),
      s1 = P(q[1], q[2], f0b),
      s2 = P(q[1], q[2], f1b),
      s3 = P(q[0], q[3], f1a);
    e.p.moveTo(s0[0], s0[1]);
    e.p.lineTo(s1[0], s1[1]);
    e.p.lineTo(s2[0], s2[1]);
    e.p.lineTo(s3[0], s3[1]);
    e.p.closePath();
  };
  const stripes = [
    [0.18, 0.2, LT, ink ? 0.2 : 0.32],
    [0.5, 0.14, DK, ink ? 0.35 : 0.24],
    [0.68, 0.16, LT, ink ? 0.14 : 0.22],
  ];
  for (let i = 0; i < n; i++) {
    const q = qs[i].q;
    if (q.length !== 4) continue;
    const t = n > 1 ? i / (n - 1) : 0,
      ph = i * 0.045 + sd,
      ph2 = ph + 0.045,
      load = 1 - smooth(clamp(t / 0.18, 0, 1));
    const ex = q[0][0] - q[3][0],
      ey = q[0][1] - q[3][1],
      el = Math.hypot(ex, ey) || 1,
      d = (ex * lx + ey * ly) / el;
    // 1 + 3: ridges, lit or shaded by which way the edge faces; heavier while the brush is loaded
    for (const side of [0, 1]) {
      const ds = side ? -d : d,
        lv = Math.round(ds * 2);
      if (!lv) continue;
      const ew = (0.1 + 0.05 * Math.sin(ph * 1.3 + side * 2)) * (1 + 0.7 * load),
        ew2 = (0.1 + 0.05 * Math.sin(ph2 * 1.3 + side * 2)) * (1 + 0.7 * load);
      const st = lv > 0 ? mix(LT, ((ink ? 0.22 : 0.5) * lv) / 2) : mix(DK, ((ink ? 0.5 : 0.32) * -lv) / 2);
      side ? put('r1' + lv, st, 0.85, q, 1 - ew, 1, 1 - ew2, 1) : put('r0' + lv, st, 0.85, q, 0, ew, 0, ew2);
    }
    // 2: brush-mixed stripes that drift across the stroke and swell and thin
    stripes.forEach(([f, w, tc, k], j) => {
      const u = ph * (0.7 + 0.15 * j) + j * 2.1,
        u2 = ph2 * (0.7 + 0.15 * j) + j * 2.1,
        o = 0.07 * Math.sin(u * 0.6),
        o2 = 0.07 * Math.sin(u2 * 0.6),
        ww = w * (0.5 + 0.5 * Math.sin(u * 1.4)),
        ww2 = w * (0.5 + 0.5 * Math.sin(u2 * 1.4));
      if (ww < 0.02) return;
      const kk = k * (1 + 0.4 * load);
      put('s' + j, mix(tc, kk), 0.7, q, f + o, f + o + ww, f + o2, f + o2 + ww2);
    });
    // 4: running dry: fine paper-coloured gaps that open up along the tail
    if (t > 0.55 && !ink) {
      const dry = smooth((t - 0.55) / 0.45);
      for (let g = 0; g < 4; g++) {
        const u = ph * 2.3 + g * 1.9;
        if (Math.sin(u) + 0.6 * Math.sin(u * 2.7) < 1.3 - 1.6 * dry) continue;
        const f = 0.22 + g * 0.17 + 0.04 * Math.sin(ph * 0.9 + g),
          w = 0.025 + 0.03 * dry;
        put(
          'd' + Math.min(2, Math.floor(dry * 3)),
          'rgb(' + PAPER.join(',') + ')',
          0.25 + 0.25 * Math.min(2, Math.floor(dry * 3)),
          q,
          f,
          f + w,
          f,
          f + w
        );
      }
    }
  }
  for (const e of bins.values()) {
    cx3.fillStyle = e.style;
    cx3.globalAlpha = e.a;
    cx3.fill(e.p);
  }
  cx3.globalAlpha = 1;
}

// a four-sided quad is lengthened by this much (px) at each end, so that neighbours overlap a hair and no seam shows between them
const EXT = 0.5;
/** Adds a quad to the path being built on c2. */
function addQuad(c2, q) {
  if (q.length === 4) {
    const mx0 = (q[0][0] + q[3][0]) / 2,
      my0 = (q[0][1] + q[3][1]) / 2,
      mx1 = (q[1][0] + q[2][0]) / 2,
      my1 = (q[1][1] + q[2][1]) / 2,
      l = Math.hypot(mx1 - mx0, my1 - my0) || 1,
      ex = ((mx1 - mx0) / l) * EXT,
      ey = ((my1 - my0) / l) * EXT;
    c2.moveTo(q[0][0] - ex, q[0][1] - ey);
    c2.lineTo(q[1][0] + ex, q[1][1] + ey);
    c2.lineTo(q[2][0] + ex, q[2][1] + ey);
    c2.lineTo(q[3][0] - ex, q[3][1] - ey);
  } else {
    c2.moveTo(q[0][0], q[0][1]);
    for (let k3 = 1; k3 < q.length; k3++) c2.lineTo(q[k3][0], q[k3][1]);
  }
  c2.closePath();
}

/** A number that changes whenever any piece of the frame's paint does (even a slow-moving tip by an eighth of a pixel). */
function signature(quads) {
  let sig = quads.length;
  for (let i = 0; i < quads.length; i++) {
    const Q = quads[i];
    sig =
      (sig * 31 +
        Math.round(Q.a * 997) +
        Math.round(Q.q[0][0] * 8) * 3 +
        Math.round(Q.q[0][1] * 8) * 7 +
        Math.round(Q.q[2][0] * 8) * 11) %
      2147483647;
  }
  return sig;
}

/**
 * Sorts a frame's quads into the groups they are painted in, bottom to top: one group per line (the ink first, the others by their
 * depth), each { col, ink, top, qs: its quads, grad }.
 */
function groupQuads(s, quads, topPid) {
  const groups = new Map();
  // spring's red brushes the cherry petals: they take blossom pink, every other one paler, and the twig out to the Sound dot stays red.
  // Each colour is its own paint group, all over the other lines
  const bloomR = s.blooms && s.blooms.length && topPid != null ? s.geo.R : 0;
  for (const Q of quads) {
    let k = Q.pid ?? 'u',
      col = Q.col,
      top = 0,
      grad = null;
    // the faint wash that softening leaves along the brush's unseen moves between petals would show as stalks once boosted: skip it
    if (bloomR && k === topPid && Q.a < 0.2) continue;
    if (k === topPid) {
      top = 10;
      if (bloomR) {
        const m = Q.q[2] || Q.q[0],
          qx = (Q.q[0][0] + m[0]) / 2,
          qy = (Q.q[0][1] + m[1]) / 2;
        let d = 1e9;
        for (const b of s.blooms) d = Math.min(d, Math.hypot(b[0] - qx, b[1] - qy));
        d /= bloomR;
        // just past a petal's rim is only the brush's unseen move leaving it: drop that wash (the twig, beyond the last petal, stays)
        const twigX = s.blooms[s.blooms.length - 1][0] + bloomR * 0.05;
        if (d > 0.074 && d < 0.2 && qx < twigX) continue;
        // the twig flows out of the last petal: one paint group whose fill is a gradient, the petal's pink deepening to Sound's red
        if (d >= 0.074 && qx >= twigX) {
          k = topPid + ':t';
          col = 'rgb(239,104,121)';
          grad = [twigX, twigX + bloomR * 0.32];
          top = 10.05;
        } else if (d < 0.135) {
          let bi = 0,
            bd = 1e18;
          s.blooms.forEach((b, n) => {
            const e = (b[0] - qx) ** 2 + (b[1] - qy) ** 2;
            if (e < bd) {
              bd = e;
              bi = n;
            }
          });
          const pale = bi % 2;
          k = topPid + (pale ? ':a' : ':b');
          col = pale ? 'rgb(246,174,198)' : 'rgb(236,128,164)';
          top = 10.1;
        }
      }
    }
    let g = groups.get(k);
    if (!g) {
      g = { col, grad, ink: !!Q.ink, top, zs: 0, n: 0, qs: [] };
      groups.set(k, g);
    }
    g.qs.push(Q);
    g.zs += Q.z;
    g.n++;
  }
  return [...groups.values()].sort((a, b) => (a.ink ? -10 : a.top || a.zs / a.n) - (b.ink ? -10 : b.top || b.zs / b.n));
}

/**
 * Paints one group onto the strokes' layer (sctx), through three working layers the size of the page: lcv, its opacity mask (kept
 * inverted: white where there is no paint); lcv3, its colour with the brush's texture; lcv2, the two multiplied together. Only the
 * part of each that the group covers is touched.
 */
function paintGroup(g, sctx, { cvs, TF, lcv, lcv2, lcv3, lc, lc2, lc3 }) {
  const am = g.top ? 2.5 : g.ink ? 1 : 0.86,
    bk = new Map();
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  // opacity in 85 levels (steps of 3/255): finer is invisible, and every distinct level costs a fill
  for (const Q of g.qs) {
    const v = Math.round(clamp(Q.a * am, 0, 1) * 85) * 3;
    if (v < 2) continue;
    let L2 = bk.get(v);
    if (!L2) bk.set(v, (L2 = []));
    L2.push(Q.q);
    for (const p of Q.q) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
  }
  if (!bk.size) return;
  const bx0 = Math.max(0, Math.floor(TF.a * x0 + TF.e) - 3),
    by0 = Math.max(0, Math.floor(TF.d * y0 + TF.f) - 3),
    bx1 = Math.min(cvs.width, Math.ceil(TF.a * x1 + TF.e) + 3),
    by1 = Math.min(cvs.height, Math.ceil(TF.d * y1 + TF.f) + 3),
    bw = bx1 - bx0,
    bh = by1 - by0;
  if (bw <= 0 || bh <= 0) return;
  // inverted mask: white, darken with (1 - alpha)
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalAlpha = 1;
  lc.globalCompositeOperation = 'source-over';
  lc.fillStyle = '#fff';
  lc.fillRect(bx0, by0, bw, bh);
  lc.setTransform(TF);
  lc.globalCompositeOperation = 'darken';
  for (const [v, L2] of bk) {
    const u = 255 - v;
    lc.fillStyle = `rgb(${u},${u},${u})`;
    lc.beginPath();
    for (const q of L2) addQuad(lc, q);
    lc.fill('nonzero');
  }
  lc.setTransform(1, 0, 0, 1, 0, 0);
  // colour * alpha
  lc2.setTransform(1, 0, 0, 1, 0, 0);
  lc2.globalAlpha = 1;
  lc2.globalCompositeOperation = 'source-over';
  lc2.drawImage(lcv, bx0, by0, bw, bh, bx0, by0, bw, bh);
  lc2.globalCompositeOperation = 'difference';
  lc2.fillStyle = '#fff';
  lc2.fillRect(bx0, by0, bw, bh);
  lc3.setTransform(1, 0, 0, 1, 0, 0);
  lc3.globalAlpha = 1;
  lc3.globalCompositeOperation = 'source-over';
  if (g.grad) {
    const G = lc3.createLinearGradient(TF.a * g.grad[0] + TF.e, 0, TF.a * g.grad[1] + TF.e, 0);
    G.addColorStop(0, 'rgb(246,174,198)');
    G.addColorStop(1, 'rgb(232,34,44)');
    lc3.fillStyle = G;
  } else lc3.fillStyle = g.col;
  lc3.fillRect(bx0, by0, bw, bh);
  lc3.setTransform(TF);
  streaks(lc3, g.qs, g.col, g.ink);
  lc3.setTransform(1, 0, 0, 1, 0, 0);
  lc2.globalCompositeOperation = 'multiply';
  lc2.drawImage(lcv3, bx0, by0, bw, bh, bx0, by0, bw, bh);
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'multiply';
  sctx.drawImage(lcv, bx0, by0, bw, bh, bx0, by0, bw, bh);
  sctx.globalCompositeOperation = 'lighter';
  sctx.drawImage(lcv2, bx0, by0, bw, bh, bx0, by0, bw, bh);
}

/**
 * Paints the quads onto ctx. topPid: the line painted last, over the rest (spring's red, which brushes the blossoms). The finished
 * strokes are kept on a layer of their own (s.strokeLayer), and reused as they are when nothing has moved since the last frame.
 */
export function paintQuads(s, ctx, quads, topPid) {
  // (if a slow-moving tip were missed, the last frame would be reused and the tip would hop when it was noticed: see signature)
  const sig = signature(quads),
    cvs = ctx.canvas;
  if (!s.strokeLayer) s.strokeLayer = document.createElement('canvas');
  const scv = s.strokeLayer,
    sizeOk = scv.width === cvs.width && scv.height === cvs.height;
  if (!sizeOk) {
    scv.width = cvs.width;
    scv.height = cvs.height;
  }
  const reuse = sizeOk && s.strokeSig === sig;
  s.strokeSig = sig;
  if (!reuse) {
    const sctx = scv.getContext('2d');
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.globalAlpha = 1;
    sctx.fillStyle = '#f5f3ee';
    sctx.fillRect(0, 0, scv.width, scv.height);
    const layer = k => {
      if (!s.layers[k]) s.layers[k] = document.createElement('canvas');
      const c = s.layers[k];
      if (c.width !== cvs.width || c.height !== cvs.height) {
        c.width = cvs.width;
        c.height = cvs.height;
      }
      return c;
    };
    const lcv = layer('mask'),
      lcv2 = layer('colour'),
      lcv3 = layer('texture'),
      tools = {
        cvs,
        TF: ctx.getTransform(),
        lcv,
        lcv2,
        lcv3,
        lc: lcv.getContext('2d'),
        lc2: lcv2.getContext('2d'),
        lc3: lcv3.getContext('2d'),
      };
    for (const g of groupQuads(s, quads, topPid)) paintGroup(g, sctx, tools);
    sctx.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(scv, 0, 0);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
