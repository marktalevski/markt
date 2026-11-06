// The symbols Home paints, one to a file. A symbol is drawn in its own units (its centre at 0, 0 and its size about 1 each way; y
// runs down) and says three things:
//   ink(pen)   the black line, as strokes of the brush (see the pen below); it gives where the Freediving dot sits unless dots() says
//   lines()    the coloured lines that are part of the picture, each { li: which line (1 red, 2 yellow, 3 blue, 4 orange, 5 green,
//              6 purple), path: its points } or, to ride along the black line, { li, f: from near here, t: to near here, e: then out
//              to here }. A line a symbol doesn't draw itself is laid along the black line by the layout
//   dots()     where its three page dots (and their labels, labelAt: [x, y] or [x, y, degrees, scale]) sit, when not at the default
// and a few flags (see any symbol). To add a symbol: write its file and add it to SYMBOLS.
import { cubicAt } from '../../lib/math.js';
import { cat, chaikin, loopify, resample } from '../curves.js';
import book from './book.js';
import camera from './camera.js';
import coffee from './coffee.js';
import egg from './egg.js';
import enso from './enso.js';
import gameboy from './gameboy.js';
import hangul from './hangul.js';
import headphones from './headphones.js';
import longfins from './longfins.js';
import lotus from './lotus.js';
import maple from './maple.js';
import mountain from './mountain.js';
import muaythai from './muaythai.js';
import octopus from './octopus.js';
import onsen from './onsen.js';
import plane from './plane.js';
import samurai from './samurai.js';
import spiral from './spiral.js';
import spring from './spring.js';
import triforce from './triforce.js';
import triskele from './triskele.js';
import vinyl from './vinyl.js';
import wave from './wave.js';

/** Every symbol, in the order they have always been in (the pick between them goes by it). */
export const SYMBOLS = {
  enso,
  spiral,
  triforce,
  triskele,
  wave,
  maple,
  octopus,
  hangul,
  spring,
  mountain,
  vinyl,
  camera,
  book,
  onsen,
  lotus,
  coffee,
  headphones,
  plane,
  gameboy,
  longfins,
  egg,
  samurai,
  muaythai,
};
export const SHAPES = Object.keys(SYMBOLS);

// spacing (px) a symbol's own coloured paths are resampled at before one round of smoothing; about 2.5 px between points once smoothed
const CP_STEP = 5;

/**
 * A symbol laid out on the page, centred at (cx, cy), R px to its unit. Gives { pts: the black line, station: where the Freediving
 * dot sits by default, colorPaths: its own coloured lines by line number, stOv: its own places for dots and labels (or null), blooms:
 * the centres of its blossoms (spring) }.
 */
export function symbolShape(name, cx, cy, R) {
  const sym = SYMBOLS[name];
  const blooms = [],
    colorPaths = {},
    P = [],
    push = (x, y, w = 1) => P.push([cx + x * R, cy + y * R, w]);
  const strokes = list =>
    list.forEach((st2, k) => {
      const isC = st2.length === 2 && (st2[0][2] ?? 1) < 0.2,
        pv = list[k - 1],
        nx = list[k + 1];
      if (!isC || !pv || !nx || pv.length < 2 || nx.length < 2) {
        st2.forEach(p => push(p[0], p[1], p[2] ?? 1));
        return;
      }
      const A = pv[pv.length - 1],
        A2 = pv[pv.length - 2],
        B = nx[0],
        B2 = nx[1],
        la = Math.hypot(A[0] - A2[0], A[1] - A2[1]) || 1,
        lb = Math.hypot(B2[0] - B[0], B2[1] - B[1]) || 1,
        d = Math.hypot(B[0] - A[0], B[1] - A[1]),
        hk = Math.max(0.12, Math.min(0.6, d * 0.45));
      {
        const ux = (B[0] - A[0]) / (d || 1),
          uy = (B[1] - A[1]) / (d || 1),
          c1 = ((A[0] - A2[0]) * ux + (A[1] - A2[1]) * uy) / la,
          c2 = ((B2[0] - B[0]) * ux + (B2[1] - B[1]) * uy) / lb;
        if (d > 0.45 || c1 < 0.3 || c2 < 0.3) {
          st2.forEach(p => push(p[0], p[1], p[2] ?? 1));
          return;
        }
      }
      const C1 = [A[0] + ((A[0] - A2[0]) / la) * hk, A[1] + ((A[1] - A2[1]) / la) * hk],
        C2 = [B[0] - ((B2[0] - B[0]) / lb) * hk, B[1] - ((B2[1] - B[1]) / lb) * hk],
        n = Math.max(6, Math.ceil(d / 0.04)),
        w0 = A[2] ?? 1,
        w1 = B[2] ?? 1;
      for (let q = 1; q < n; q++) {
        const u = q / n,
          a = (1 - u) ** 3,
          b = 3 * (1 - u) ** 2 * u,
          c = 3 * (1 - u) * u * u,
          e = u ** 3,
          sag = 0.55 + 0.45 * Math.abs(1 - 2 * u);
        push(
          a * A[0] + b * C1[0] + c * C2[0] + e * B[0],
          a * A[1] + b * C1[1] + c * C2[1] + e * B[1],
          (w0 + (w1 - w0) * u) * sag
        );
      }
    });
  const TAU = Math.PI * 2,
    cv = (ctrl, n = 18) => cat(ctrl, n, push);
  const lineTo = pts => {
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k],
        b = pts[k + 1],
        n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.03));
      for (let q = k ? 1 : 0; q <= n; q++) push(a[0] + ((b[0] - a[0]) * q) / n, a[1] + ((b[1] - a[1]) * q) / n);
    }
  };
  const circ = (c, r, a0, turns, n = 120, ry = r) => {
    for (let q = 0; q <= n; q++) {
      const a = a0 + (q / n) * turns * TAU;
      push(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * ry);
    }
  };
  // the pen a symbol draws its black line with: push(x, y, weight) adds a point; strokes(list) adds strokes, rounding the unseen moves
  // between them; cv(points) a smooth curve; lineTo(points) straight lines; circ(centre, r, from, turns) a circle or an arc; line(li,
  // points) sets one of its coloured lines directly (spring's petals)
  const st = sym.ink({
    cx,
    cy,
    R,
    push,
    strokes,
    cv,
    lineTo,
    circ,
    blooms,
    line: (li, pts) => (colorPaths[li] = chaikin(resample(pts, CP_STEP), 1)),
  });
  const S = u => [cx + u[0] * R, cy + u[1] * R],
    vis = i => (P[i][2] ?? 1) >= 0.2;
  const nearI = u => {
    const p = S(u);
    let b = 1e18,
      bi = 0;
    for (let i = 0; i < P.length; i++)
      if (vis(i)) {
        const d = (P[i][0] - p[0]) ** 2 + (P[i][1] - p[1]) ** 2;
        if (d < b) {
          b = d;
          bi = i;
        }
      }
    return bi;
  };
  const IN = sym.lines && sym.lines();
  if (IN)
    for (const sp of IN) {
      let pts = [];
      if (sp.path) {
        const o = [];
        cat(sp.path, 6, (x, y) => o.push(S([x, y])));
        pts = o;
      } else {
        const iF = nearI(sp.f),
          iT = nearI(sp.t),
          dir = iT >= iF ? 1 : -1,
          E = S(sp.e),
          ride = [];
        for (let i = iF; dir > 0 ? i <= iT : i >= iT; i += dir) {
          if (!vis(i)) break;
          ride.push(P[i]);
        }
        if (ride.length < 2) ride.push(P[iT]);
        const A0 = ride[ride.length - 1],
          nx = ride[Math.max(0, ride.length - 3)],
          tx0 = A0[0] - nx[0],
          ty0 = A0[1] - nx[1],
          tl0 = Math.hypot(tx0, ty0) || 1,
          sg = (E[0] - A0[0]) * -ty0 + (E[1] - A0[1]) * tx0 >= 0 ? 1 : -1,
          off = 7;
        for (let k = 0; k < ride.length; k++) {
          const a = ride[Math.max(0, k - 2)],
            b = ride[Math.min(ride.length - 1, k + 2)],
            tx = b[0] - a[0],
            ty = b[1] - a[1],
            tl = Math.hypot(tx, ty) || 1,
            f = Math.min(1, k / 6);
          pts.push([ride[k][0] - (ty / tl) * off * sg * f, ride[k][1] + (tx / tl) * off * sg * f]);
        }
        const A = pts[pts.length - 1],
          T = [tx0 / tl0, ty0 / tl0],
          dd = Math.hypot(E[0] - A[0], E[1] - A[1]),
          k1 = Math.min(dd * 0.6, R * 0.45),
          C1 = [A[0] + T[0] * k1, A[1] + T[1] * k1],
          C2 = [E[0] + (C1[0] - E[0]) * 0.3, E[1] + (C1[1] - E[1]) * 0.3];
        for (let q = 1; q <= 24; q++) pts.push(cubicAt(A, C1, C2, E, q / 24));
      }
      colorPaths[sp.li] = chaikin(
        resample(
          pts.map(p => [p[0], p[1], sp.w || 1]),
          CP_STEP
        ),
        1
      );
    }
  let Q = sym.fine ? chaikin(resample(P, sym.fine[0]), sym.fine[1]) : chaikin(resample(P, 20), 4);
  if (sym.loops) Q = chaikin(resample(loopify(resample(Q, 4), R), 4), 1);
  const out = [Q[0]];
  for (let i = 1; i < Q.length; i++) {
    const d = Math.hypot(Q[i][0] - out[out.length - 1][0], Q[i][1] - out[out.length - 1][1]);
    if (d >= 4.5 || i === Q.length - 1) out.push(Q[i]);
  }
  return {
    pts: out,
    station: [cx + st[0] * R, cy + st[1] * R],
    blooms,
    colorPaths,
    stOv: sym.dots ? sym.dots({ cx, cy, R }) : null,
  };
}
