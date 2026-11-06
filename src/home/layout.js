// Where the seven lines run for a symbol on a page of a given size. The ink line draws the symbol. Each coloured line flies in from
// off the page, rides along a stretch of the symbol (or follows a path of its own, if the symbol gives it one), and runs out to its
// dot: a page's line to that page's dot, which sits where the symbol says or else where there is room; the other three to dots on a
// ring round the symbol.
import { clamp, cubicAt } from '../lib/math.js';
import { ropeX, surfaceY, waveY } from '../lib/surface.js';
import { avg } from './curves.js';
import { LINES, durOf, endOf } from './lines.js';
import { SHAPES, SYMBOLS, symbolShape } from './symbols/index.js';

/** The symbol to show: the one asked for (the dev picker, or a shuffle), or else the one picked for this visit. */
export const shapeWanted = s => (SHAPES.includes(s.asked) ? s.asked : SHAPES.includes(s.picked) ? s.picked : 'enso');

const extents = {};
/** How far a symbol reaches either side of its centre, in its own units (measured once per symbol). */
export function extentOf(name) {
  if (extents[name]) return extents[name];
  const U = 100,
    S = symbolShape(name, 0, 0, U);
  let m = 0;
  const see = p => {
    if (p && isFinite(p[0])) m = Math.max(m, Math.abs(p[0]));
  };
  S.pts.forEach(see);
  Object.values(S.colorPaths || {}).forEach(cp => cp.forEach(see));
  see(S.station);
  if (S.stOv)
    Object.values(S.stOv).forEach(v => {
      if (Array.isArray(v)) see(v);
    });
  return (extents[name] = Math.max(1, m / U));
}

/** A curve from A to D, pulled by B and C, added to `out` as n points. */
function bez(out, A, B, C, D, n) {
  for (let i = 1; i <= n; i++) out.push(cubicAt(A, B, C, D, i / n));
}

/** How big a symbol is drawn on a page W x H, and where its centre is: { W, H, cx, cy, R (px to the symbol's unit) }. */
function sizeFor(name, W, H) {
  // on a narrow screen each symbol is sized to fit its own width (its widest drawing, coloured lines and dots included), so compact ones
  // aren't left tiny; wide ones like the wave still fit. Wider screens keep the fixed proportion
  const R = W < 720 ? Math.min(H * 0.27, W * 0.32, (W / 2 - 28) / extentOf(name)) : Math.min(W * 0.26, H * 0.27),
    cx = W / 2,
    cy = H / 2 - R * 0.22;
  return { W, H, cx, cy, R };
}

/**
 * The black line as laid out on the page (SP: its points), with what the rest keeps asking about it: NS (how many points), SN (its
 * normal at each), curv (how sharply it turns at each), near(S) (the point nearest S), and how far the symbol reaches from its
 * centre in each of SB sectors round it: sec(E) is the sector E is in, secR the reach in each, secMax(k) the reach round sector k.
 */
function inkLine(SP, cx, cy) {
  const NS = SP.length;
  const nrm = a =>
    a.map((p, i) => {
      const q = a[Math.min(a.length - 1, i + 1)],
        r2 = a[Math.max(0, i - 1)],
        tx = q[0] - r2[0],
        ty = q[1] - r2[1],
        l = Math.hypot(tx, ty) || 1;
      return [-ty / l, tx / l];
    });
  const SN = nrm(SP);
  const curv = SP.map((p, i) => {
    if (i < 2 || i > NS - 3) return 0;
    const a = Math.atan2(p[1] - SP[i - 2][1], p[0] - SP[i - 2][0]),
      b = Math.atan2(SP[i + 2][1] - p[1], SP[i + 2][0] - p[0]);
    let d = Math.abs(b - a);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d;
  });
  const near = S => {
    let b = 1e9,
      bi = 0;
    SP.forEach((p, i) => {
      const d = Math.hypot(p[0] - S[0], p[1] - S[1]);
      if (d < b) {
        b = d;
        bi = i;
      }
    });
    return bi;
  };
  const SB = 48,
    secR = new Array(SB).fill(0),
    sec = E => ((Math.floor(((Math.atan2(E[1] - cy, E[0] - cx) + Math.PI) / (2 * Math.PI)) * SB) % SB) + SB) % SB;
  SP.forEach(q => {
    if ((q[2] ?? 1) < 0.2) return;
    const k = sec(q),
      r = Math.hypot(q[0] - cx, q[1] - cy);
    if (r > secR[k]) secR[k] = r;
  });
  const secMax = k => Math.max(secR[k], secR[(k + 1) % SB], secR[(k + SB - 1) % SB]);
  return { SP, NS, SN, curv, near, SB, secR, sec, secMax };
}

/**
 * Where the three pages' dots sit (s.stations; s.station is Freediving's) and their labels (s.labelAt, when the symbol places them).
 * By default Freediving's is where the symbol says, moved outwards if that is off the page or on the drawing, and Sound's and the
 * Library's are found round the symbol where there is room; on a narrow screen all three sit in a row under it; and a symbol can
 * place any of them itself (its dots()). Gives { ends: the dots so far (the other lines' are added as they are placed), stIs: the
 * point of the black line nearest each }.
 */
function placeStations(s, ink, SH, { W, H, cx, cy }) {
  const { SP, NS, near } = ink;
  s.station = SH.station;
  {
    const okF = S =>
      S[0] > (W < 720 ? 44 : 70) &&
      S[0] < W - (W < 720 ? 44 : 70) &&
      S[1] > 66 &&
      S[1] < H - 70 &&
      SP.every(p => !(p[0] > S[0] - 80 && p[0] < S[0] + 80 && p[1] > S[1] - 30 && p[1] < S[1] + 80));
    if (!okF(s.station)) {
      const ox = s.station[0] - cx,
        oy = s.station[1] - cy,
        ol = Math.hypot(ox, oy) || 1;
      for (let d = 12; d <= 240; d += 12) {
        const S2 = [s.station[0] + (ox / ol) * d, s.station[1] + (oy / ol) * d];
        if (okF(S2)) {
          s.station = S2;
          break;
        }
      }
    }
  }
  const mX = W < 720 ? 44 : 70,
    clear = S =>
      S[0] > mX &&
      S[0] < W - mX &&
      S[1] > 66 &&
      S[1] < H - 70 &&
      SP.every(p => !(p[0] > S[0] - 100 && p[0] < S[0] + 100 && p[1] > S[1] - 50 && p[1] < S[1] + 100));
  const auto = (f, dist) => {
    const i = Math.round(f * (NS - 1)),
      p = SP[i],
      dx = p[0] - cx,
      dy = p[1] - cy,
      dl = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / dl) * dist, p[1] + (dy / dl) * dist];
  };
  const pickF = (f, avoid) => {
    for (let t = 0; t < 14; t++)
      for (let dist = 34; dist <= 220; dist += 16) {
        const S = auto((f + t * 0.07) % 1, dist);
        if (clear(S) && avoid.every(A => Math.hypot(A[0] - S[0], A[1] - S[1]) > 150)) return S;
      }
    return auto(f, 120);
  };
  let sSnd, sLib;
  {
    sSnd = pickF(0.18, [s.station]);
    sLib = pickF(0.6, [s.station, sSnd]);
  }
  if (W < 720) {
    let yb = -1e9;
    SP.forEach(p => {
      if ((p[2] ?? 1) >= 0.2) yb = Math.max(yb, p[1]);
    });
    const ry = Math.min(H - 90, yb + 84);
    sSnd = [W * 0.2, ry];
    s.station = [W * 0.5, ry];
    sLib = [W * 0.8, ry];
  }
  if (SH.stOv && SH.stOv.library) sLib = SH.stOv.library;
  if (SH.stOv && SH.stOv.sound) sSnd = SH.stOv.sound;
  if (SH.stOv && SH.stOv.freediving) s.station = SH.stOv.freediving;
  s.labelAt = (SH.stOv && SH.stOv.labelAt) || null;
  s.stations = { freediving: s.station, sound: sSnd, library: sLib };
  const fdI = near(s.station);
  const stIs = { freediving: fdI, sound: near(sSnd), library: near(sLib) };
  const ends = [s.station, sSnd, sLib];
  return { ends, stIs };
}

/**
 * Which stretch of the black line each coloured line rides: WIN[li] = [from, to, backwards?] (points of the line). A page's line
 * takes the stretch that ends by its dot. Each of the others takes the best stretch left: on the outside of the symbol, away from
 * the stretches already taken and from the pages' labels, without the brush lifting or turning sharply in it.
 */
function chooseStretches(s, ink, { stIs, ends }, { cx, cy, R }) {
  const { SP, NS, sec, secMax } = ink;
  const WIN = {};
  {
    const okI = SP.map(q => {
      if ((q[2] ?? 1) < 0.5) return 0;
      const k = sec(q),
        r = Math.hypot(q[0] - cx, q[1] - cy);
      return r >= 0.8 * secMax(k) ? 1 : 0;
    });
    const pre = [0];
    okI.forEach((v, i) => pre.push(pre[i] + v));
    const hidP = [0];
    SP.forEach((q, i) => hidP.push(hidP[i] + ((q[2] ?? 1) < 0.2 ? 1 : 0)));
    const hidN = (a, b) => hidP[b + 1] - hidP[a];
    const frac = (a, b) => (pre[b + 1] - pre[a]) / Math.max(1, b - a + 1);
    const cen = (a, b) => {
        const m = SP[Math.floor((a + b) / 2)],
          e2 = SP[b];
        return [(m[0] * 2 + e2[0]) / 3, (m[1] * 2 + e2[1]) / 3];
      },
      taken = [],
      takenS = [],
      samp = (a, b) => {
        const o = [];
        for (let i = a; i <= b; i += 4) o.push(SP[i]);
        return o;
      },
      mdOf = (a, b) => {
        if (!takenS.length) return R;
        let t = 0,
          n = 0;
        for (let i = a; i <= b; i += 4) {
          t += nearT(i);
          n++;
        }
        return t / n;
      };
    // the search below asks the same few things about each point thousands of times, so each is worked out once: how far it is from the
    // nearest stretch already taken (until another is taken), how sharply the stroke turns there, and whether it is near a page's label
    let nearTN = -1;
    const nearTC = new Float64Array(NS),
      nearT = i => {
        if (nearTN !== takenS.length) {
          nearTN = takenS.length;
          nearTC.fill(-1);
        }
        if (nearTC[i] < 0) {
          const p = SP[i];
          let m = 1e9;
          for (const q of takenS) {
            const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
            if (d < m) m = d;
          }
          nearTC[i] = Math.sqrt(m);
        }
        return nearTC[i];
      };
    const turnC = new Float64Array(NS).fill(-1),
      turnAt = i => {
        if (turnC[i] < 0) {
          const p0 = SP[i - 4],
            p1 = SP[i],
            p2 = SP[i + 4],
            a1 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]),
            a2 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
          let d = Math.abs(a2 - a1);
          if (d > Math.PI) d = 2 * Math.PI - d;
          turnC[i] = d;
        }
        return turnC[i];
      };
    const nearEnd = SP.map(p => ends.slice(0, 3).some(S => Math.abs(p[0] - S[0]) < 150 && Math.abs(p[1] - S[1]) < 60));
    const spanOf = L =>
      Math.min(
        NS - 1,
        Math.max(
          s.shapeName === 'hangul' ? 30 : 50,
          Math.floor((L.page ? 0.22 : s.shapeName === 'hangul' ? 0.12 : 0.3) * NS)
        )
      );
    LINES.forEach((L, li) => {
      if (!L.page) return;
      const sp = spanOf(L),
        stI = stIs[L.page],
        A = [Math.max(0, stI - sp), stI],
        B = [stI, Math.min(NS - 1, stI + sp)];
      for (let i = A[1]; i >= A[0]; i--)
        if ((SP[i][2] ?? 1) < 0.2) {
          A[0] = Math.min(A[1], i + 1);
          break;
        }
      for (let i = B[0]; i <= B[1]; i++)
        if ((SP[i][2] ?? 1) < 0.2) {
          B[1] = Math.max(B[0], i - 1);
          break;
        }
      const useB = A[1] - A[0] < 20 || (B[1] - B[0] >= 20 && frac(B[0], B[1]) > frac(A[0], A[1]) + 0.1);
      const w = useB ? B : A;
      WIN[li] = [w[0], w[1], useB];
      taken.push(cen(w[0], w[1]));
      takenS.push(...samp(w[0], w[1]));
    });
    let runMax = 0,
      run = 0;
    SP.forEach(q => {
      if ((q[2] ?? 1) >= 0.2) {
        run++;
        runMax = Math.max(runMax, run);
      } else run = 0;
    });
    LINES.forEach((L, li) => {
      if (L.keep || L.page) return;
      const sp = Math.max(30, Math.min(spanOf(L), Math.floor(runMax * 0.34))),
        spx0 = sp;
      let best = null;
      for (const spx of [sp, Math.round(sp * 0.75), Math.max(24, Math.round(sp * 0.55))])
        for (let st = 0; st + spx < NS; st += 6) {
          const sp = spx;
          if (hidN(st, st + sp) > 1) {
            continue;
          }
          {
            let sharp = false;
            for (let i = st + 4; i <= st + sp - 4 && !sharp; i += 3) if (turnAt(i) > 1.9) sharp = true;
            if (sharp) {
              continue;
            }
          }
          const outE = (eb, ea) => {
              const tx = eb[0] - ea[0],
                ty = eb[1] - ea[1],
                tl = Math.hypot(tx, ty) || 1,
                ox = eb[0] - cx,
                oy = eb[1] - cy,
                ol = Math.hypot(ox, oy) || 1;
              return (tx * ox + ty * oy) / (tl * ol) >= -0.35;
            },
            okFw = outE(SP[st + sp], SP[st + sp - 5]),
            okRv = outE(SP[st], SP[st + 5]);
          if (!okFw && !okRv) {
            continue;
          }
          const rv = !okFw;
          const c = cen(st, st + sp),
            md = mdOf(st, st + sp),
            nearSt = (() => {
              for (let i = st; i <= st + sp; i += 4) if (nearEnd[i]) return 1;
              return 0;
            })(),
            fr = frac(st, st + sp),
            sc =
              (fr < 0.55 ? -3 : 0) +
              fr +
              2.6 * Math.min(1, md / (R * 0.7)) -
              (md < R * 0.3 ? 1.6 : 0) -
              1.2 * nearSt +
              (0.35 * sp) / spx0;
          if (!best || sc > best[0]) best = [sc, st, st + sp, c, rv];
        }
      if (!best) {
        const sp2 = Math.max(24, Math.floor(sp * 0.5));
        for (let st = 0; st + sp2 < NS; st += 4) {
          if (hidN(st, st + sp2) > 0) continue;
          const c = cen(st, st + sp2),
            md = mdOf(st, st + sp2),
            sc = frac(st, st + sp2) + 1.4 * Math.min(1, md / (R * 0.7));
          if (!best || sc > best[0]) best = [sc, st, st + sp2, c];
        }
      }
      if (best) {
        WIN[li] = [best[1], best[2], !!best[4]];
        taken.push(best[3]);
        takenS.push(...samp(best[1], best[2]));
      }
    });
  }
  return WIN;
}

/**
 * Line li's stretch on the symbol, as { arc: its points, z / cw / wl: its depth, width and weight at each }: the black line itself
 * for the ink; for a colour, its own path if the symbol gives it one, or else its stretch of the black line, weaving a little to
 * either side of it.
 */
function stretchOnSymbol(s, ink, WIN, L, li) {
  const { SP, NS, SN, curv } = ink;
  const span = Math.min(
    NS - 1,
    Math.max(
      s.shapeName === 'hangul' ? 30 : 50,
      Math.floor((L.page ? 0.22 : s.shapeName === 'hangul' ? 0.12 : 0.34) * NS)
    )
  );
  let i0, i1;
  if (L.keep) {
    i0 = 0;
    i1 = NS - 1;
  } else if (WIN[li]) {
    i0 = WIN[li][0];
    i1 = WIN[li][1];
  } else {
    const limit = SYMBOLS[s.shapeName].limit,
      lim = limit ? Math.floor(NS * limit) : NS - 1;
    i0 = Math.floor(L.u * 0.9 * lim);
    i1 = Math.min(lim, i0 + span);
    if (i1 - i0 < span) i0 = Math.max(0, i1 - span);
  }
  const arc = [],
    z = [],
    cw = [],
    wl = [];
  for (let i = i0; i <= i1; i++) {
    const ph = i * 4.5 * ((Math.PI * 2) / 520);
    const off = L.keep ? 0 : Math.sin(ph) * 5 + (li - 3.5) * 8.5;
    arc.push([SP[i][0] + SN[i][0] * off, SP[i][1] + SN[i][1] * off]);
    z.push(
      L.keep
        ? 0.05
        : s.shapeName === 'hangul'
          ? -0.6 + 0.3 * Math.cos(ph)
          : 0.05 + 0.55 * Math.cos(ph) + (li - 3.5) * 0.02
    );
    cw.push(clamp(1 - curv[i] * 0.5, 0.55, 1) * Math.max(0.35, SP[i][2] ?? 1));
    wl.push(SP[i][2] ?? 1);
  }
  const CPp = s.colorPaths[li];
  if (CPp) {
    arc.length = 0;
    z.length = 0;
    cw.length = 0;
    wl.length = 0;
    CPp.forEach(p => {
      arc.push([p[0], p[1]]);
      z.push(0.35);
      cw.push(Math.max(0.35, p[2] ?? 1));
      wl.push(p[2] ?? 1);
    });
  } else if (!L.keep) {
    const sm = avg(avg(arc, 4), 4);
    for (let q = 0; q < arc.length; q++) arc[q] = sm[q];
  }
  if (!L.keep && !L.page && !CPp && WIN[li] && WIN[li][2]) {
    arc.reverse();
    z.reverse();
    cw.reverse();
    wl.reverse();
  }
  return { arc, z, cw, wl };
}

/** A small line leaves the symbol where it is on the outside and heading outwards: its stretch is cut back to the last such point. */
function trimToOutside(ink, { cx, cy }, { arc, z, cw, wl }) {
  const { sec, secMax } = ink;
  let j = arc.length - 1;
  const isOut = p => {
      const k = sec(p);
      return Math.hypot(p[0] - cx, p[1] - cy) >= 0.86 * secMax(k);
    },
    jmin = Math.floor(arc.length * 0.45);
  const outT = q => {
    if (q < 5) return true;
    const p = arc[q],
      pp = arc[q - 4],
      tx = p[0] - pp[0],
      ty = p[1] - pp[1],
      tl = Math.hypot(tx, ty) || 1,
      ox = p[0] - cx,
      oy = p[1] - cy,
      ol = Math.hypot(ox, oy) || 1;
    return (tx * ox + ty * oy) / (tl * ol) > -0.15;
  };
  while (j > jmin && !(isOut(arc[j]) && outT(j))) j--;
  if (j <= jmin) {
    j = arc.length - 1;
    while (j > jmin && !isOut(arc[j])) j--;
  }
  if (j < arc.length - 1 && j > 6) {
    arc.length = j + 1;
    z.length = j + 1;
    cw.length = j + 1;
    wl.length = j + 1;
  }
}

/**
 * A small line runs on from the end of its stretch to its dot, on a ring just outside the symbol: straight out if there is room
 * there, or else round the ring to the nearest free place (clear of the drawing, the pages' dots and labels, and the other small
 * lines' runs, which are kept in s.runs).
 */
function runToDot(s, ink, ends, { W, H, cx, cy }, { arc, z, cw, wl }) {
  const { SP, SB, secR, sec, secMax } = ink;
  const outside = E => {
    const k = sec(E);
    return Math.hypot(E[0] - cx, E[1] - cy) > secMax(k) + 22;
  };
  const clearPt = (E, d) =>
    outside(E) &&
    ends.slice(0, 3).every(A => !(Math.abs(E[0] - A[0]) < 150 && Math.abs(E[1] - A[1]) < 58)) &&
    E[0] > 24 &&
    E[0] < W - 24 &&
    E[1] > 24 &&
    E[1] < H - 24 &&
    SP.every(q => (q[2] ?? 1) < 0.2 || Math.hypot(q[0] - E[0], q[1] - E[1]) > d) &&
    ends.every((A, ai) => Math.hypot(A[0] - E[0], A[1] - E[1]) > (ai < 3 ? 110 : 75));
  const e = arc[arc.length - 1],
    pe = arc[arc.length - 4],
    tl1 = Math.hypot(e[0] - pe[0], e[1] - pe[1]) || 1,
    te1 = [(e[0] - pe[0]) / tl1, (e[1] - pe[1]) / tl1];
  const ringR = a => {
    const k = ((Math.floor(((a + Math.PI) / (2 * Math.PI)) * SB) % SB) + SB) % SB;
    return (
      Math.max(secMax(k), secR[(k + 2) % SB], secR[(k + SB - 2) % SB]) + 34 + (SYMBOLS[s.shapeName].ringExtra || 0)
    );
  };
  const ae = Math.atan2(e[1] - cy, e[0] - cx);
  let best = null;
  s.runs = s.runs || [];
  const adiff = (x, y) => {
    let d = Math.abs(x - y) % (2 * Math.PI);
    return d > Math.PI ? 2 * Math.PI - d : d;
  };
  const overlaps = (a0, a1) =>
    s.runs.some(([b0, b1]) => {
      const n = 16;
      let o = 0;
      for (let q = 0; q <= n; q++) {
        const a = a0 + ((a1 - a0) * q) / n;
        let lo = Math.min(b0, b1),
          hi = Math.max(b0, b1);
        let aa = a;
        while (aa < lo - Math.PI) aa += 2 * Math.PI;
        while (aa > hi + Math.PI) aa -= 2 * Math.PI;
        if (aa >= lo - 0.12 && aa <= hi + 0.12) o++;
      }
      return o > 4;
    });
  const crs = Math.cos(ae) * te1[1] - Math.sin(ae) * te1[0],
    tsg = crs >= 0 ? 1 : -1,
    outD = Math.cos(ae) * te1[0] + Math.sin(ae) * te1[1];
  for (const pass of [0, 1]) {
    for (let st2 = 0; st2 <= (pass ? 24 : 9) && !best; st2++)
      for (const sg of st2 ? [tsg, -tsg] : [tsg]) {
        const a = ae + sg * st2 * 0.13;
        if (!pass && sg !== tsg && st2 > 2) continue;
        if (!pass && (s.runs.some(([, b1]) => adiff(a, b1) < 0.5) || overlaps(ae, a))) continue;
        for (const ex2 of [0, 22, 46]) {
          const r = ringR(a) + ex2,
            E2 = [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
          if (clearPt(E2, 30)) {
            best = [E2, a, r];
            break;
          }
        }
        if (best) break;
      }
    if (best) break;
  }
  if (best) s.runs.push([ae, best[1]]);
  if (!best) {
    const r = ringR(ae);
    best = [[cx + Math.cos(ae) * r, cy + Math.sin(ae) * r], ae, r];
  }
  const E = best[0];
  ends.push(E);
  const n0 = arc.length;
  {
    let da = best[1] - ae;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const hd = 26 + 40 * Math.max(0, -outD),
      seg = [e],
      cub = (P0, C1, C2, P1, n) => {
        for (let q = 1; q <= n; q++) seg.push(cubicAt(P0, C1, C2, P1, q / n));
      };
    if (Math.abs(da) < 0.36) {
      const ox = E[0] - cx,
        oy = E[1] - cy,
        ol = Math.hypot(ox, oy) || 1;
      cub(
        e,
        [e[0] + te1[0] * hd, e[1] + te1[1] * hd],
        [E[0] - (ox / ol) * hd * 0.6, E[1] - (oy / ol) * hd * 0.6],
        E,
        18
      );
    } else {
      const dS = Math.sign(da),
        aW = ae + dS * 0.18,
        rW = ringR(aW),
        W0 = [cx + Math.cos(aW) * rW, cy + Math.sin(aW) * rW],
        tg = [-Math.sin(aW) * dS, Math.cos(aW) * dS];
      cub(e, [e[0] + te1[0] * hd, e[1] + te1[1] * hd], [W0[0] - tg[0] * hd * 0.8, W0[1] - tg[1] * hd * 0.8], W0, 16);
      const da2 = da - dS * 0.18,
        m = Math.max(2, Math.ceil(Math.abs(da2) / 0.05)),
        rEnd = best[2] - ringR(best[1]);
      for (let q = 1; q <= m; q++) {
        const u = q / m,
          a = aW + da2 * u,
          r = ringR(a) + rEnd * u;
        seg.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    }
    const sm = avg(avg(avg(seg, 3), 3), 3);
    sm[0] = e;
    sm[sm.length - 1] = E;
    for (let q = 1; q < sm.length; q++) arc.push(sm[q]);
  }
  for (let q = n0; q < arc.length; q++) {
    z.push(0.3);
    cw.push(1);
    wl.push(1);
  }
}

/** A page's line runs on from its stretch to its dot: any of the stretch that heads away from the dot is dropped first. */
function runToStation(s, { arc, z, cw, wl }, L, rev) {
  if (rev) {
    arc.reverse();
    z.reverse();
    cw.reverse();
    wl.reverse();
  }
  {
    const S0 = s.stations[L.page],
      lim = Math.floor(arc.length * 0.45);
    let popped = 0;
    while (arc.length > 12 && popped < lim) {
      const e1 = arc[arc.length - 1],
        p1 = arc[arc.length - 5],
        tx = e1[0] - p1[0],
        ty = e1[1] - p1[1],
        tl = Math.hypot(tx, ty) || 1,
        sx = S0[0] - e1[0],
        sy = S0[1] - e1[1],
        sl = Math.hypot(sx, sy) || 1;
      if ((tx * sx + ty * sy) / (tl * sl) > 0.55 || sl < 30) break;
      arc.pop();
      z.pop();
      cw.pop();
      wl.pop();
      popped++;
    }
  }
  const e = arc[arc.length - 1],
    pe = arc[arc.length - 4] || arc[0],
    tl0 = Math.hypot(e[0] - pe[0], e[1] - pe[1]) || 1,
    te = [(e[0] - pe[0]) / tl0, (e[1] - pe[1]) / tl0],
    S = s.stations[L.page];
  const dist = Math.hypot(S[0] - e[0], S[1] - e[1]);
  if (dist > 4) {
    const n0 = arc.length;
    const cy2 = v => Math.max(28, v),
      ux = (S[0] - e[0]) / dist,
      uy = (S[1] - e[1]) / dist,
      pj = te[0] * ux + te[1] * uy,
      ds = [2 * pj * ux - te[0], 2 * pj * uy - te[1]],
      hk = (dist * 0.4) / (1 + Math.max(0, pj) * 0.5),
      C1b = [e[0] + te[0] * hk, cy2(e[1] + te[1] * hk)],
      C2a = [S[0] - ds[0] * hk, cy2(S[1] - ds[1] * hk)];
    bez(arc, e, C1b, C2a, S, 30);

    for (let q = n0; q < arc.length; q++) {
      z.push(0.1);
      cw.push(1);
      wl.push(1);
    }
  }
}

/**
 * How line li comes in: from off the page (each from its own direction), or from the dot the last page handed over, or, arriving from
 * Freediving, off the water's surface. It ends beside the symbol, from where it curves on to its stretch.
 */
function flyIn(s, { W, H, cx, cy, R }, L, li) {
  const ang = -Math.PI / 2 + (li / LINES.length) * Math.PI * 2 + 0.3,
    sg = li % 2 ? 1 : -1,
    ten = [];
  {
    const far = Math.hypot(W, H) * 0.62,
      LXd = ropeX(W),
      wx0 = -20 + (li * (W + 40)) / 7,
      NA = s.arriving && !s.previous ? s.arriving[L.keep ? 'ink' : L.page || 'c' + li] : null,
      P0 = NA
        ? NA.slice()
        : s.fromDive
          ? [wx0, surfaceY(H) + waveY(wx0 - LXd, li % 3, 0)]
          : [cx + Math.cos(ang) * far, cy + Math.sin(ang) * far],
      Mx = [cx + Math.cos(ang + sg * 0.8) * R * 1.45, cy + Math.sin(ang + sg * 0.8) * R * 1.45];
    const C1 = NA
        ? [P0[0] - 160, P0[1] + sg * 50]
        : s.fromDive
          ? [P0[0] + 140, P0[1] + 30]
          : [P0[0] + Math.cos(ang + sg * 1.6) * far * 0.35, P0[1] + Math.sin(ang + sg * 1.6) * far * 0.35],
      C2 = [Mx[0] + Math.cos(ang + sg * 0.2) * R * 0.9, Mx[1] + Math.sin(ang + sg * 0.2) * R * 0.9];
    ten.push(P0);
    bez(ten, P0, C1, C2, Mx, 60);
  }
  return ten;
}

/** The whole of line li: flying in (or, after a shuffle, growing out of the last symbol's line), its stretch, and out to its dot. */
function linePath(s, ink, stops, WIN, page, L, li) {
  const { cx, cy, R } = page,
    run = stretchOnSymbol(s, ink, WIN, L, li),
    { arc, z, cw, wl } = run,
    CPp = s.colorPaths[li];
  if (!L.keep && !L.page && !CPp && arc.length > 4) trimToOutside(ink, page, run);
  if (!L.keep && !L.page && !CPp && arc.length > 4) runToDot(s, ink, stops.ends, page, run);
  if (L.page && !(CPp && SYMBOLS[s.shapeName].ownLines)) runToStation(s, run, L, WIN[li][2]);
  const TR = s.previous && s.previous[li],
    ten = TR ? TR.pts.slice() : flyIn(s, page, L, li);
  const M = ten[ten.length - 1],
    Mp = ten[ten.length - 2],
    md = Math.hypot(M[0] - Mp[0], M[1] - Mp[1]) || 1,
    dm = [(M[0] - Mp[0]) / md, (M[1] - Mp[1]) / md];
  const J = arc[0],
    tl = Math.hypot(arc[1][0] - J[0], arc[1][1] - J[1]) || 1,
    tg = [(arc[1][0] - J[0]) / tl, (arc[1][1] - J[1]) / tl];
  const pts = ten.slice();
  if (TR) {
    const dx = J[0] - M[0],
      dy = J[1] - M[1],
      dist = Math.hypot(dx, dy) || 1,
      d = Math.max(R, dist * 0.6);
    if (dm[0] * dx + dm[1] * dy < 0 || tg[0] * dx + tg[1] * dy < 0) {
      const mx = (M[0] + J[0]) / 2,
        my = (M[1] + J[1]) / 2,
        ox = mx - cx,
        oy = my - cy,
        ol = Math.hypot(ox, oy) || 1,
        Wp = [mx + (ox / ol) * R * 1.1, my + (oy / ol) * R * 1.1],
        wt2 = [(J[0] - M[0]) / dist, (J[1] - M[1]) / dist];
      bez(pts, M, [M[0] + dm[0] * d, M[1] + dm[1] * d], [Wp[0] - wt2[0] * d * 0.7, Wp[1] - wt2[1] * d * 0.7], Wp, 30);
      bez(pts, Wp, [Wp[0] + wt2[0] * d * 0.7, Wp[1] + wt2[1] * d * 0.7], [J[0] - tg[0] * d, J[1] - tg[1] * d], J, 30);
    } else bez(pts, M, [M[0] + dm[0] * d, M[1] + dm[1] * d], [J[0] - tg[0] * d, J[1] - tg[1] * d], J, 40);
  } else
    bez(
      pts,
      M,
      [M[0] + dm[0] * R * 0.6, M[1] + dm[1] * R * 0.6],
      [J[0] - tg[0] * R * 0.7, J[1] - tg[1] * R * 0.7],
      J,
      36
    );
  const arc0 = pts.length;
  for (let i = 1; i < arc.length; i++) pts.push(arc[i]);
  const along = [0];
  for (let i = 1; i < pts.length; i++)
    along[i] = along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const zz = [],
    cc = [],
    wt = [],
    nT = TR ? ten.length : 0;
  for (let i = 0; i < pts.length; i++) {
    const o = i < nT;
    zz.push(i >= arc0 ? z[i - arc0 + 1] : o ? (TR.z[i] ?? 0) : TR ? 0.15 : 0);
    cc.push(i >= arc0 ? cw[i - arc0 + 1] : o ? (TR.cw[i] ?? 1) : 1);
    wt.push(i >= arc0 ? (wl[i - arc0 + 1] ?? 1) : o ? (TR.wt[i] ?? 1) : 1);
  }
  return {
    L,
    pts,
    s: along,
    zA: zz,
    cw: cc,
    wt,
    d: L.d,
    tr: !!TR,
    oldLen: TR ? along[ten.length - 1] : 0,
    len: along[along.length - 1],
    entry: along[arc0 - 1],
    arc0,
    ph: li * 1.7,
  };
}

/**
 * Which side of its dot each page's label goes (s.labelSide: null for below, or 'above', 'left', 'right'): where it covers least of
 * the settled strokes, and not where its own line comes in.
 */
function placeLabelSides(s, W, H) {
  const pts = [];
  s.paths.forEach(P =>
    P.pts.forEach((p, i) => {
      if (i >= P.arc0 && (!P.L.keep || (P.wt[i] ?? 1) >= 0.2)) pts.push(p);
    })
  );
  const mw = pg => {
      const e = s.buttons[pg] && s.buttons[pg].firstElementChild;
      return e && e.offsetWidth ? e.offsetWidth + 4 : 0;
    },
    lw = { freediving: mw('freediving') || 116, sound: mw('sound') || 74, library: mw('library') || 84 },
    lh = { freediving: 18, sound: 18, library: 18 };
  s.labelSide = {};
  for (const pg of ['freediving', 'sound', 'library']) {
    const S = s.stations[pg],
      w = lw[pg],
      h = lh[pg];
    const boxes = {
      below: [S[0] - w / 2 - 6, S[0] + w / 2 + 6, S[1] + 10, S[1] + 18 + h * 1.6],
      above: [S[0] - w / 2 - 6, S[0] + w / 2 + 6, S[1] - 18 - h * 1.6, S[1] - 10],
      right: [S[0] + 10, S[0] + 22 + w, S[1] - h, S[1] + h],
      left: [S[0] - 22 - w, S[0] - 10, S[1] - h, S[1] + h],
    };
    let best = 'below',
      bh = 1e9;
    const OP = s.paths.find(P => P.L.page === pg);
    let ap = [0, 0];
    if (OP) {
      const q = OP.pts,
        e = q[q.length - 1];
      let k2 = q.length - 1;
      while (k2 > 0 && Math.hypot(q[k2][0] - e[0], q[k2][1] - e[1]) < 45) k2--;
      const dx = q[k2][0] - e[0],
        dy = q[k2][1] - e[1],
        dl = Math.hypot(dx, dy) || 1;
      ap = [dx / dl, dy / dl];
    }
    const DIR = { below: [0, 1], above: [0, -1], right: [1, 0], left: [-1, 0] };
    ['below', 'right', 'left', 'above'].forEach((k, ord) => {
      const b = boxes[k];
      if (b[0] < 6 || b[1] > W - 6 || b[2] < 6 || b[3] > H - 6) return;
      const hit =
        pts.filter(p => p[0] > b[0] && p[0] < b[1] && p[1] > b[2] && p[1] < b[3]).length +
        ord * 0.1 +
        40 * Math.max(0, DIR[k][0] * ap[0] + DIR[k][1] * ap[1] - 0.3);
      if (hit < bh) {
        bh = hit;
        best = k;
      }
    });
    s.labelSide[pg] = best === 'below' ? null : best;
  }
}

/**
 * Lays the symbol out for a page W x H. Sets on s: geo (the symbol's centre and size), shapeName, stations (where each page's dot
 * sits), labelAt and labelSide (where their labels go), blooms, colorPaths, and paths: for each line { L (the line), pts, s (the
 * distance along it at each point), zA / cw / wt (its depth, width and weight at each point), arc0 (where its stretch on the symbol
 * begins; before that it is flying in), entry, len, d, tr (it grows out of the last symbol's line), oldLen, ph }.
 */
export function layout(s, W, H) {
  const name = shapeWanted(s),
    page = sizeFor(name, W, H),
    { cx, cy, R } = page;
  s.geo = page;
  s.runs = [];
  s.shapeName = name;
  s.labelSide = {};
  const SH = symbolShape(name, cx, cy, R);
  s.blooms = SH.blooms;
  s.colorPaths = SH.colorPaths || {};
  const ink = inkLine(SH.pts, cx, cy),
    stops = placeStations(s, ink, SH, page),
    WIN = chooseStretches(s, ink, stops, page);
  s.paths = LINES.map((L, li) => linePath(s, ink, stops, WIN, page, L, li));
  // spring: the lines that brush the blossoms wait, so they finish just after the branch they sit on has been drawn
  if (s.shapeName === 'spring' && !s.previous && !s.fromDive) {
    const ink = s.paths[0],
      e = endOf(s, ink);
    s.paths.forEach((P, li) => {
      if (s.colorPaths[li] && !P.tr) P.d = Math.max(P.d ?? P.L.d, e - durOf(s, P) + 0.3);
    });
  }
  placeLabelSides(s, W, H);
}
