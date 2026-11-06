// Where everything on the page sits, each frame: the entries down the rope, the whole dive sliding up as you go deeper, and the
// colours that follow the depth.
import { clamp, smooth } from '../lib/math.js';
import { ropeX } from '../lib/surface.js';
import { PAPER, inkFor, mix, rgb } from './palette.js';

/** Each entry is this much deeper than the one before. */
export const METRES_PER_ENTRY = 3;

// entries sit at s.entryY[i] pixels down the rope; these turn a depth in metres into a place on the rope and back
export function metresToY(s, m) {
  const pos = s.entryY,
    n = pos.length,
    mpe = METRES_PER_ENTRY;
  if (!n) return m * 40;
  const f = m / mpe - 1;
  if (f <= 0) return (f + 1) * pos[0];
  if (f >= n - 1) return pos[n - 1] + (f - n + 1) * (n > 1 ? pos[n - 1] - pos[n - 2] : 100);
  const i = Math.floor(f);
  return pos[i] + (pos[i + 1] - pos[i]) * (f - i);
}
export function yToMetres(s, wy) {
  const pos = s.entryY,
    n = pos.length,
    mpe = METRES_PER_ENTRY;
  if (!n) return Math.max(0, wy / 40);
  if (wy <= pos[0]) return Math.max(0, wy / pos[0]) * mpe;
  for (let i = 0; i < n - 1; i++) if (wy <= pos[i + 1]) return (i + 1 + (wy - pos[i]) / (pos[i + 1] - pos[i])) * mpe;
  return (n + (wy - pos[n - 1]) / (n > 1 ? pos[n - 1] - pos[n - 2] : 100)) * mpe;
}

/** The orange line's colour where it passes depth m: it warms and then pales as it goes down. */
export function fillColour(s, m) {
  const end = Math.max(1, yToMetres(s, s.ropeEnd || 1)),
    f = clamp(m / end, 0, 1),
    A = [232, 121, 43],
    B = [212, 69, 42],
    C = [242, 128, 96];
  return f < 0.45 ? mix(A, B, f / 0.45) : mix(B, C, (f - 0.45) / 0.55);
}

/**
 * The page's own ink (the menu, the depth read-out): dark near the surface, paper-white once the water behind it gets dark. It turns
 * at the depth where white starts to read better, and eases over rather than snapping.
 */
export function inkBlend(s, m) {
  if (s.inkFlipDepth == null) {
    s.inkFlipDepth = 999;
    for (let x = 0; x <= 52; x += 0.25)
      if (inkFor(x) !== '#141414') {
        s.inkFlipDepth = x;
        break;
      }
  }
  if (s.inkFlipDepth > 60) return '#141414';
  const tgt = s.inkTarget ?? 0;
  s.inkTarget = m > s.inkFlipDepth + 0.8 ? 1 : m < s.inkFlipDepth - 0.8 ? 0 : tgt;
  const now = performance.now(),
    dt = Math.min(0.05, (now - (s.inkClock || now)) / 1000);
  s.inkClock = now;
  s.inkMix = (s.inkMix ?? s.inkTarget) + (s.inkTarget - (s.inkMix ?? s.inkTarget)) * (1 - Math.exp(-dt * 2.2));
  const k = smooth(clamp(s.inkMix, 0, 1)),
    A = [20, 20, 20];
  return rgb(A.map((v, j) => v + (PAPER[j] - v) * k));
}

/** Places everything for this frame (dt: seconds since the last). */
export function layout(s, dt) {
  const root = s.root,
    world = s.world;
  if (!root || !world) return;
  const vw = innerWidth,
    vh = innerHeight,
    narrow = vw < 720,
    LX = ropeX(vw);
  // the card's size follows the window. On a narrow screen an entry's card opens under its title, the width of the screen, instead of
  // off to the right (where it wouldn't fit): see .is-narrow in freediving.css
  if (s.sizedFor !== vw + 'x' + vh) {
    s.sizedFor = vw + 'x' + vh;
    root.classList.toggle('is-narrow', narrow);
    root.style.setProperty('--card-w', (narrow ? vw - LX - 30 - 14 : clamp(vw - LX - 30 - 348 - 60, 260, 640)) + 'px');
    root.style.setProperty('--card-max-h', Math.round(vh * 0.58) + 'px');
  }
  const k2 = 1 - Math.exp(-dt * 16),
    els = s.entries,
    n = els.length,
    S = narrow ? 86 : 100;
  const pos = [];
  let a = narrow ? 64 : 80;
  for (let i = 0; i < n; i++) {
    // an open card under its title (narrow screens) pushes the entries below it down by its height
    const e = els[i],
      m = narrow && e.scroll && e.block ? Math.max(0, e.block.offsetHeight - 10) : 0,
      prev = s.sizes[e.id] ?? m,
      sz = prev + (m - prev) * k2;
    s.sizes[e.id] = sz;
    pos[i] = a;
    a += Math.max(S, sz + 30);
  }
  s.entryY = pos;
  s.ropeEnd = n ? pos[n - 1] + 160 : vh;
  const pp = s.depth,
    mpe = METRES_PER_ENTRY;
  for (let i = 0; i < n; i++) {
    const e = els[i],
      d = Math.abs(i - pp);
    e.root.style.transform = `translate(0,${pos[i]}px)`;
    const ink = inkFor((i + 1) * mpe);
    e.root.style.color = ink;
    const lab = smooth(clamp(1.7 - d * 0.6, 0, 1)),
      labB = (1 - lab) * 4;
    if (e.label) {
      e.label.style.opacity = lab.toFixed(3);
      e.label.style.filter = labB > 0.1 ? `blur(${labB.toFixed(1)}px)` : '';
      e.label.style.transform = `translateY(${((1 - lab) * (i > pp ? 6 : -6)).toFixed(1)}px)`;
      e.label.style.fontWeight = i === s.focus ? '500' : '';
    }
    if (e.conn && e.label) {
      const lw = e.label.offsetWidth + 12;
      e.conn.style.left = lw + 'px';
      e.conn.style.width = Math.max(8, 348 - lw) + 'px';
    }
    if (e.dot) {
      const sc = d < 1 ? 1.5 - 0.5 * d : 1;
      e.dot.style.transform = `scale(${sc.toFixed(3)})`;
      e.dot.style.opacity = '1';
      {
        const filled = i === (s.filledDot ?? -1),
          dc = ink;
        e.dot.style.background = filled ? rgb(fillColour(s, (i + 1) * mpe)) : dc;
        e.dot.style.outlineColor = dc;
        e.dot.style.transition = filled ? 'background .35s ease' : 'none';
      }
      e.dot.style.outlineStyle = i === s.focus ? 'solid' : 'none';
      e.dot.style.outlineWidth = '1px';
      e.dot.style.outlineOffset = '3px';
    }
  }
  let along = 0;
  if (n) {
    if (pp <= 0) along = (pp + 1) * pos[0];
    else {
      const i0 = Math.min(n - 1, Math.floor(pp)),
        i1 = Math.min(n - 1, i0 + 1);
      along = pos[i0] + (pos[i1] - pos[i0]) * (pp - i0);
    }
  }
  const b = smooth(clamp(pp + 1, 0, 1)),
    anchor = Math.max(vh * 0.26, 190) + (vh * 0.3 - Math.max(vh * 0.26, 190)) * b;
  const oy = anchor - along;
  world.style.transform = `translate(${LX}px,${oy.toFixed(2)}px)`;
  s.origin = { x: LX, y: oy };
  s.along = along;
  s.anchor = anchor;
  s.ink = inkBlend(s, Math.max(0, pp + 1) * METRES_PER_ENTRY);
  root.style.color = s.ink;
  const ui = s.introDone ? 1 : clamp((s.introT - s.tideEnd - 0.25) / 0.6, 0, 1);
  world.style.opacity = ui.toFixed(3);
  world.style.top = (s.tideY || 0).toFixed(1) + 'px';
  if (s.chrome) s.chrome.style.opacity = ui.toFixed(3);
  if (s.depthText) s.depthText.textContent = (Math.max(0, pp + 1) * METRES_PER_ENTRY).toFixed(1) + ' m';
}
