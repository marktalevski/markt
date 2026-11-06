// Arriving from another page, the controller folds out of the beat pads: once the dots have dropped in and become the pads, the rest
// of it is cut into small tiles that fold out from the pads in a wave, each flipping open on the edge that faces the pads (sideways
// to the left and right, up or down above and below), shaded while it's still turned away, until the controller is whole.
import { deckGeo } from '../lib/deck-layout.js';
import { clamp, smooth } from '../lib/math.js';
import { drawDeck } from './deck/index.js';
import { padReady } from './deck/right.js';

/**
 * Draws the deck while it folds out (and simply draws it once it has). The deck is drawn whole to a layer of its own and laid in
 * tile by tile; the dots have a layer over it.
 */
export function drawDeckFoldingOut(s, ctx, W, H, t, dt) {
  // the fold-out starts once the last pad (and the spare after it) has formed
  const T0 = padReady(6) + 0.14,
    STEP = 0.045,
    DUR = 0.24,
    CS = 40;
  const dpr = ctx.getTransform().a,
    G = deckGeo(W, H),
    y0 = G.y0,
    hh = H - G.y0;
  const P = G.pads.concat(G.cpads, [G.spare]),
    bx0 = Math.min(...P.map(p => p[0])) - 6,
    by0 = Math.min(...P.map(p => p[1])) - 6,
    bx1 = Math.max(...P.map(p => p[0] + p[2])) + 6,
    by1 = Math.max(...P.map(p => p[1] + p[3])) + 6;
  // the tiles: a grid over the deck, each with its distance (in tiles) from the pad block, which sets when it folds out, and the side facing
  // the block, which it hinges on. A tile that overlaps the block keeps only the strips of it outside the block, each hinged on the block
  const key = W + 'x' + H;
  if (!s.tiles || s.tiles.key !== key) {
    const list = [],
      nx = Math.ceil((G.x1 - G.x0) / CS),
      ny = Math.ceil(hh / CS);
    const add = (x, y, w, h) => {
      if (w <= 0.5 || h <= 0.5) return;
      const cx = x + w / 2,
        cy = y + h / 2,
        dx = cx < bx0 ? (bx0 - cx) / CS : cx > bx1 ? (cx - bx1) / CS : 0,
        dy = cy < by0 ? (by0 - cy) / CS : cy > by1 ? (cy - by1) / CS : 0;
      list.push({
        x,
        y,
        w,
        h,
        d: Math.max(0, Math.hypot(dx, dy) - 0.5),
        side: dx >= dy ? (cx < bx0 ? 'r' : 'l') : cy < by0 ? 'b' : 't',
      });
    };
    for (let r = 0; r < ny; r++)
      for (let c = 0; c < nx; c++) {
        const x = G.x0 + c * CS,
          y = y0 + r * CS,
          w = Math.min(CS, G.x1 - x),
          h = Math.min(CS, H - y);
        if (x + w <= bx0 || x >= bx1 || y + h <= by0 || y >= by1) {
          add(x, y, w, h);
          continue;
        }
        const iy0 = Math.max(y, by0),
          iy1 = Math.min(y + h, by1);
        add(x, y, w, by0 - y);
        add(x, by1, w, y + h - by1);
        add(x, iy0, bx0 - x, iy1 - iy0);
        add(bx1, iy0, x + w - bx1, iy1 - iy0);
      }
    s.tiles = { key, list, end: list.length ? Math.max(...list.map(q => q.d)) * STEP + DUR : 0 };
  }
  if (t > T0 + s.tiles.end + 0.05) {
    drawDeck(s, ctx, W, H, t, dt);
    return;
  }
  const pw = Math.round(W * dpr),
    ph = Math.round(H * dpr),
    mk = () => document.createElement('canvas');
  const dk = s.foldDeck || (s.foldDeck = mk()),
    dt2 = s.foldDots || (s.foldDots = mk());
  [dk, dt2].forEach(c => {
    if (c.width !== pw || c.height !== ph) {
      c.width = pw;
      c.height = ph;
    }
  });
  const oc = dk.getContext('2d'),
    od = dt2.getContext('2d');
  [oc, od].forEach(c => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, pw, ph);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineCap = 'round';
    c.lineJoin = 'round';
  });
  drawDeck(s, oc, W, H, t, dt, od);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  // the pads: each one's face appears under its dot the moment the dot has opened out into it (so the swap doesn't show), the spare just
  // after the last; then, as the fold-out starts, the plate they sit on locks in with them, wells and all
  const padAt = (q, a = 1) => {
    const [x, y, w, h] = P[q];
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 7);
    else ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalAlpha = a;
    ctx.drawImage(dk, x * dpr, y * dpr, w * dpr, h * dpr, x, y, w, h);
    ctx.restore();
  };
  if (t >= T0)
    ctx.drawImage(dk, bx0 * dpr, by0 * dpr, (bx1 - bx0) * dpr, (by1 - by0) * dpr, bx0, by0, bx1 - bx0, by1 - by0);
  else {
    for (let q = 0; q < 7; q++) if (t >= padReady(q)) padAt(q);
    if (t >= padReady(6)) padAt(7, smooth(clamp((t - padReady(6)) / (T0 - padReady(6)), 0, 1)));
  }
  for (const q of s.tiles.list) {
    const u = clamp((t - T0 - q.d * STEP) / DUR, 0, 1);
    if (u <= 0) continue;
    const k = 1 - Math.pow(1 - u, 3),
      kw = q.side === 'l' || q.side === 'r' ? k : 1,
      kh = q.side === 't' || q.side === 'b' ? k : 1;
    // folding open on its hinge: the edge facing the pads stays put, the far edge swings out (never past its own cell)
    const w = q.w * kw,
      h = q.h * kh,
      x = q.side === 'r' ? q.x + q.w - w : q.x,
      y = q.side === 'b' ? q.y + q.h - h : q.y;
    if (w < 0.5 || h < 0.5) continue;
    ctx.globalAlpha = 1;
    ctx.drawImage(dk, q.x * dpr, q.y * dpr, q.w * dpr, q.h * dpr, x, y, w, h);
    if (u < 1) {
      ctx.globalAlpha = 0.55 * (1 - u);
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 0.35 * (1 - u);
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.drawImage(dt2, 0, 0, pw, ph, 0, 0, W, H);
  // the album clock (on the page, not the canvas) comes in as the tiles round it fold out
  {
    const dC = Math.max(0, (bx0 - (G.clock[0] + G.clock[2] / 2)) / CS),
      o = smooth(clamp((t - T0 - dC * STEP - DUR * 0.5) / 0.25, 0, 1)).toFixed(3);
    if (s.clock.style.opacity !== o) s.clock.style.opacity = o;
  }
}
