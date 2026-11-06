// The lines as paint, for one frame. Each line, as far as it has been drawn, becomes a ribbon of small four-sided pieces ("quads"),
// with the width, strength and depth the brush has at each point; paint.js lays them on the paper.
//
// A quad is { q: its corners, a: its strength (0..1), z: its depth (lines nearer the eye are painted later), col: its colour, pid:
// which line it belongs to, ink: whether that is the black line }.
import { clamp, easeInOut, smooth } from '../lib/math.js';
import { lerpPt, smooth1 } from './curves.js';
import { fadeAt } from './fade.js';
import { LINES, durOf } from './lines.js';
import { SYMBOLS } from './symbols/index.js';

// the brush is held like a broad nib at this angle (radians): a stroke is widest across it and thinnest along it
const NIB = -0.65;

/**
 * How far line P has got at time T: { tr: it grows out of the last symbol's line (after a shuffle), k: 0..1 through its drawing, h:
 * how far along it the head is (px), cut: where its tail is (a line growing out of the last symbol leaves that symbol behind), tEnd:
 * when it finishes, fin: 0..1 as it settles afterwards, hasCP: the symbol gave it a path of its own }.
 */
function progress(s, P, T) {
  const tr = P.tr,
    L = P.L,
    dur = tr ? (1.6 + (P.len - P.oldLen) / 900) / L.spd : durOf(s, P),
    k = clamp((T - (tr ? L.d * 0.6 : (P.d ?? L.d))) / dur, 0, 1);
  const newL = P.len - P.entry,
    ek = tr ? easeInOut(k) : 0,
    bodyL = tr ? P.oldLen + (newL - P.oldLen) * smooth(k) : 0;
  const h = tr ? P.oldLen + (P.len - P.oldLen) * ek : P.len * easeInOut(k),
    tEnd = (P.d ?? L.d) + dur,
    fin = tr ? 1 : smooth(clamp((T - tEnd) / 1.2, 0, 1));
  const cut = tr ? h - bodyL - 1 : -1e9,
    hasCP = !!s.colorPaths[LINES.indexOf(L)];
  return { tr, k, h, cut, tEnd, fin, hasCP };
}

/**
 * The brush along line P as far as it has got: at each point, where it is (pts), how wide the stroke is (ws), how strong (as), how
 * deep (zs), how far along the line (ss) and how dry the brush (dry). The part a line flies in on is thin and faint like a tentacle
 * and draws back once the line has arrived; on the symbol the brush presses, swells and tails off as a real one does.
 */
function brushAlong(s, P, { tr, h, cut, tEnd, fin, hasCP }, T, gone) {
  const L = P.L,
    sym = SYMBOLS[s.shapeName],
    multi = !!sym.several,
    hideLift = !!(sym.several || sym.hideLinks);
  const pts = [],
    ws = [],
    as = [],
    zs = [],
    ss = [],
    dry = [];
  for (let i = 0; i < P.pts.length; i++) {
    // the tip (and a retreating tail) sit exactly where they should, between stored points, so slow motion glides instead of hopping a point at a time
    let sv = P.s[i],
      pt = P.pts[i],
      tipEnd = false;
    if (sv > h) {
      if (!i || P.s[i - 1] >= h) break;
      pt = lerpPt(P.pts[i - 1], pt, (h - P.s[i - 1]) / (sv - P.s[i - 1]));
      sv = h;
      tipEnd = true;
    }
    if (sv < cut) {
      const s1 = P.s[i + 1];
      if (s1 == null || s1 <= cut) continue;
      pt = lerpPt(pt, P.pts[i + 1], (cut - sv) / (s1 - sv));
      sv = cut;
    }
    const behind = h - sv,
      isArc = i >= P.arc0 || tr,
      ue = clamp(sv / P.entry, 0, 1),
      join = smooth(clamp((sv - P.entry) / 120, 0, 1));
    // arm (entry) stays like a tentacle while travelling, then retracts
    const tailP = -160 + (P.entry + 160) * fin;
    let a =
      isArc || tr ? 1 : clamp((sv - tailP) / 160, 0, 1) * clamp(1 - Math.max(0, behind - P.entry * 0.9) / 200, 0, 1);
    const zE = -0.4 + 1.2 * Math.sin(Math.PI * ue) + 0.25 * Math.sin(sv * 0.02 + P.ph);
    const z = tr ? P.zA[i] : zE + (P.zA[i] - zE) * join,
      sc =
        L.keep || (!isArc && !tr)
          ? Math.pow(L.keep ? 2.4 : 2.6, z - (isArc ? 0.05 : 0))
          : Math.max(0.35, Math.pow(2.4, z));
    if (!L.keep || s.dest) a *= 1 - gone;
    if (!isArc && !tr) {
      const fo = smooth(clamp((T - tEnd + 0.6) / 0.8, 0, 1)),
        stub = L.keep ? smooth(clamp(1 - (P.entry - sv) / 55, 0, 1)) : 0;
      a *= 1 - fo * (1 - stub);
    }
    const onS = !tr && s.fromDive;
    const armW =
      isArc || tr ? 1 : onS ? 0.35 + 0.9 * smooth(clamp(ue / 0.3, 0, 1)) * (1 - 0.3 * ue) : 0.5 + 1.1 * (1 - ue);
    let w =
      L.w *
      sc *
      armW *
      P.cw[i] *
      Math.min(1, 0.5 + behind / 50) *
      (onS ? Math.min(1, 0.42 + sv / 90) : Math.min(1, 0.45 + sv / 70));
    if (onS && !isArc) a *= (0.55 + 0.35 * ue) * clamp(sv / 150, 0, 1);
    let dr = tr
      ? (1 - clamp((sv - cut) / 120, 0, 1)) * 0.35
      : isArc
        ? 0
        : clamp((behind - P.entry * 0.6) / 300, 0, 1) * 0.7;
    if (tr) w *= Math.pow(clamp((sv - cut) / 120, 0, 1), 0.65) / Math.min(1, 0.45 + sv / 70);
    if (isArc) {
      const E0 = tr ? Math.max(0, cut) : P.entry,
        L0 = tr ? h : P.len,
        ua = clamp((sv - E0) / Math.max(1, L0 - E0), 0, 1),
        sa = clamp((sv - E0) / 40, 0, 1);
      const press =
        ua < 0.04 ? 0.75 + 0.55 * smooth(ua / 0.04) : ua < 0.12 ? 1.3 - 0.3 * smooth((ua - 0.04) / 0.08) : 1;
      const se = (L.keep ? P.len : L0) - sv,
        hl = multi ? 50 : Math.min(150, (L0 - E0) * 0.4),
        harai = se < hl ? 0.42 + 0.58 * smooth(se / hl) : 1;
      w *= (L.keep ? press : 1) * (multi ? 1 : 1 - 0.12 * ua) * harai * (L.keep ? 1 : Math.sqrt(Math.max(0.1, sa)));
      if (L.keep) {
        dr = multi ? smooth(clamp((70 - se) / 70, 0, 1)) * 0.6 : smooth(clamp((50 - se) / 50, 0, 1)) * 0.35;
        w *= 1 + s.overDiveT * 0.12;
      } else if (!L.page) dr = clamp((sv - (L0 - 200)) / 200, 0, 1) * 0.8;
    }
    if (P.wt[i] < (L.keep && s.shapeName === 'samurai' ? 0.5 : 0.2) || (hasCP && i >= P.arc0 && P.wt[i] < 0.5)) {
      a *= hideLift ? 0 : 0.06;
      w *= 0.4;
    } else if (P.wt[i] < 1) a *= clamp(0.25 + 0.75 * P.wt[i], 0, 1);
    // page lines fade a little towards their start; not spring's red, whose start is the blossoms
    if (L.page && !(L === LINES[1] && s.shapeName === 'spring'))
      a = Math.min(1, a / 0.94) * (0.62 + 0.38 * Math.pow(clamp(1 - (h - sv) / 900, 0, 1), 1.2));
    else if (!L.keep && isArc) {
      const nh = smooth(clamp(1 - (h - sv) / 220, 0, 1));
      a *= (0.72 + 0.28 * Math.pow(0.5 + 0.5 * Math.sin(sv * 0.006 + P.ph * 2.3), 1.5)) * (1 - nh) + nh;
    }
    if (!L.keep) {
      const nh = smooth(clamp(1 - (h - sv) / 90, 0, 1)),
        wb = (L.w || 8) * 0.55;
      if (w < wb) w += (wb - w) * nh;
    }
    pts.push(pt);
    ws.push(w);
    as.push(clamp(a, 0, 1) * 0.94);
    zs.push(z);
    ss.push(sv);
    dry.push(dr);
    if (tipEnd) break;
  }
  return { pts, ws, as, zs, ss, dry };
}

/**
 * Finishes the stroke: its width follows the nib's angle as the line turns, and width and strength are smoothed along it so no step
 * shows; then the hover fade is laid over it (see fade.js). Gives the stroke's normal at each point.
 */
function soften(s, P, tr, { pts, ws, as, ss, dry }) {
  const L = P.L,
    n = pts.length,
    N2 = [];
  for (let i = 0; i < n; i++) {
    const q = pts[Math.min(n - 1, i + 1)],
      pr = pts[Math.max(0, i - 1)];
    let tx = q[0] - pr[0],
      ty = q[1] - pr[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    N2.push([-ty, tx]);
    ws[i] *= 0.72 + 0.28 * Math.abs(Math.sin(Math.atan2(ty, tx) - NIB));
    if (!L.keep) as[i] *= clamp(0.7 + (0.3 * ws[i]) / (L.w * 1.3), 0.7, 1);
  }
  if (L.keep && n > 4) {
    const ds2 = Math.max(0.5, (ss[n - 1] - ss[0]) / (n - 1)),
      r2 = Math.max(1, Math.round(24 / ds2));
    for (const arr of [dry, as])
      for (let pass = 0; pass < 3; pass++) {
        const pre = [0];
        for (let i = 0; i < n; i++) pre.push(pre[i] + arr[i]);
        const o = [];
        for (let i = 0; i < n; i++) {
          if (arr === as && arr[i] < 0.005) {
            o.push(0);
            continue;
          }
          const lo = Math.max(0, i - r2),
            hi = Math.min(n - 1, i + r2);
          o.push((pre[hi + 1] - pre[lo]) / (hi - lo + 1));
        }
        for (let i = 0; i < n; i++) arr[i] = arr === as ? Math.min(o[i], arr[i] + 0.5) : o[i];
      }
  }
  if (!L.keep && n > 4) {
    // blur opacity/width along the stroke so no step changes survive
    const ds = Math.max(0.5, (ss[n - 1] - ss[0]) / (n - 1)),
      blur = (arr, px, keep0) => {
        const r = Math.max(1, Math.round(px / ds));
        for (let pass = 0; pass < 2; pass++) {
          const pre = [0];
          for (let i = 0; i < n; i++) pre.push(pre[i] + arr[i]);
          const o = arr.slice();
          for (let i = 0; i < n; i++) {
            if (keep0 && arr[i] === 0) continue;
            const lo = Math.max(0, i - r),
              hi = Math.min(n - 1, i + r);
            o[i] = (pre[hi + 1] - pre[lo]) / (hi - lo + 1);
          }
          for (let i = 0; i < n; i++) arr[i] = o[i];
        }
      };
    const a0 = as[0],
      a1 = as[n - 1];
    blur(as, 28, false);
    blur(ws, 10, false);
    as[0] = Math.min(as[0], a0);
    as[n - 1] = Math.min(as[n - 1], a1);
  }
  {
    const sw = smooth1(ws, 5),
      box = (arr, r) => {
        const c = [0];
        for (let q = 1; q < n; q++) c[q] = c[q - 1] + ((arr[q] + arr[q - 1]) / 2) * (ss[q] - ss[q - 1]);
        const o = [];
        let lo = 0,
          hi = 0;
        for (let q = 0; q < n; q++) {
          while (ss[lo] < ss[q] - r) lo++;
          if (hi < q) hi = q;
          while (hi < n - 1 && ss[hi + 1] <= ss[q] + r) hi++;
          const span = ss[hi] - ss[lo];
          o.push(span > 1e-6 ? (c[hi] - c[lo]) / span : arr[q]);
        }
        return o;
      },
      sa2 = box(box(as, 32), 32);
    for (let q = 0; q < n; q++) {
      ws[q] = sw[q];
      as[q] = sa2[q] * smooth(clamp(sa2[q] / 0.25, 0, 1));
    }
  }
  // each line's trail runs over the part you can see: from where its stroke begins (after the hidden lead-in it flew in on) to its tail
  if (s.fade) {
    const li = LINES.indexOf(L),
      x0 = tr ? ss[0] : Math.max(ss[0], P.entry),
      xl = Math.max(1, ss[n - 1] - x0);
    for (let q = 0; q < n; q++) as[q] *= fadeAt(s, li, clamp((ss[q] - x0) / xl, 0, 1));
  }
  return N2;
}

/** The finished stroke as quads: a round cap at each end, and a piece between each pair of points (more where the ink line's strength changes quickly). */
function ribbon(quads, { pts, ws, as, zs, dry }, N2, L, pid) {
  const n = pts.length,
    col = `rgb(${L.col[0]},${L.col[1]},${L.col[2]})`;
  const quad = (i0, o0, i1, o1, hw0, hw1, a, z) => {
    const p0 = pts[i0],
      p1 = pts[i1],
      n0 = N2[i0],
      n1 = N2[i1];
    const c0 = [p0[0] + n0[0] * o0, p0[1] + n0[1] * o0],
      c1 = [p1[0] + n1[0] * o1, p1[1] + n1[1] * o1];
    quads.push({
      z,
      a,
      col,
      pid,
      ink: !!L.keep,
      q: [
        [c0[0] - n0[0] * hw0, c0[1] - n0[1] * hw0],
        [c1[0] - n1[0] * hw1, c1[1] - n1[1] * hw1],
        [c1[0] + n1[0] * hw1, c1[1] + n1[1] * hw1],
        [c0[0] + n0[0] * hw0, c0[1] + n0[1] * hw0],
      ],
    });
  };
  const cap = ci => {
    const r = ws[ci] / 2,
      c = pts[ci],
      q = [];
    if (r < 0.6 || as[ci] < 0.02) return;
    for (let k3 = 0; k3 < 12; k3++) {
      const an = (k3 / 12) * 6.2832;
      q.push([c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r]);
    }
    quads.push({ z: zs[ci], a: as[ci] * (1 - dry[ci] * 0.9), col, pid, ink: !!L.keep, q });
  };
  cap(0);
  cap(n - 1);
  for (let i = 0; i < n - 1; i++) {
    if (as[i] < 0.005 || as[i + 1] < 0.005) continue;
    const a = (as[i] + as[i + 1]) / 2;
    const z = (zs[i] + zs[i + 1]) / 2,
      d = (dry[i] + dry[i + 1]) / 2,
      body = a * (1 - d * 0.9);
    if (body > 0.005) {
      const b0 = as[i] * (1 - dry[i] * 0.9),
        b1 = as[i + 1] * (1 - dry[i + 1] * 0.9),
        kk = L.keep && (b0 < 0.9 || b1 < 0.9) ? Math.min(6, Math.max(1, Math.ceil(Math.abs(b1 - b0) / 0.02))) : 1;
      if (kk === 1) quad(i, 0, i + 1, 0, ws[i] / 2, ws[i + 1] / 2, body, z);
      else {
        const p0 = pts[i],
          p1 = pts[i + 1],
          n0 = N2[i],
          n1 = N2[i + 1],
          hw0 = ws[i] / 2,
          hw1 = ws[i + 1] / 2,
          L0 = [p0[0] - n0[0] * hw0, p0[1] - n0[1] * hw0],
          R0 = [p0[0] + n0[0] * hw0, p0[1] + n0[1] * hw0],
          L1 = [p1[0] - n1[0] * hw1, p1[1] - n1[1] * hw1],
          R1 = [p1[0] + n1[0] * hw1, p1[1] + n1[1] * hw1],
          lp = (A, B, u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u];
        for (let s3 = 0; s3 < kk; s3++) {
          const u0 = s3 / kk,
            u1 = (s3 + 1) / kk;
          quads.push({
            z,
            a: b0 + ((b1 - b0) * (u0 + u1)) / 2,
            col,
            pid,
            ink: !!L.keep,
            q: [lp(L0, L1, u0), lp(L0, L1, u1), lp(R0, R1, u1), lp(R0, R1, u0)],
          });
        }
      }
    }
  }
}

/**
 * The quads of every line at time T. G: seconds into leaving (or null); gone: how far the lines have faded on the way out. Gives
 * { quads, pidc (how many lines made any), inkPid and topPid (which of them are the ink line, and the one painted over the rest) }.
 * Also notes where each line's head is (s.heads), and where each line could be cut for a shuffle (P.cut0).
 */
export function lineQuads(s, T, G, gone) {
  const quads = [];
  let pidc = 0,
    inkPid = null,
    topPid = null;
  for (const P of s.paths) {
    const L = P.L,
      at = progress(s, P, T);
    if ((at.k <= 0 && !at.tr) || (L.keep && G != null && !s.dest)) continue;
    const pid = ++pidc;
    if (L.keep) inkPid = pid;
    // spring: red draws the cherry blossoms, the focus, so it is painted last and at full strength, over every other colour
    if (L === LINES[1] && s.shapeName === 'spring') topPid = pid;
    P.cut0 = at.tr
      ? Math.max(
          0,
          P.s.findIndex(v => v >= at.cut)
        )
      : P.arc0 - 1;
    const stroke = brushAlong(s, P, at, T, gone),
      n = stroke.pts.length;
    if (n < 2) continue;
    s.heads[L.keep ? 'ink' : L.page || 'c' + LINES.indexOf(L)] = {
      p: stroke.pts[n - 1],
      col: L.col,
      t: T,
      set: smooth(clamp((T - at.tEnd + 0.4) / 1.0, 0, 1)),
    };
    ribbon(quads, stroke, soften(s, P, at.tr, stroke), L, pid);
  }
  return { quads, pidc, inkPid, topPid };
}
