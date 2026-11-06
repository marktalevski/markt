// One frame of the dive, painted in order: paper, the water (with its light, snow and bubbles), the surface lines, the rope with the
// buoy, the orange line and the squid, and the paper's grain over everything.
import { clamp, smooth } from '../lib/math.js';
import { navDotEl } from '../lib/nav.js';
import { ropeX, surfaceY, waveY } from '../lib/surface.js';
import { drawHandedDots, surfaceDrawn } from './arrival.js';
import { absorb, brush } from './brush.js';
import { colourLines, drawBuoy, paintBuoy, paintFill, pulseDot } from './buoy.js';
import { fillColour, metresToY, yToMetres } from './layout.js';
import { HUES, PAPER, colourIn, mix, rgb, waterAt } from './palette.js';
import { drawSquidOnRope } from './squid.js';

// the rope down from the buoy, wide enough for its twist to show; one warm sand colour all the way down, with a thin dark edge so it
// reads on the pale surface water and the deep blue alike
const ROPE_W = 3.6,
  ROPE_SAND = '#e9dcbc',
  ROPE_EDGE = '#141414';
/** Leaving for Sound or the Library: how long the buoy's and flag's colours take to drain into their dots before the water fades (s). */
export const PAGE_DRAIN = 0.85;
/** Leaving for Home: how long each colour takes to gather at the centre, circle there with the others and go up into its dot (s). */
export const SWIRL = 3.6;

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
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // the surface lines and the colour threads go on a canvas of their own, above the water's
  const wcv = s.waveCanvas,
    wx = wcv.getContext('2d');
  if (wcv.width !== cv.width || wcv.height !== cv.height) {
    wcv.width = cv.width;
    wcv.height = cv.height;
  }
  wx.setTransform(1, 0, 0, 1, 0, 0);
  wx.clearRect(0, 0, wcv.width, wcv.height);
  wx.setTransform(dpr, 0, 0, dpr, 0, 0);
  wx.lineCap = 'round';
  wx.lineJoin = 'round';

  // the frame: what every part below draws from. o: where the rope meets the surface on screen; sy: the surface's height; al: how far
  // down the rope the view has slid; T: seconds into the arrival; intro: still arriving; SY(m, pf): the height of depth m on screen
  // for something that slides at pf times the rope's speed (parallax)
  const o = s.origin || { x: ropeX(W), y: surfaceY(H) },
    an = s.anchor ?? surfaceY(H),
    al = s.along ?? 0;
  const f = {
    ctx,
    wx,
    W,
    H,
    t: s.time,
    T: s.introT,
    intro: !s.introDone,
    o,
    sy: o.y,
    al,
    SY: (m, pf) => an + (metresToY(s, m) - al) * pf,
  };

  ctx.fillStyle = rgb(PAPER);
  ctx.fillRect(0, 0, W, H);
  drawHaze(s, f);
  drawWater(s, f);
  drawColourThreads(s, f);
  drawSurface(s, f);
  if (f.intro && s.handed) drawHandedDots(s, wx, f.T, f.sy, o, f.t, W);
  drawRope(s, f);

  if (!s.grainPattern) s.grainPattern = ctx.createPattern(s.grain, 'repeat');
  // arriving from Home, start at Home's grain strength and deepen to this page's as the water rises
  const grainAlpha = s.fromHome && f.intro ? 0.35 + 0.05 * smooth(clamp((f.T - s.tideStart) / 1.8, 0, 1)) : 0.4;
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = grainAlpha;
  ctx.fillStyle = s.grainPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/** A soft tint in the air just above the surface, which comes in as the dive goes deeper. */
function drawHaze(s, f) {
  const { ctx, W, sy } = f;
  {
    const ur = colourIn(s, 'r'),
      uy = colourIn(s, 'y');
    if ((ur > 0 || uy > 0) && sy > -40) {
      const g3 = ctx.createLinearGradient(0, sy - 220, 0, sy + 10);
      const c = mix(HUES.r, HUES.b, uy * 0.5);
      g3.addColorStop(0, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0)`);
      g3.addColorStop(1, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${0.3 * Math.max(ur, uy)})`);
      ctx.fillStyle = g3;
      ctx.fillRect(0, sy - 220, W, 232);
    }
  }
}

/** The water: its body (paler at the top, darker with depth), light shafts near the surface, drifting snow, streaks and bubbles. */
function drawWater(s, f) {
  const { ctx, W, H, t, intro, o, sy, al, SY } = f,
    mNow = yToMetres(s, Math.max(0, al));
  if (sy < H + 40) {
    const wb = intro ? sy + (H - sy + 60) : H + 60;
    ctx.save();
    if (s.tideY) ctx.translate(0, s.tideY);
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 12) {
      const y = sy + waveY(x - o.x, 0, t) - 3 + Math.sin(x * 0.07 + 1) * 2.5;
      x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    for (let x = W + 20; x >= -20; x -= 16) ctx.lineTo(x, wb + Math.sin(x * 0.02) * 14 + Math.sin(x * 0.05 + 2) * 6);
    ctx.closePath();
    const ga = Math.max(sy - 10, -10),
      gb = H + 10,
      gr = ctx.createLinearGradient(0, ga, 0, gb);
    for (let k = 0; k <= 10; k++) gr.addColorStop(k / 10, rgb(waterAt(yToMetres(s, ga + ((gb - ga) * k) / 10 - o.y))));
    ctx.globalAlpha = 1;
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.clip();

    // far marine snow
    const snowCol = rgb(mix([240, 246, 250], HUES.y, colourIn(s, 'y') * 0.8));
    for (const p of s.snow)
      if (!p.near) {
        const y = ((((p.y * H * 2 - al * 0.4 - t * 3) % (H * 2)) + H * 2) % (H * 2)) - H * 0.5;
        if (y < sy + 20 || y > H) continue;
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = snowCol;
        ctx.beginPath();
        ctx.arc(p.x * W, y, p.r * 0.7, 0, 6.2832);
        ctx.fill();
      }
    // light shafts
    const surf = clamp(1 - mNow / 16, 0, 1);
    if (surf > 0.01) {
      if (!s.shaft) {
        const c = document.createElement('canvas');
        c.width = 160;
        c.height = 520;
        const x = c.getContext('2d');
        x.filter = 'blur(22px)';
        const g = x.createLinearGradient(0, 30, 0, 500);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(55, 30);
        x.lineTo(105, 30);
        x.lineTo(130, 500);
        x.lineTo(30, 500);
        x.closePath();
        x.fill();
        s.shaft = c;
      }
      const top = SY(0, 0.55);
      for (let i = 0; i < 5; i++) {
        const x = W * (0.08 + i * 0.2) + Math.sin(t * 0.09 + i * 1.7) * W * 0.03,
          sw = W * (0.12 + 0.05 * Math.sin(i * 2.3)),
          op = 0.5 + 0.5 * Math.sin(t * 0.25 + i * 2.1);
        ctx.globalAlpha = surf * (0.1 + 0.08 * op) * (1 + 0.5 * colourIn(s, 'y'));
        ctx.save();
        ctx.translate(x, top - 20);
        ctx.transform(1, 0, 0.18, 1, 0, 0);
        ctx.drawImage(s.shaft, -sw / 2, 0, sw, H * 0.75);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // surface streaks
    for (const sk of s.streaks) {
      const yy = SY(sk.m, 1);
      if (yy < -20 || yy > H + 20) continue;
      const pts = [];
      for (let x = -20; x < W * 0.7; x += 24) pts.push([x, yy + Math.sin(x * 0.009 + t * 0.5 + sk.ph) * 9]);
      brush(ctx, pts, 2.6, 0.28, sk.ph * 100, true, true, '#f6efe0');
    }
    // bubbles along the line
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = '#f6efe0';
    for (const b of s.bubbles) {
      const yy = H - ((b.y + t * b.v) % 1) * (H - Math.max(0, sy));
      if (yy < sy + 10) continue;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(o.x + b.x + Math.sin(t + b.ph) * 3, yy, b.r, 0, 6.2832);
      ctx.stroke();
    }
    // near marine snow (fastest layer)
    for (const p of s.snow)
      if (p.near) {
        const y = ((((p.y * H * 2 - al * 1.6 - t * 6) % (H * 2)) + H * 2) % (H * 2)) - H * 0.5;
        if (y < sy + 20 || y > H) continue;
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = snowCol;
        ctx.beginPath();
        ctx.arc(p.x * W, y, p.r * 1.8, 0, 6.2832);
        ctx.fill();
      }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/**
 * The buoy's, flag's and squid's colours on their way to the menu as the page leaves (drawn on the surface canvas), and how far each
 * has drained (s.buoyDrain, s.flagDrain, s.squidDrain: 0 full colour, 1 bare).
 */
function drawColourThreads(s, f) {
  const WX = f.wx;
  s.buoyDrain = 0;
  s.flagDrain = 0;
  if (!s.red) {
    const d = navDotEl('sound');
    if (d) {
      const m = getComputedStyle(d).backgroundColor.match(/\d+/g);
      if (m) s.red = m.slice(0, 3).map(Number);
    }
  }
  // leaving for Home: each colour lifts off as a soft bead of light and drifts up into its menu dot, which breathes once as it takes it in
  s.squidDrain = 0;
  // leaving for Sound or the Library: the buoy's colour runs off along its top into the orange dot, the flag's into the red one, each by the
  // plain rising route (no swirl), and the bare buoy and flag are left behind as the water fades
  if (s.pageLeave && s.pageLeave.nav && s.buoyAt) {
    const lt = s.pageLeave.t,
      B = s.buoyAt,
      NV = s.pageLeave.nav,
      D = PAGE_DRAIN - 0.1;
    s.buoyDrain = smooth(clamp(lt / 0.5, 0, 1));
    s.flagDrain = smooth(clamp((lt - 0.08) / 0.5, 0, 1));
    // once both lines are in (g past 1, absorb draws nothing) there is nothing left to draw or pulse
    if (lt < D + 0.08) {
      const CL = colourLines(s, B);
      if (NV.c4) {
        absorb(WX, CL.c4.src, NV.c4, lt / D, CL.c4);
        pulseDot('c4', lt / D);
      }
      if (NV.sound) {
        absorb(WX, CL.sound.src, NV.sound, (lt - 0.08) / D, CL.sound);
        pulseDot('sound', (lt - 0.08) / D);
      }
    }
  }
  if (s.homeLeaveT != null && s.menuAt && s.menuAt.c4 && s.buoyAt) {
    const lt = s.homeLeaveT,
      B = s.buoyAt;
    const RC = s.red || [232, 34, 44],
      tB = 0.1,
      tF = 0.2,
      tS = 0.4;
    s.buoyDrain = smooth(clamp((lt - tB) / 0.7, 0, 1));
    s.flagDrain = smooth(clamp((lt - tF) / 0.7, 0, 1));
    s.squidDrain = smooth(clamp((lt - tS) / 0.7, 0, 1));
    // buoy: off along the top of its float, left to right; flag: along its top edge; squid: up through its body
    const CL = colourLines(s, B);
    absorb(WX, CL.c4.src, s.menuAt.c4, (lt - tB) / SWIRL, { ...CL.c4, sway: 18, ring: 74 });
    pulseDot('c4', (lt - tB) / SWIRL);
    if (s.menuAt.sound) {
      absorb(WX, CL.sound.src, s.menuAt.sound, (lt - tF) / SWIRL, { ...CL.sound, sway: 10, ring: 56 });
      if (s.squidAt) {
        const [qx, qy] = s.squidAt;
        absorb(
          WX,
          [
            [qx, qy + 22],
            [qx, qy + 8],
            [qx, qy - 8],
            [qx, qy - 20],
          ],
          s.menuAt.sound,
          (lt - tS) / SWIRL,
          { w: 3.4, colA: [244, 138, 172], colB: RC, lift: 50, sway: 24, ph: 3.1, ring: 146 }
        );
      }
      pulseDot('sound', Math.max((lt - tF) / SWIRL, (lt - tS) / SWIRL));
    }
  }
}

/** The three surface lines: black, light blue and deep blue. Arriving they draw in; leaving for Home each is reeled into its dot. */
function drawSurface(s, f) {
  const { wx: WX, W, H, t, T, intro, o, sy } = f;
  if (sy > -80 && sy < H + 80) {
    [
      [3.2, 0.9],
      [1.8, 0.55],
      [1.1, 0.3],
    ].forEach((st, k) => {
      const rev =
        intro && s.handed ? surfaceDrawn(T, k) : intro && !s.skipWaves ? smooth(clamp((T - k * 0.25) / 1.6, 0, 1)) : 1;
      if (rev <= 0) return;
      const xe = -20 + (W + 40) * rev;
      let pts = [];
      if (s.homeLeaveT != null && s.menuAt) {
        reelWave(s, WX, k, st, sy, o, t, W);
        return;
      }
      for (let x = -20; x <= xe; x += 10) pts.push([x, sy + waveY(x - o.x, k, t)]);
      pts.push([xe, sy + waveY(xe - o.x, k, t)]);
      brush(
        WX,
        pts,
        st[0],
        st[1],
        k * 200,
        true,
        rev < 1,
        k === 0 ? '#141414' : k === 1 ? 'rgb(0,158,224)' : 'rgb(34,86,186)'
      );
    });
  }
}

/** A surface line (k: 0, 1 or 2) leaving for Home, reeled in from its right-hand end. */
function reelWave(s, ctx, k, st, sy, o, t, W) {
  const lt = s.homeLeaveT,
    NP = s.menuAt,
    D = NP[k === 0 ? 'home' : 'freediving'] || [W - 40, 28],
    T0 = [0.3, 0.42, 0.54][k],
    DUR = SWIRL,
    g = (lt - T0) / DUR;
  const src = [];
  for (let x = -20; x <= W - 6; x += 10) src.push([x, sy + waveY(x - o.x, k, t)]);
  const col = [
    [20, 20, 20],
    [0, 158, 224],
    [34, 86, 186],
  ][k];
  if (g <= 0) {
    brush(ctx, src, st[0], st[1], k * 200, true, false, rgb(col));
    return;
  }
  absorb(ctx, src, D, g, {
    w: st[0] * 1.4,
    a: Math.min(1, st[1] + 0.35),
    colA: col,
    colB: col,
    lift: 60 + 30 * k,
    sway: [10, 22, 16][k],
    ph: k * 1.3,
    ring: [92, 128, 110][k],
  });
  pulseDot(k ? 'freediving' : 'home', g);
}

/** The rope and what hangs on it: the buoy at the top, the orange line down to the nearest entry, the squid, the weight at the end. */
function drawRope(s, f) {
  const { ctx, W, H, t, T, intro, o, sy } = f;
  // (the rope stays at the surface while the water rises in, and sinks with the water on the way out to Home)
  ctx.save();
  if (s.tideY && s.homeLeaveT != null) ctx.translate(0, s.tideY);
  const bob = Math.sin(t * 1.3) * 2,
    BS = clamp(W / 900, 0.75, 1),
    BY = sy + waveY(0, 0, t) - 2 + bob,
    LS = BY + 12 * BS;
  if (intro) {
    // arriving: the buoy drops in, then the rope runs down from it
    const d = smooth(clamp((T - s.tideEnd) / 1.0, 0, 1)),
      drop = s.fromHome ? 1 : smooth(clamp((T - s.dropT) / 0.4, 0, 1));
    if (d > 0) {
      const end = LS + (H + 20 - LS) * d,
        pts = [];
      for (let y = LS; y <= end; y += 15) pts.push([o.x + Math.sin((y - o.y) * 0.02) * 0.7, y]);
      pts.push([o.x + Math.sin((end - o.y) * 0.02) * 0.7, end]);
      brush(ctx, pts, ROPE_W + 1.8, 0.85, LS - o.y, false, d < 1, ROPE_EDGE);
      brush(ctx, pts, ROPE_W - 0.2, 1, LS - o.y, false, d < 1, ROPE_SAND);
    }
    // (the larger of the two: leaving for Sound or the Library mid-way drains whatever colour the paint has put in so far)
    if (s.homeLeaveT == null) {
      s.buoyDrain = Math.max(s.buoyDrain, 1 - paintFill(s, T, 'c4'));
      s.flagDrain = Math.max(s.flagDrain, 1 - paintFill(s, T, 'sound'));
    }
    if (drop > 0) {
      s.buoyAt = [o.x, BY - (1 - drop) * 60, BS * drop];
      drawBuoy(s, ctx, o.x, BY - (1 - drop) * 60, BS * drop, t);
    }
    if (s.homeLeaveT == null) paintBuoy(s, ctx, T, [o.x, BY, BS]);
  } else {
    const a0 = Math.max(LS, -20),
      a1 = Math.min(o.y + s.ropeEnd, H + 20);
    // one stroke all the way down (drawn in pieces, every join showed as a band across the rope): its dark edge, then the sand over it
    if (a1 > a0) {
      const pts = [];
      for (let y = a0; y < a1; y += 15) pts.push([o.x + Math.sin((y - o.y) * 0.02) * 0.7, y]);
      pts.push([o.x + Math.sin((a1 - o.y) * 0.02) * 0.7, a1]);
      brush(ctx, pts, ROPE_W + 1.8, 0.85, a0 - o.y, false, false, ROPE_EDGE);
      brush(ctx, pts, ROPE_W - 0.2, 1, a0 - o.y, false, false, ROPE_SAND);
    }
    if (a1 > a0) ropeTwist(s, ctx, o, a0, a1, LS);
    drawSquidOnRope(s, f, drawOrangeLine(s, f, LS));
    const be = o.y + s.ropeEnd;
    if (be > -20 && be < H + 40) {
      ctx.strokeStyle = s.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(o.x, be + 4, 4, 0, 6.2832);
      ctx.stroke();
      ctx.fillStyle = '#141414';
      ctx.fillRect(o.x - 14, be + 8, 28, 10);
      ctx.strokeStyle = '#f6efe0';
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x - 14, be + 8, 28, 10);
    }
    if (BY > -60 && BY < H + 40) {
      s.buoyAt = [o.x, BY, BS];
      drawBuoy(s, ctx, o.x, BY, BS, t);
    } else s.buoyAt = null;
  }
  ctx.restore();
}

/**
 * The orange line: it runs down the rope from the surface into the nearest entry's dot, so it's clear which entry is selected; when
 * the nearest changes it glides on to the new one (it never stops between entries). Gives what the squid needs to follow it.
 */
function drawOrangeLine(s, f, LS) {
  const { ctx, H, o, al } = f;
  const pz = s.entryY,
    nowT = performance.now(),
    dtT = Math.min(0.05, (nowT - (s.ropeClock || nowT)) / 1000);
  s.ropeClock = nowT;
  const head = Math.max(0, al),
    dA = head - (s.prevAlong ?? head);
  s.prevAlong = head;
  // the orange line runs down the rope from the surface into the nearest post's dot, so it's clear which entry is selected; when the nearest
  // post changes it glides on to the new one (it never stops between posts)
  const fN = s.depth > -0.5 && pz.length ? clamp(Math.round(s.depth), 0, pz.length - 1) : -1,
    tgt = fN >= 0 ? pz[fN] : 0;
  s.fillY = s.fillY == null ? tgt : s.fillY + (tgt - s.fillY) * (1 - Math.exp(-dtT * 12));
  if (Math.abs(tgt - s.fillY) < 0.3) s.fillY = tgt;
  s.filledDot = fN;
  const fy = o.y + s.fillY,
    f0 = Math.max(o.y, LS, -20),
    f1 = Math.min(fy, H + 20);
  if (f1 > f0) {
    for (let ya = f0; ya < f1; ya += 18) {
      const yb = Math.min(f1, ya + 19),
        pts = [];
      for (let y = ya; y <= yb; y += 6) pts.push([o.x + Math.sin((y - o.y) * 0.02) * 0.7, y]);
      pts.push([o.x + Math.sin((yb - o.y) * 0.02) * 0.7, yb]);
      brush(ctx, pts, 3.6, 1, ya - o.y, ya === LS, false, rgb(fillColour(s, yToMetres(s, (ya + yb) / 2 - o.y))));
    }
  }
  return { post: fN, dt: dtT, moved: dA, LS };
}

// the rope's lay: thin slanted darker-sand lines between its strands, so it reads as twisted rope rather than a line. They sit inside
// the rope's own width (which swells and thins like the brush), and after the drop-in they spread down from the buoy
function ropeTwist(s, ctx, o, a0, a1, LS) {
  if (s.twistStart == null) s.twistStart = s.time || 0;
  const reach = ((s.time || 0) - s.twistStart - 0.15) * 650,
    P = 5.5,
    SL = 1.3;
  if (reach <= 0) return;
  ctx.lineWidth = 0.9;
  ctx.lineCap = 'round';
  for (let y = a0 + ((P - ((a0 - o.y) % P)) % P); y < a1; y += P) {
    const k = smooth(clamp((reach - (y - LS)) / 90, 0, 1));
    if (k <= 0) break;
    const wy = y - o.y,
      hw = (ROPE_W * (0.84 + 0.16 * Math.sin(wy * 0.045) + 0.1 * Math.sin(wy * 0.011 + 2))) / 2 - 0.45,
      x = o.x + Math.sin(wy * 0.02) * 0.7;
    ctx.globalAlpha = 0.7 * k;
    ctx.strokeStyle = 'rgb(150,124,84)';
    ctx.beginPath();
    ctx.moveTo(x - hw, y + hw * SL);
    ctx.lineTo(x + hw, y - hw * SL);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
}
