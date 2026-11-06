// The squid that keeps you company down the rope: a pointed mantle with fins on top, big eyes, six short arms and two long tentacles
// that stream out with speed and pulse when it's idle; pink with dark outlines. (The Sound deck has its own pixel version.)
import { clamp, cubicAt, easeInOutCubic, smooth } from '../lib/math.js';
import { navDot } from '../lib/nav.js';
import { brushFly } from './brush.js';

/**
 * Draws the squid at (x, y). s: its scale, t: time, v: how fast it's moving (its arms stream), col: its fill, rot: its turn,
 * happy: ^^ eyes and a blush. o.shut closes its eyes; o.liftL / o.liftR (0..1.4) swing a tentacle out.
 */
export function drawSquid(ctx, x, y, s, t, v, col, rot = 0, happy = 0, o = {}) {
  const ga = ctx.globalAlpha;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(0, -6);
  ctx.rotate(rot + v * 0.1 * Math.cos(rot));
  ctx.translate(0, 6);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.2),
    stretch = 1 + 0.5 * Math.abs(v),
    sway = Math.sin(t * 2.2) * 1.2,
    lL = o.liftL || 0,
    lR = o.liftR || 0;
  const arm = (bx, sp, L, ph) => {
    const p = [[bx, 4]];
    for (let q = 1; q <= 6; q++) {
      const u = q / 6;
      p.push([
        bx + sp * u * (1.6 - 0.8 * pulse) + Math.sin(t * 3.6 + ph + u * 3) * 1.1 * u + sway * u,
        4 + u * L * stretch,
      ]);
    }
    return p;
  };
  const arms = [-3.6, -2.2, -0.8, 0.8, 2.2, 3.6].map((bx, k) => arm(bx, (k - 2.5) * 0.9, 7.5, k * 0.9)),
    tent = [arm(-1.5, -0.6 - lL * 3.4, 13 * (1 - 0.4 * lL), 4), arm(1.5, 0.6 + lR * 3.4, 13 * (1 - 0.4 * lR), 5)];
  const path = p => {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.stroke();
  };
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 3;
  arms.forEach(path);
  ctx.lineWidth = 2.4;
  tent.forEach(path);
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.6;
  arms.forEach(path);
  ctx.lineWidth = 1.1;
  tent.forEach(path);
  ctx.fillStyle = col;
  tent.forEach(p => {
    const e = p[p.length - 1];
    ctx.beginPath();
    ctx.ellipse(e[0], e[1], 1.5, 2.2, 0, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  });
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 1.3;
  const fw = 1 + 0.25 * Math.sin(t * 4);
  ctx.beginPath();
  ctx.moveTo(-3.2, -12);
  ctx.quadraticCurveTo(-9 * fw, -15, -4.2, -19);
  ctx.lineTo(0, -21);
  ctx.lineTo(4.2, -19);
  ctx.quadraticCurveTo(9 * fw, -15, 3.2, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -21);
  ctx.bezierCurveTo(5.5, -15, 6.2, -4, 5.4, 4.5);
  ctx.quadraticCurveTo(0, 6.5, -5.4, 4.5);
  ctx.bezierCurveTo(-6.2, -4, -5.5, -15, 0, -21);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (happy > 0.5) {
    const sg = Math.cos(rot + v * 0.1 * Math.cos(rot)) >= 0 ? 1 : -1;
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1.05;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    [-2.4, 2.4].forEach(ex => {
      ctx.beginPath();
      ctx.moveTo(ex - 1.6, 1 + 0.9 * sg);
      ctx.lineTo(ex, 1 - 1 * sg);
      ctx.lineTo(ex + 1.6, 1 + 0.9 * sg);
      ctx.stroke();
    });
    ctx.globalAlpha = ctx.globalAlpha * 0.55;
    ctx.fillStyle = 'rgb(236,84,124)';
    [-3.3, 3.3].forEach(ex => {
      ctx.beginPath();
      ctx.ellipse(ex, 1 + 2.6 * sg, 1.3, 0.8, 0, 0, 6.2832);
      ctx.fill();
    });
    ctx.globalAlpha = ctx.globalAlpha / 0.55;
  } else if (o.shut) {
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1.05;
    [-2.4, 2.4].forEach(ex => {
      ctx.beginPath();
      ctx.moveTo(ex - 1.6, 1.4);
      ctx.quadraticCurveTo(ex, 2.4, ex + 1.6, 1.4);
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-2.4, 1, 1.9, 0, 6.2832);
    ctx.arc(2.4, 1, 1.9, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.arc(-2.2, 1.4, 1.1, 0, 6.2832);
    ctx.arc(2.6, 1.4, 1.1, 0, 6.2832);
    ctx.fill();
  }
  ctx.globalAlpha = ga * 0.55;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-2.4, -10, 1.1, 3.4, 0.1, 0, 6.2832);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = ga;
}

/** Where the line that pours the squid's pink sets off: the red Sound dot in the menu (measured once). */
function squidSource(s) {
  if (!s.squidSource) {
    const p = navDot('sound'),
      r0 = s.root.getBoundingClientRect();
    if (p) s.squidSource = [p[0] - r0.left, p[1] - r0.top];
  }
  return s.squidSource;
}

/** The colour of that line: Sound's red where it leaves the dot, turning to the squid's pink as it arrives. */
function redToPink(ctx, A, B) {
  const gr = ctx.createLinearGradient(A[0], A[1], B[0], B[1]);
  gr.addColorStop(0, 'rgb(232,34,44)');
  gr.addColorStop(0.35, 'rgb(232,34,44)');
  gr.addColorStop(1, 'rgb(244,138,172)');
  return gr;
}

/**
 * The squid on the rope, this frame. It keeps beside the nearest entry, gliding over when that changes (it is on the rope, so it
 * moves with it as the page scrolls). When it first appears it swims in pale from the bottom right, loops, a line from the red Sound
 * dot pours in its pink (it smiles ^^), then it swims over to the rope.
 * f: the frame (see scene.js). rope: { post (the nearest entry, or -1), dt, moved (how far the rope slid this frame), LS (the rope's top) }.
 */
export function drawSquidOnRope(s, f, rope) {
  const { ctx, W, H, o } = f,
    { post: fN, dt: dtT, moved: dA, LS } = rope,
    pz = s.entryY;
  {
    const sqT = fN >= 0 ? pz[fN] : pz[0] || 0;
    s.squidY = s.squidY == null ? sqT : s.squidY + (sqT - s.squidY) * (1 - Math.exp(-dtT * 9));
    const hy = o.y + s.squidY,
      vis = s.introDone && hy > LS && hy < H + 30;
    s.squidAlpha = (s.squidAlpha || 0) + ((vis ? 1 : 0) - (s.squidAlpha || 0)) * (1 - Math.exp(-dtT * 5));
    if (s.squidIntro != null && s.squidIntro < 9) s.squidAlpha = Math.max(s.squidAlpha, 0.03);
    if (s.squidAlpha > 0.02) {
      const vel = dA / Math.max(dtT, 0.001);
      s.squidSpeed = (s.squidSpeed || 0) + (vel - (s.squidSpeed || 0)) * (1 - Math.exp(-dtT * 5));
      const sv = clamp(s.squidSpeed / 500, -1, 1),
        ox = o.x - 26 + Math.sin(s.time * 0.9) * 2,
        oy = hy - 6 - sv * 10 + Math.sin(s.time * 1.7) * 3;
      // on load, the red (Sound) dot pours into the pale squid: red + white paper = pink
      s.squidPour = (s.squidPour ?? 99) + (s.squidAlpha > 0.5 ? dtT : 0);
      const sk = s.squidPour,
        hk = smooth(clamp((sk - 0.2) / 1.0, 0, 1)),
        u0 = smooth(clamp((sk - 0.85) / 0.7, 0, 1)),
        fillK = smooth(clamp((sk - 0.95) / 0.8, 0, 1));
      if (hk > 0 && u0 < 1) {
        const A = squidSource(s);
        if (A) {
          const B2 = [ox, oy],
            C1 = [A[0] - 40, A[1] + 170],
            C2 = [B2[0] + 170, B2[1] - 70],
            ap = [];
          for (let q = 0; q <= 48; q++) ap.push(cubicAt(A, C1, C2, B2, q / 48));
          const pts = ap.slice(Math.floor(u0 * 48), Math.ceil(hk * 48) + 1);
          if (pts.length >= 2) brushFly(ctx, pts, 3.2, 0.95, redToPink(ctx, A, B2), 1.2, hk < 1);
        }
      }
      if (s.squidTurn == null) s.squidTurn = Math.PI;
      if (s.squidTurnTo == null) s.squidTurnTo = Math.PI;
      if (s.squidSpeed > 40) s.squidTurnTo = Math.PI;
      else if (s.squidSpeed < -40) s.squidTurnTo = 0;
      s.squidTurn += (s.squidTurnTo - s.squidTurn) * (1 - Math.exp(-dtT * 6));
      // arrival: swims in pale from the bottom right, loops, a line from the red Sound dot pours in its pink (it smiles ^^), then it swims over to the line
      if (s.squidIntro == null && vis) s.squidIntro = 0;
      if (s.squidIntro != null) s.squidIntro += dtT;
      const I = s.squidIntro ?? 99,
        SW = 1.7,
        RD0 = SW + 0.05,
        RD1 = RD0 + 1.3,
        LP0 = RD1 + 0.15,
        LP1 = LP0 + 2.1,
        GO0 = LP1,
        GO1 = GO0 + 1.5,
        ez = easeInOutCubic,
        wrapA = a => Math.atan2(Math.sin(a), Math.cos(a)),
        dirA = (dx, dy) => Math.atan2(dx, -dy),
        lerpA = (a, b, u) => a + wrapA(b - a) * u;
      const M = [W * 0.5 + 30, Math.max(H * 0.5 - 30, (s.anchor || 190) + 60)],
        bz3 = cubicAt;
      let dx = ox,
        dy = oy,
        dr = s.squidTurn,
        dv = clamp(s.squidSpeed / 500, -1, 1),
        fill = fillK,
        happy = I > RD0 + 1.0 && I < GO1 + 1.2 ? 1 : 0;
      const travel = (A, C1, C2, B, k, r0, r1) => {
        const p = bz3(A, C1, C2, B, k),
          q = bz3(A, C1, C2, B, Math.min(1, k + 0.02));
        dx = p[0];
        dy = p[1];
        const sa = k > 0.985 ? r1 : dirA(q[0] - p[0], q[1] - p[1] || -0.001);
        dr = lerpA(lerpA(r0, sa, smooth(clamp(k / 0.15, 0, 1))), r1, smooth(clamp((k - 0.8) / 0.2, 0, 1)));
        dv = 0.9 * Math.sin(Math.PI * Math.min(1, k * 1.1));
      };
      if (I < SW) {
        travel([W + 40, H + 50], [W * 0.86, H * 0.9], [M[0] + 120, M[1] + 120], M, ez(clamp(I / SW, 0, 1)), 0, 0);
        fill = 0;
      } else if (I < GO0) {
        dx = M[0];
        dy = M[1] + Math.sin(s.time * 1.7) * 3;
        dr = 0;
        dv = 0;
        fill = smooth(clamp((I - RD0 - 0.65) / 0.5, 0, 1));
        if (I >= LP0 && I < LP1) {
          const k = (I - LP0) / (LP1 - LP0),
            ph = Math.PI * 2 * Math.pow(k, 1.6),
            Rl = Math.max(50, Math.min(170, W * 0.2, (H - M[1] - 70) / 2)),
            c = [M[0], M[1] + Rl];
          dx = c[0] - Rl * Math.sin(ph);
          dy = c[1] - Rl * Math.cos(ph);
          const ta = dirA(-Math.cos(ph), Math.sin(ph)),
            bl = smooth(clamp(k / 0.12, 0, 1));
          dr = lerpA(0, ta, bl);
          dv = 0.9 * Math.min(1, k * 2.5);
        }
        if (I >= RD0 && I < RD1) {
          const A = squidSource(s);
          if (A) {
            const k = I - RD0,
              hk = ez(clamp(k / 0.75, 0, 1)),
              u0 = ez(clamp((k - 0.55) / 0.75, 0, 1)),
              B2 = [dx, dy - 6],
              C1 = [A[0] - 30, A[1] + 140],
              C2 = [B2[0] + 130, B2[1] - 90],
              ap = [];
            for (let q = 0; q <= 48; q++) ap.push(bz3(A, C1, C2, B2, q / 48));
            const pts = ap.slice(Math.floor(u0 * 48), Math.ceil(hk * 48) + 1);
            if (pts.length >= 2) brushFly(ctx, pts, 3, 0.95, redToPink(ctx, A, B2), 1.2, hk < 1);
          }
        }
      } else if (I < GO1) {
        // carries straight on out of the loop, heading left, and glides in to the rope
        const Rl = Math.max(50, Math.min(170, W * 0.2, (H - M[1] - 70) / 2)),
          D = GO1 - GO0,
          v = (Rl * 2 * Math.PI * 1.6) / (LP1 - LP0),
          hd = clamp((v * D) / 6, 20, Math.abs(M[0] - ox) * 0.8),
          A = M,
          B = [ox, oy],
          C1 = [M[0] - hd, M[1]],
          C2 = [B[0] + 90, B[1] + 30];
        const k = clamp((I - GO0) / D, 0, 1),
          e = 1 - (1 - k) * (1 - k),
          p = bz3(A, C1, C2, B, e),
          q = bz3(A, C1, C2, B, Math.min(1, e + 0.02));
        dx = p[0];
        dy = p[1];
        const sa = e > 0.985 ? s.squidTurn : dirA(q[0] - p[0], q[1] - p[1] || -0.001);
        dr = lerpA(sa, s.squidTurn, smooth(clamp((k - 0.7) / 0.3, 0, 1)));
        dv = 0.9 * (1 - k);
        fill = 1;
      } else fill = 1;
      const PK = [244, 138, 172],
        PA = [246, 241, 236],
        sqCol =
          'rgb(' + PK.map((v, i) => Math.round(PA[i] + (v - PA[i]) * fill * (1 - (s.squidDrain || 0)))).join(',') + ')';
      s.squidAt = [dx, dy];
      ctx.globalAlpha = I < GO1 ? 1 : s.squidAlpha;
      drawSquid(ctx, dx, dy, 1.35, s.time, dv, sqCol, dr, happy);
      ctx.globalAlpha = 1;
    }
  }
}
