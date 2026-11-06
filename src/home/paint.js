// Paint, not outline: how the quads of a frame (see strokes.js) are laid on the paper.
//
// Each line is filled as one shape, so it never overlaps itself or shows seams; lines then blend translucently with each other. For
// each line: an opacity mask is built with max-blending (overlaps keep the strongest value, and slight overlaps hide the joins), then
// page = page * (1 - mask) + colour * mask, which is exact translucency with no levels and no seams. The colour is not flat: see
// streaks.
//
// A canvas has no blend that does that sum in one go, but on a negative of the page two of its blends do it between them: 'screen'
// with the mask leaves the negative of page * (1 - mask), and 'difference' then takes colour * mask off that. So the lines go onto a
// negative, which is turned back into the page once they are all on.
import { clamp, smooth } from '../lib/math.js';

/** The paper (#f5f3ee), as a negative. */
const PAPER_NEGATIVE = '#0a0c11';

const colRGB = {};
/** A colour's red, green and blue, from its 'rgb(r,g,b)'. */
function rgbOf(col) {
  let base = colRGB[col];
  if (!base) {
    const m = col.match(/\d+/g);
    base = colRGB[col] = m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  }
  return base;
}

// the one light, from the upper left
const LIGHT_X = -0.6,
  LIGHT_Y = -0.8;
// the brush-mixed stripes: where each runs across the stroke (0..1), how wide, lighter or darker, and how strongly
const STRIPES = [
  { at: 0.18, width: 0.2, light: true, strength: 0.32, inkStrength: 0.2 },
  { at: 0.5, width: 0.14, light: false, strength: 0.24, inkStrength: 0.35 },
  { at: 0.68, width: 0.16, light: true, strength: 0.22, inkStrength: 0.14 },
];
const PAPER_GAP = 'rgb(245,243,238)';
// the texture's fills. Each kind is one fill, and they go down in the order they first turn up along the stroke: a ridge on either
// edge at each of four strengths (0-7), the three stripes (8-10), and the dry gaps at three strengths (11-13)
const RIDGE = 0,
  STRIPE = 8,
  GAP = 11,
  KINDS = 14;

/** Adds to a path the strip of quad q between two fractions of the way across it: f0a to f1a at its start, f0b to f1b at its end. */
function strip(path, q, f0a, f1a, f0b, f1b) {
  const a = q[0],
    b = q[1],
    c = q[2],
    d = q[3];
  path.moveTo(a[0] + (d[0] - a[0]) * f0a, a[1] + (d[1] - a[1]) * f0a);
  path.lineTo(b[0] + (c[0] - b[0]) * f0b, b[1] + (c[1] - b[1]) * f0b);
  path.lineTo(b[0] + (c[0] - b[0]) * f1b, b[1] + (c[1] - b[1]) * f1b);
  path.lineTo(a[0] + (d[0] - a[0]) * f1a, a[1] + (d[1] - a[1]) * f1a);
  path.closePath();
}

/**
 * The texture of a real brush stroke, painted over a line's flat colour (ctx: where; qs: the line's quads; col: its colour; ink: the
 * black line). Four things real strokes do:
 * 1. ridges catch the light: one light from the upper left, so the edge facing it gets a pale highlight and the opposite edge a soft
 *    shadow, swapping as the stroke turns
 * 2. colour mixed on the brush stays in stripes: two or three bands of the same hue, a little lighter or deeper, running the length
 *    of the stroke
 * 3. the brush is fullest where it lands: the first stretch is richer and the ridges heavier
 * 4. it runs out: towards the tail bristles lose contact and paper shows through in fine gaps (dry brush)
 */
function streaks(ctx, qs, col, ink) {
  const base = rgbOf(col),
    LT = ink ? [110, 108, 104] : [255, 253, 244],
    DK = ink ? [0, 0, 0] : [14, 8, 30],
    mix = (to, k) =>
      `rgb(${Math.round(base[0] + (to[0] - base[0]) * k)},${Math.round(base[1] + (to[1] - base[1]) * k)},${Math.round(base[2] + (to[2] - base[2]) * k)})`;
  let seed = 0;
  for (let i = 0; i < col.length; i++) seed = (seed * 31 + col.charCodeAt(i)) % 997;
  // each kind of fill takes the colour it is first given (so a stripe keeps the richness the brush had where it began)
  const fills = new Array(KINDS),
    order = [];
  const open = (kind, style, alpha) => {
    order.push((fills[kind] = { style, alpha, path: new Path2D() }));
    return fills[kind];
  };
  const n = qs.length;
  for (let i = 0; i < n; i++) {
    const q = qs[i].q;
    if (q.length !== 4) continue;
    const t = n > 1 ? i / (n - 1) : 0,
      ph = i * 0.045 + seed,
      ph2 = ph + 0.045,
      load = 1 - smooth(clamp(t / 0.18, 0, 1));
    const ex = q[0][0] - q[3][0],
      ey = q[0][1] - q[3][1],
      el = Math.hypot(ex, ey) || 1,
      d = (ex * LIGHT_X + ey * LIGHT_Y) / el;
    // 1 + 3: ridges, lit or shaded by which way the edge faces; heavier while the brush is loaded
    for (let side = 0; side < 2; side++) {
      const lv = Math.round((side ? -d : d) * 2);
      if (!lv) continue;
      const ew = (0.1 + 0.05 * Math.sin(ph * 1.3 + side * 2)) * (1 + 0.7 * load),
        ew2 = (0.1 + 0.05 * Math.sin(ph2 * 1.3 + side * 2)) * (1 + 0.7 * load),
        kind = RIDGE + side * 4 + (lv > 0 ? lv + 1 : lv + 2);
      const fill =
        fills[kind] ||
        open(kind, lv > 0 ? mix(LT, ((ink ? 0.22 : 0.5) * lv) / 2) : mix(DK, ((ink ? 0.5 : 0.32) * -lv) / 2), 0.85);
      if (side) strip(fill.path, q, 1 - ew, 1, 1 - ew2, 1);
      else strip(fill.path, q, 0, ew, 0, ew2);
    }
    // 2: brush-mixed stripes that drift across the stroke and swell and thin
    for (let j = 0; j < STRIPES.length; j++) {
      const S = STRIPES[j],
        u = ph * (0.7 + 0.15 * j) + j * 2.1,
        u2 = ph2 * (0.7 + 0.15 * j) + j * 2.1,
        o = 0.07 * Math.sin(u * 0.6),
        o2 = 0.07 * Math.sin(u2 * 0.6),
        ww = S.width * (0.5 + 0.5 * Math.sin(u * 1.4)),
        ww2 = S.width * (0.5 + 0.5 * Math.sin(u2 * 1.4));
      if (ww < 0.02) continue;
      const fill =
        fills[STRIPE + j] ||
        open(STRIPE + j, mix(S.light ? LT : DK, (ink ? S.inkStrength : S.strength) * (1 + 0.4 * load)), 0.7);
      strip(fill.path, q, S.at + o, S.at + o + ww, S.at + o2, S.at + o2 + ww2);
    }
    // 4: running dry: fine paper-coloured gaps that open up along the tail
    if (t > 0.55 && !ink) {
      const dry = smooth((t - 0.55) / 0.45),
        level = Math.min(2, Math.floor(dry * 3));
      for (let g = 0; g < 4; g++) {
        const u = ph * 2.3 + g * 1.9;
        if (Math.sin(u) + 0.6 * Math.sin(u * 2.7) < 1.3 - 1.6 * dry) continue;
        const f = 0.22 + g * 0.17 + 0.04 * Math.sin(ph * 0.9 + g),
          w = 0.025 + 0.03 * dry,
          fill = fills[GAP + level] || open(GAP + level, PAPER_GAP, 0.25 + 0.25 * level);
        strip(fill.path, q, f, f + w, f, f + w);
      }
    }
  }
  for (const fill of order) {
    ctx.fillStyle = fill.style;
    ctx.globalAlpha = fill.alpha;
    ctx.fill(fill.path);
  }
  ctx.globalAlpha = 1;
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
  // Each colour is its own paint group, all over the other lines. (That goes for the red line's stretch on the symbol. On its way
  // there, flying in or coming over from the last symbol, it crosses where the petals will be, and is simply a red line)
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
      if (bloomR && Q.onSymbol) {
        const m = Q.q[2] || Q.q[0],
          qx = (Q.q[0][0] + m[0]) / 2,
          qy = (Q.q[0][1] + m[1]) / 2;
        let d = 1e9;
        for (const b of s.blooms) d = Math.min(d, Math.hypot(b[0] - qx, b[1] - qy));
        d /= bloomR;
        // past a petal's rim there are only the brush's unseen moves from one petal to the next: none of that is painted (the twig,
        // beyond the last petal, is)
        const twigX = s.blooms[s.blooms.length - 1][0] + bloomR * 0.05;
        if (d > 0.074 && qx < twigX) continue;
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
 * Paints one group onto the strokes' layer (sctx), which is a negative of the page while the lines go on. Two working layers the
 * size of the page are used: lcv, the group's opacity mask (white where its paint is at full strength), and lcv2, its colour with
 * the brush's texture, multiplied by the mask. Only the box round the group's quads is touched in each.
 */
function paintGroup(g, sctx, { cvs, TF, lcv, lcv2, lc, lc2 }) {
  const am = g.top ? 2.5 : g.ink ? 1 : 0.86,
    levels = new Map();
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  // opacity in 85 levels (steps of 3/255): finer is invisible, and every distinct level costs a fill
  for (const Q of g.qs) {
    const v = Math.round(clamp(Q.a * am, 0, 1) * 85) * 3;
    if (v < 2) continue;
    let quads = levels.get(v);
    if (!quads) levels.set(v, (quads = []));
    quads.push(Q.q);
    for (const p of Q.q) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[1] > y1) y1 = p[1];
    }
  }
  if (!levels.size) return;
  const bx0 = Math.max(0, Math.floor(TF.a * x0 + TF.e) - 3),
    by0 = Math.max(0, Math.floor(TF.d * y0 + TF.f) - 3),
    bx1 = Math.min(cvs.width, Math.ceil(TF.a * x1 + TF.e) + 3),
    by1 = Math.min(cvs.height, Math.ceil(TF.d * y1 + TF.f) + 3),
    bw = bx1 - bx0,
    bh = by1 - by0;
  if (bw <= 0 || bh <= 0) return;

  // the mask: black, lightened to each quad's strength (where quads overlap, the strongest wins)
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalAlpha = 1;
  lc.globalCompositeOperation = 'source-over';
  lc.fillStyle = '#000';
  lc.fillRect(bx0, by0, bw, bh);
  lc.setTransform(TF);
  lc.globalCompositeOperation = 'lighten';
  for (const [v, quads] of levels) {
    lc.fillStyle = `rgb(${v},${v},${v})`;
    lc.beginPath();
    for (const q of quads) addQuad(lc, q);
    lc.fill('nonzero');
  }
  lc.setTransform(1, 0, 0, 1, 0, 0);

  // the colour, with the brush's texture, times the mask
  lc2.setTransform(1, 0, 0, 1, 0, 0);
  lc2.globalAlpha = 1;
  lc2.globalCompositeOperation = 'source-over';
  if (g.grad) {
    const G = lc2.createLinearGradient(TF.a * g.grad[0] + TF.e, 0, TF.a * g.grad[1] + TF.e, 0);
    G.addColorStop(0, 'rgb(246,174,198)');
    G.addColorStop(1, 'rgb(232,34,44)');
    lc2.fillStyle = G;
  } else lc2.fillStyle = g.col;
  lc2.fillRect(bx0, by0, bw, bh);
  lc2.setTransform(TF);
  streaks(lc2, g.qs, g.col, g.ink);
  lc2.setTransform(1, 0, 0, 1, 0, 0);
  lc2.globalCompositeOperation = 'multiply';
  lc2.drawImage(lcv, bx0, by0, bw, bh, bx0, by0, bw, bh);

  // onto the negative: page x (1 - mask), then colour x mask
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'screen';
  sctx.drawImage(lcv, bx0, by0, bw, bh, bx0, by0, bw, bh);
  sctx.globalCompositeOperation = 'difference';
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
    // the paper, as a negative (see the top of this file)
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.globalAlpha = 1;
    sctx.fillStyle = PAPER_NEGATIVE;
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
      tools = { cvs, TF: ctx.getTransform(), lcv, lcv2, lc: lcv.getContext('2d'), lc2: lcv2.getContext('2d') };
    for (const g of groupQuads(s, quads, topPid)) paintGroup(g, sctx, tools);
    // and the negative turned back into the page
    sctx.globalCompositeOperation = 'difference';
    sctx.fillStyle = '#fff';
    sctx.fillRect(0, 0, scv.width, scv.height);
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
