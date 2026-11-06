// Leaving Home. For Freediving the lines paint that page's opening picture before they go: three of them draw the water's surface, one
// the buoy and one its flag, and then each carries on up into its dot in the menu. For Sound and the Library the lines fade and the
// dots fly: up to the menu (the Library), or they wait where they are and Sound drops them onto its beat pads.
import { deckGeo, padOf } from '../lib/deck-layout.js';
import { clamp, cubicAt, easeInOut, smooth } from '../lib/math.js';
import { NAV_Y, navAt } from '../lib/nav.js';
import { ropeX, surfaceY, waveY } from '../lib/surface.js';
import { lerpPt } from './curves.js';
import { INK } from './lines.js';

/** Where a menu dot lands leaving Home for Sound: just above the deck that rises in at the bottom, straight over its beat pad. */
export const sndDrop = (k, W, H) => {
  const G = deckGeo(W, H);
  return [padOf(G, k)[0], G.y0 - 36];
};

/**
 * Sets up the way out to Freediving: s.exits, the strokes that draw the surface, the buoy and the flag and then rise into the menu
 * (each from where its line's head is now), and s.flyFrom, the dots that simply fly up.
 */
export function exitsToFreediving(s) {
  const { W, H, cx, cy, R } = s.geo,
    SY = surfaceY(H);
  // strokes draw the surface, buoy and flag first, then carry on up into their menu dots
  const LX = ropeX(W),
    BS = clamp(W / 900, 0.75, 1),
    NX = k => navAt(W, k)[0],
    NY = NAV_Y;
  const bz = (A, C1, C2, B, n) => {
    const o = [];
    for (let i = 1; i <= n; i++) o.push(cubicAt(A, C1, C2, B, i / n));
    return o;
  };
  // start off-screen like the Freediving page's surface, so the line reaches the left edge
  const surf = k => {
    const o = [];
    for (let x = -20; x <= W - 6; x += 9) o.push([x, SY + waveY(x - LX, k, 0)]);
    return o;
  };
  const mkX = o => {
    const F = o.feat,
      f0p = F[0],
      lead = bz(o.start, o.c1, o.c2 || [f0p[0] - 50, f0p[1] - 110], f0p, 44),
      fl = F[F.length - 1],
      fp = F[F.length - 2],
      tl = Math.hypot(fl[0] - fp[0], fl[1] - fp[1]) || 1,
      E = o.end;
    const rise = bz(
      fl,
      o.r1 || [fl[0] + ((fl[0] - fp[0]) / tl) * 70, fl[1] + ((fl[1] - fp[1]) / tl) * 70 - 50],
      o.rx != null && o.rx < -100 ? [E[0] + o.rx, E[1] + 20] : [E[0] + (o.rx ?? -40), E[1] + 130],
      E,
      40
    );
    const pre = o.circ || [o.start],
      pts = pre.concat(lead, F.slice(1), rise),
      f0 = pre.length + lead.length - 1;
    return { ...o, pts, f0, f1: f0 + F.length - 1 };
  };
  const P = s.paths[0],
    circ = P.pts.slice(P.arc0),
    e = circ[circ.length - 1],
    pe = circ[circ.length - 2],
    tl = Math.hypot(e[0] - pe[0], e[1] - pe[1]) || 1,
    tg = [(e[0] - pe[0]) / tl, (e[1] - pe[1]) / tl];
  let cl = 0;
  for (let i = 1; i < circ.length; i++) cl += Math.hypot(circ[i][0] - circ[i - 1][0], circ[i][1] - circ[i - 1][1]);
  const hd = k => (s.heads && s.heads[k] ? s.heads[k].p.slice() : [cx, cy + R]);
  const s0 = surf(0),
    s1 = surf(1),
    s2 = surf(2),
    B = [LX, SY + waveY(0, 0, 0) - 2];
  const coil = [];
  for (let q = 0; q <= 10; q++) {
    const u = q / 10;
    coil.push([B[0] + (-17 + 34 * u) * BS, B[1] + Math.sin(u * Math.PI) * 2 * BS]);
  }
  const flag = [];
  for (let q = 0; q <= 8; q++) {
    const u = q / 8;
    flag.push([B[0] + (1 + 20 * u) * BS, B[1] + (-39 + Math.sin(u * Math.PI) * 1.2) * BS]);
  }
  s.exits = [
    mkX({
      col: INK,
      k: 0,
      d: 0,
      dur: 3.1,
      ink: 1,
      circ,
      circW: P.wt.slice(P.arc0),
      h0: cl,
      start: e,
      c1: [e[0] + tg[0] * R * 1.2, e[1] + tg[1] * R * 1.2],
      c2: [-30, s0[0][1] - 90],
      feat: s0,
      end: [NX('home'), NY],
      rx: 40,
      w: 8,
      tw: 3.2,
      ta: 0.9,
    }),
    mkX({
      col: [0, 158, 224],
      k: 1,
      d: 0.35,
      dur: 2.95,
      start: hd('freediving'),
      c1: [hd('freediving')[0] - 60, hd('freediving')[1] + 90],
      c2: [-20, s1[0][1] - 70],
      feat: s1,
      end: [NX('freediving'), NY],
      w: 6,
      tw: 1.8,
      ta: 0.55,
    }),
    mkX({
      col: [34, 86, 186],
      k: 2,
      d: 0.6,
      dur: 2.7,
      start: [cx + Math.cos(2.3) * R, cy + Math.sin(2.3) * R],
      c1: [cx + Math.cos(2.3) * R * 2.2, cy + Math.sin(2.3) * R * 2],
      c2: [-20, s2[0][1] - 60],
      feat: s2,
      end: [NX('freediving'), NY],
      w: 6.5,
      tw: 1.1,
      ta: 0.3,
    }),
    mkX({
      col: [255, 118, 18],
      k: 3,
      d: 0.25,
      dur: 2.7,
      start: hd('c4'),
      c1: [hd('c4')[0], hd('c4')[1] + 120],
      c2: [B[0] + 120, B[1] - 90],
      feat: coil,
      end: [NX('c4'), NY],
      r1: [B[0] + 30, Math.max(40, B[1] - 170)],
      rx: -260,
      w: 7,
      tw: 6.5 * BS,
      ta: 1,
    }),
    mkX({
      col: [232, 34, 44],
      k: 4,
      d: 0.5,
      dur: 2.6,
      start: hd('sound'),
      c1: [hd('sound')[0], hd('sound')[1] - 100],
      c2: [B[0] - 30, B[1] - 120],
      feat: flag,
      end: [NX('sound'), NY],
      r1: [B[0] + 20, Math.max(30, B[1] - 160)],
      rx: -260,
      w: 6.5,
      tw: 4.6 * BS,
      ta: 1,
    }),
  ];
  s.flyFrom = {};
  ['library', 'c5', 'c6'].forEach(k => {
    const h = s.heads && s.heads[k];
    if (h) s.flyFrom[k] = { p: h.p.slice(), col: h.col };
  });
}

/**
 * The exit strokes as paint, for this frame (added to made.quads; see strokes.js). G: seconds into leaving. Also notes where each
 * stroke's head is (s.exitHeads), which is drawn as its dot.
 */
export function exitQuads(s, made, G, W, H) {
  const { quads, inkPid } = made,
    LX = ropeX(W),
    SY = surfaceY(H);
  let pidc = made.pidc;
  s.exitHeads = [];
  if (G != null && s.exits)
    for (const X of s.exits) {
      const pid = X.ink && inkPid != null ? inkPid : 'x' + ++pidc;
      const all = X.pts.slice(),
        sw = X.pts.length - 1,
        sl = [0];
      for (let i = 1; i < all.length; i++)
        sl[i] = sl[i - 1] + Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]);
      const len = sl[all.length - 1],
        swL = sl[sw],
        kx = clamp((G - X.d) / (X.dur || 1.5), 0, 1);
      if (kx <= 0 && !X.h0) continue;
      const h0 = X.h0 || 0,
        nC = X.circ ? X.circ.length : 0,
        s0 = nC ? sl[nC - 1] : 0,
        TLx = h0 ? h0 + 60 + (460 - h0 - 60) * smooth(kx) : 460;
      const hh =
          h0 +
          (len - h0) *
            (X.f0 != null ? 0.65 * easeInOut(kx) + 0.35 * (1 - Math.pow(1 - kx, 2)) : 1 - Math.pow(1 - kx, 2.2)),
        col = `rgb(${X.col[0]},${X.col[1]},${X.col[2]})`;
      const P2 = [],
        W2 = [],
        A2 = [],
        Z2 = [],
        I2 = [];
      if (X.f0 != null && X.tA == null && hh >= sl[X.f0]) X.tA = G;
      for (let i = 0; i < all.length; i++) {
        let sv = sl[i],
          pt = all[i],
          tipEnd = false;
        const inF = X.f0 != null && i >= X.f0 && i <= X.f1,
          tailCut = len * smooth(clamp((G - X.d - (X.dur || 1.5) + 0.1) / 0.7, 0, 1));
        if (sv > hh) {
          if (!i || sl[i - 1] >= hh) break;
          pt = lerpPt(all[i - 1], pt, (hh - sl[i - 1]) / (sv - sl[i - 1]));
          sv = hh;
          tipEnd = true;
        }
        if (!inF && sv < tailCut) {
          const s1 = sl[i + 1];
          if (s1 == null || s1 <= tailCut) continue;
          pt = lerpPt(pt, all[i + 1], (tailCut - sv) / (s1 - sv));
          sv = tailCut;
        }
        const behind = hh - sv,
          onW = X.f0 != null ? inF : i >= sw,
          onC = i < nC,
          u = clamp((sv - s0) / (swL - s0), 0, 1);
        const z =
          onW || onC ? 0.05 : Math.min(X.f0 != null ? 0.3 : 9, -0.7 + 1.9 * Math.pow(Math.sin(Math.PI * u), 1.2));
        const sc = Math.pow(3.4, z),
          tip = Math.sqrt(clamp(behind / 26, 0.04, 1)),
          blend =
            X.f0 != null
              ? onW
                ? 1
                : smooth(clamp(1 - Math.min(Math.abs(i - X.f0), Math.abs(i - X.f1)) / 10, 0, 1))
              : smooth(clamp((sv - swL + 160) / 160, 0, 1));
        const w =
          (X.w * sc * (1 - blend) + X.tw * (0.84 + 0.16 * Math.sin(sv * 0.045)) * blend) *
          tip *
          Math.sqrt(clamp(sv / 60, 0.1, 1));
        let a = onW ? X.ta : clamp(1 - behind / TLx, 0, 1) * (0.5 + 0.5 * clamp((z + 1) / 2, 0, 1));
        if (!onW && blend > 0) a = a * (1 - blend) + X.ta * blend * clamp(1 - behind / TLx, 0.4, 1);
        if (X.ink && !onW) a = Math.min(1, a * 1.1);
        if (onC && X.circW && X.circW[i] < 0.2) a = 0;
        P2.push(pt);
        W2.push(w);
        A2.push(a);
        Z2.push(z + (onW ? -2 : 0));
        I2.push(i);
        if (tipEnd) break;
      }
      const n2 = P2.length;
      for (let i = 0; i < n2 - 1; i++) {
        if (I2[i + 1] !== I2[i] + 1 || A2[i] <= 0 || A2[i + 1] <= 0) continue;
        // angle each end from its true neighbours only: across an erased stretch the next kept point can be far away (the dot), which would twist the end
        const q0 = P2[i],
          q1 = P2[i + 1],
          q2 = i + 2 < n2 && I2[i + 2] === I2[i + 1] + 1 ? P2[i + 2] : q1,
          pr = i > 0 && I2[i - 1] === I2[i] - 1 ? P2[i - 1] : q0;
        const t0x = q1[0] - pr[0],
          t0y = q1[1] - pr[1],
          l0 = Math.hypot(t0x, t0y) || 1,
          t1x = q2[0] - q0[0],
          t1y = q2[1] - q0[1],
          l1 = Math.hypot(t1x, t1y) || 1;
        const n0 = [-t0y / l0, t0x / l0],
          n1 = [-t1y / l1, t1x / l1],
          h0b = W2[i] / 2,
          h1b = W2[i + 1] / 2;
        quads.push({
          z: (Z2[i] + Z2[i + 1]) / 2 + (X.ink ? 0.02 : 0),
          a: (A2[i] + A2[i + 1]) / 2,
          col,
          rgb: X.col,
          pid,
          sub: 0,
          mul: !X.ink,
          q: [
            [q0[0] - n0[0] * h0b, q0[1] - n0[1] * h0b],
            [q1[0] - n1[0] * h1b, q1[1] - n1[1] * h1b],
            [q1[0] + n1[0] * h1b, q1[1] + n1[1] * h1b],
            [q0[0] + n0[0] * h0b, q0[1] + n0[1] * h0b],
          ],
        });
      }
      // once a surface line has lifted off its right end towards its dot, the surface carries on out past the right edge, as on the Freediving page
      if (X.k <= 2 && X.f1 != null) {
        if (X.tB == null && hh >= sl[X.f1] + 40) X.tB = G;
        if (X.tB != null) {
          const e0 = all[X.f1],
            xr = e0[0] + (W + 20 - e0[0]) * smooth(clamp((G - X.tB) / 0.5, 0, 1)),
            ep = [e0];
          for (let x = Math.ceil((e0[0] + 1) / 9) * 9; x < xr; x += 9) ep.push([x, SY + waveY(x - LX, X.k, 0)]);
          if (xr > e0[0] + 1) ep.push([xr, SY + waveY(xr - LX, X.k, 0)]);
          // width keeps the line's own rhythm, measured along the stroke, so the join doesn't show
          let se = sl[X.f1];
          for (let i = 0; i < ep.length - 1; i++) {
            const q0 = ep[i],
              q1 = ep[i + 1],
              dd = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1,
              nx = -(q1[1] - q0[1]) / dd,
              ny = (q1[0] - q0[0]) / dd,
              tipR = Math.sqrt(clamp((xr - q1[0]) / 26, 0.04, 1)),
              hw0 = (X.tw * (0.84 + 0.16 * Math.sin(se * 0.045))) / 2,
              hw1 = ((X.tw * (0.84 + 0.16 * Math.sin((se += dd) * 0.045))) / 2) * (xr >= W + 19 ? 1 : tipR);
            quads.push({
              z: -1.95 + (X.ink ? 0.02 : 0),
              a: X.ta,
              col,
              rgb: X.col,
              pid,
              sub: 0,
              mul: !X.ink,
              q: [
                [q0[0] - nx * hw0, q0[1] - ny * hw0],
                [q1[0] - nx * hw1, q1[1] - ny * hw1],
                [q1[0] + nx * hw1, q1[1] + ny * hw1],
                [q0[0] + nx * hw0, q0[1] + ny * hw0],
              ],
            });
          }
        }
      }
      // both blues share the Freediving dot: as they arrive they take on its own blue, so they merge into one dot instead of flickering between two
      const hc =
        X.k === 1 || X.k === 2
          ? `rgb(${X.col.map((v, j) => Math.round(v + ([24, 88, 224][j] - v) * smooth(clamp((kx - 0.8) / 0.2, 0, 1)))).join(',')})`
          : col;
      if (P2.length) {
        const hp = P2[P2.length - 1],
          dk = smooth(clamp((G - X.d - (X.dur || 1.5) + 0.1) / 0.7, 0, 1));
        s.exitHeads = s.exitHeads || [];
        s.exitHeads.push({ p: hp, col: hc, r: (X.ink ? 8 : 7) + ((X.k === 3 ? 5.5 : 8) - (X.ink ? 8 : 7)) * dk });
      }
    }
}

/**
 * The buoy and its flag fill with colour from where their lines arrive, their outlines drawing in with it, to match the Freediving
 * page's buoy exactly.
 */
export function drawBuoy(s, ctx, G, W, H) {
  const LX = ropeX(W),
    SY = surfaceY(H);
  {
    const BS = clamp(W / 900, 0.75, 1),
      Xb = s.exits.find(x => x.k === 3),
      Xf = s.exits.find(x => x.k === 4);
    const kB = Xb && Xb.tA != null ? smooth(clamp((G - Xb.tA) / 0.6, 0, 1)) : 0,
      kF = Xf && Xf.tA != null ? smooth(clamp((G - Xf.tA) / 0.5, 0, 1)) : 0,
      kP = Math.max(kF, Xb && Xb.tA != null ? smooth(clamp((G - Xb.tA - 0.35) / 0.5, 0, 1)) : 0);
    if (kB > 0 || kF > 0) {
      ctx.save();
      ctx.translate(LX, SY + waveY(0, 0, 0) - 2);
      ctx.scale(BS, BS);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1;
      if (kP > 0) {
        ctx.strokeStyle = '#141414';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(0, -12 - 34 * kP);
        ctx.stroke();
      }
      if (kF > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(1, -39, 27 * kF, 0, 6.2832);
        ctx.clip();
        ctx.fillStyle = 'rgb(232,34,44)';
        ctx.fillRect(0, -46, 22, 14);
        ctx.strokeStyle = '#f6efe0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(1.8, -44.2);
        ctx.lineTo(20.2, -33.8);
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = kF;
        ctx.strokeStyle = '#141414';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(0, -46, 22, 14);
        ctx.globalAlpha = 1;
      }
      if (kB > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(-17, 0, 50 * kB, 0, 6.2832);
        ctx.clip();
        ctx.fillStyle = 'rgb(255,118,18)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 13, 0, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = '#f6efe0';
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 3.5, 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = kB;
        ctx.strokeStyle = '#141414';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 3.5, 0, 0, 6.2832);
        ctx.stroke();
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 13, 0, 0, 6.2832);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }
}

/** The dots on their way to the menu (or, for Sound, waiting where they are). */
export function drawFlyingDots(s, ctx, G, W, H) {
  ['sound', 'library', 'c4', 'c5', 'c6', 'freediving', 'ink'].forEach((k, i) => {
    const f = s.flyFrom[k];
    if (!f) return;
    const toSnd = /\/sound\//.test(s.dest || ''),
      P0 = f.p,
      kk = easeInOut(clamp((G - 0.15 - i * 0.07) / 1.4, 0, 1));
    // to Sound each dot waits where it is while the strokes fade (Sound then drops it onto its beat pad); anywhere else it rises to the menu at the top
    if (toSnd) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgb(${f.col[0]},${f.col[1]},${f.col[2]})`;
      ctx.beginPath();
      ctx.arc(P0[0], P0[1], /^c\d/.test(k) ? 5.5 : 8, 0, 6.2832);
      ctx.fill();
      return;
    }
    const P1 = toSnd ? sndDrop(k, W, H) : navAt(W, k),
      C1 = toSnd ? [P0[0], P0[1] + (P1[1] - P0[1]) * 0.45] : [P0[0], P0[1] - 90],
      C2 = toSnd ? [P1[0], P1[1] - 90] : [P1[0], P1[1] + 70],
      bz = u => cubicAt(P0, C1, C2, P1, u);
    const col = `rgb(${f.col[0]},${f.col[1]},${f.col[2]})`,
      tail = Math.max(0, kk - 0.35);
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    for (let q = 0; q < 24; q++) {
      const u0 = tail + ((kk - tail) * q) / 24,
        u1 = tail + ((kk - tail) * (q + 1)) / 24,
        a0 = bz(u0),
        a1 = bz(u1);
      ctx.globalAlpha = 0.85 * (q / 24) * Math.sin(Math.PI * Math.min(1, kk * 1.15));
      ctx.lineWidth = 1.5 + (3.5 * q) / 24;
      ctx.beginPath();
      ctx.moveTo(a0[0], a0[1]);
      ctx.lineTo(a1[0], a1[1]);
      ctx.stroke();
    }
    const p = bz(kk);
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 7 + (/^c\d/.test(k) ? -1.5 : 1) * kk, 0, 6.2832);
    ctx.fill();
  });
}
