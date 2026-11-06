// Painted strokes on the canvas: the brush every line on this page is drawn with, and the thread a colour travels along between the
// water and a menu dot.
import { clamp, cubicAt, easeInOutCubic, smooth } from '../lib/math.js';
import { mix, rgb } from './palette.js';

/**
 * A stroke in flight (it matches Home's travelling lines): a fading tail, a swelling body, a tapered head and a dot at the head.
 * pts: the points along it, w: its width, a: its opacity, col: its colour (or a gradient), swell: how much the body swells.
 */
export function brushFly(ctx, pts, w, a, col, swell = 1.4, dot = true) {
  const n = pts.length;
  if (n < 2) return;
  const d = [0];
  for (let i = 1; i < n; i++) d[i] = d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const T = d[n - 1] || 1,
    N = [],
    W2 = [],
    A2 = [];
  for (let i = 0; i < n; i++) {
    const q = pts[Math.min(n - 1, i + 1)],
      pr = pts[Math.max(0, i - 1)],
      tx = q[0] - pr[0],
      ty = q[1] - pr[1],
      tl = Math.hypot(tx, ty) || 1,
      u = d[i] / T;
    N.push([-ty / tl, tx / tl]);
    W2.push(
      w *
        (1 + swell * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 1.3)) *
        (0.86 + 0.14 * Math.sin(d[i] * 0.045)) *
        Math.sqrt(clamp((T - d[i]) / (w * 6), 0.08, 1)) *
        Math.sqrt(clamp(d[i] / (w * 5), 0.1, 1))
    );
    A2.push(a * (0.12 + 0.88 * Math.pow(u, 0.7)));
  }
  ctx.fillStyle = col;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i],
      p1 = pts[i + 1],
      h0 = W2[i] / 2,
      h1 = W2[i + 1] / 2;
    ctx.globalAlpha = (A2[i] + A2[i + 1]) / 2;
    ctx.beginPath();
    ctx.moveTo(p0[0] - N[i][0] * h0, p0[1] - N[i][1] * h0);
    ctx.lineTo(p1[0] - N[i + 1][0] * h1, p1[1] - N[i + 1][1] * h1);
    ctx.lineTo(p1[0] + N[i + 1][0] * h1, p1[1] + N[i + 1][1] * h1);
    ctx.lineTo(p0[0] + N[i][0] * h0, p0[1] + N[i][1] * h0);
    ctx.closePath();
    ctx.fill();
  }
  if (dot) {
    const p = pts[n - 1];
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(p[0], p[1], Math.max(3.5, w * 1.1), 0, 6.2832);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * A stroke that lies still: its width breathes along its length like a loaded brush. d0 shifts that breathing (so strokes drawn
 * in pieces line up), tA and tB taper its start and its end.
 */
export function brush(ctx, pts, w, a, d0, tA, tB, col) {
  const n = pts.length;
  if (n < 2) return;
  const d = [0];
  for (let i = 1; i < n; i++) d[i] = d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const T = d[n - 1] || 1,
    Lp = [],
    Rp = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i],
      q = pts[Math.min(n - 1, i + 1)],
      pr = pts[Math.max(0, i - 1)];
    let tx = q[0] - pr[0],
      ty = q[1] - pr[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const dd = d[i] + (d0 || 0);
    let ww = w * (0.84 + 0.16 * Math.sin(dd * 0.045) + 0.1 * Math.sin(dd * 0.011 + 2));
    if (tA) ww *= Math.sqrt(clamp(d[i] / (w * 7), 0.05, 1));
    if (tB) ww *= Math.sqrt(clamp((T - d[i]) / (w * 9), 0.05, 1));
    Lp.push([p[0] - (ty * ww) / 2, p[1] + (tx * ww) / 2]);
    Rp.push([p[0] + (ty * ww) / 2, p[1] - (tx * ww) / 2]);
  }
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(Lp[0][0], Lp[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(Lp[i][0], Lp[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * A line reeled into a dot like a thread: it stays where it lies while its leading end lifts off and glides to the dot, and the rest
 * follows along the same path, always forwards, until the tail goes in. (Played backwards, with g running 1 to 0, it pours a colour
 * out of a dot instead.)
 * src: the line as it lies (ending where it lifts off), D: the dot, g: 0..1 through the move.
 * O: w (width), a (opacity), colA / colB (its colour leaving / arriving), lift (how far the end carries on before turning up), sway
 * (px of side-to-side drift on the way), ph (the phase of that drift), ring (the radius of a circle in the middle of the screen it
 * swirls round on the way, with the other colours on theirs; without it, it rises in a plain arc).
 */
export function absorb(ctx, src, D, g, O) {
  if (g <= 0 || g >= 1 || src.length < 2) return;
  const S = src[src.length - 1],
    P0 = src[Math.max(0, src.length - 4)],
    tl = Math.hypot(S[0] - P0[0], S[1] - P0[1]) || 1,
    T = [(S[0] - P0[0]) / tl, (S[1] - P0[1]) / tl],
    lift = O.lift ?? 90;
  const route = [],
    ringAt = [],
    bez = (A, B, C, E, n, sway) => {
      for (let q = 1; q <= n; q++) {
        const u = q / n,
          p = cubicAt(A, B, C, E, u),
          sw = (sway || 0) * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * u + (O.ph || 0));
        route.push([p[0] + sw, p[1]]);
      }
    };
  if (O.ring) {
    // into the middle of the screen, round it clockwise on its own ring (drawing in a little as it goes, like water down a drain) with
    // the other colours on theirs, and out of the ring at the point where it is already heading for its dot
    const M = [innerWidth / 2, innerHeight * 0.48],
      r0 = O.ring,
      rAt = u => r0 * (1 - 0.28 * u),
      TAU = Math.PI * 2;
    const a0 = Math.atan2(S[1] - M[1], S[0] - M[0]) + 0.5,
      aOut = Math.atan2(D[1] - M[1], D[0] - M[0]) - Math.PI / 2,
      sweep = TAU * 1.2 + ((((aOut - a0 - TAU * 1.2) % TAU) + TAU) % TAU);
    const on = u => {
        const a = a0 + sweep * u,
          r = rAt(u);
        return [M[0] + Math.cos(a) * r, M[1] + Math.sin(a) * r];
      },
      tan = u => {
        const a = a0 + sweep * u;
        return [-Math.sin(a), Math.cos(a)];
      };
    const E = on(0),
      tE = tan(0),
      d1 = Math.hypot(E[0] - S[0], E[1] - S[1]);
    bez(
      S,
      [S[0] + T[0] * lift, S[1] + T[1] * lift - lift * 0.5],
      [E[0] - tE[0] * d1 * 0.45, E[1] - tE[1] * d1 * 0.45],
      E,
      40,
      O.sway
    );
    ringAt.push(route.length);
    const N = Math.ceil((sweep / TAU) * 64);
    for (let q = 1; q <= N; q++) route.push(on(q / N));
    ringAt.push(route.length);
    const X = on(1),
      tX = tan(1),
      d2 = Math.hypot(D[0] - X[0], D[1] - X[1]);
    bez(X, [X[0] + tX[0] * d2 * 0.4, X[1] + tX[1] * d2 * 0.4], [D[0] - 30, D[1] + Math.min(d2 * 0.3, 110)], D, 40, 0);
  } else {
    // the plain route rises in an arc: up and a little onwards first, then curving over and in to the dot from below-left
    const dist = Math.hypot(D[0] - S[0], D[1] - S[1]);
    bez(
      S,
      [S[0] + T[0] * lift + dist * 0.12, S[1] + T[1] * lift - Math.min(dist * 0.42, 190)],
      [D[0] - dist * 0.3, D[1] + dist * 0.18],
      D,
      48,
      O.sway
    );
  }
  const all = src.concat(route),
    nS = src.length,
    sl = [0];
  for (let q = 1; q < all.length; q++)
    sl.push(sl[q - 1] + Math.hypot(all[q][0] - all[q - 1][0], all[q][1] - all[q - 1][1]));
  const tot = sl[sl.length - 1],
    srcL = sl[nS - 1],
    io = easeInOutCubic;
  // the head eases off the end of the line and into the dot; the tail sets off a little later and catches it up exactly at the dot
  const ge = io(clamp(g / 0.82, 0, 1)),
    Lin = ringAt.length ? sl[nS - 1 + ringAt[0]] : 0,
    Lout = ringAt.length ? sl[nS - 1 + ringAt[1]] : 0;
  const head = !ringAt.length
      ? srcL + (tot - srcL) * ge
      : ge < 0.3
        ? srcL + ((Lin - srcL) * ge) / 0.3
        : ge < 0.74
          ? Lin + ((Lout - Lin) * (ge - 0.3)) / 0.44
          : Lout + ((tot - Lout) * (ge - 0.74)) / 0.26,
    cut = Math.min(head, tot * io(clamp((g - 0.1) / 0.9, 0, 1)));
  const at = q => {
    if (q <= 0) return all[0];
    let k = 1;
    while (k < all.length - 1 && sl[k] < q) k++;
    const f = (q - sl[k - 1]) / Math.max(1e-6, sl[k] - sl[k - 1]);
    return [all[k - 1][0] + (all[k][0] - all[k - 1][0]) * f, all[k - 1][1] + (all[k][1] - all[k - 1][1]) * f];
  };
  const P = [at(cut)],
    L = [cut];
  for (let q = 0; q < all.length; q++)
    if (sl[q] > cut && sl[q] < head) {
      P.push(all[q]);
      L.push(sl[q]);
    }
  P.push(at(head));
  L.push(head);
  const n = P.length;
  if (n < 2 || head - cut < 0.5) return;
  for (let q = 0; q < n - 1; q++) {
    const pr = P[Math.max(0, q - 1)],
      nx = P[q + 1],
      n2 = P[Math.min(n - 1, q + 2)],
      p0 = P[q],
      t0x = nx[0] - pr[0],
      t0y = nx[1] - pr[1],
      l0 = Math.hypot(t0x, t0y) || 1,
      t1x = n2[0] - p0[0],
      t1y = n2[1] - p0[1],
      l1 = Math.hypot(t1x, t1y) || 1;
    const wAt = v => O.w * Math.sqrt(clamp((head - v) / 24, 0.1, 1)) * Math.sqrt(clamp((v - cut) / 40, 0.1, 1)),
      h0 = wAt(L[q]) / 2,
      h1 = wAt(L[q + 1]) / 2;
    const ur = clamp((L[q] - srcL) / Math.max(1, tot - srcL), 0, 1);
    ctx.fillStyle = rgb(mix(O.colA, O.colB, smooth(ur)));
    ctx.globalAlpha = O.a ?? 0.95;
    ctx.beginPath();
    ctx.moveTo(p0[0] + (t0y / l0) * h0, p0[1] - (t0x / l0) * h0);
    ctx.lineTo(nx[0] + (t1y / l1) * h1, nx[1] - (t1x / l1) * h1);
    ctx.lineTo(nx[0] - (t1y / l1) * h1, nx[1] + (t1x / l1) * h1);
    ctx.lineTo(p0[0] - (t0y / l0) * h0, p0[1] + (t0x / l0) * h0);
    ctx.closePath();
    ctx.fill();
  }
  // a small bead leads the thread in
  const hp = P[n - 1],
    ur = clamp((head - srcL) / Math.max(1, tot - srcL), 0, 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = rgb(mix(O.colA, O.colB, smooth(ur)));
  ctx.beginPath();
  ctx.arc(hp[0], hp[1], O.w * 0.55 + 1.6 * smooth(clamp((g - 0.55) / 0.3, 0, 1)), 0, 6.2832);
  ctx.fill();
  ctx.globalAlpha = 1;
}
