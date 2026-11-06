// The pages' names. Each page's dot has a button over it (what the pointer hovers), and its name stays hidden inside the dot until
// then: it comes out of the dot letter by letter and goes back in with the same motion.
import { clamp, smooth } from '../lib/math.js';

// total seconds, seconds per letter, size and blur while inside the dot, and the dot's pulse (seconds, px) as the last letter goes in
export const LABEL = { time: 0.4, letter: 0.22, shrink: 0.2, blur: 1.5, pulse: 0.3, pulseR: 3 };

/**
 * Puts a page's button on its dot and its label beside it. The button is a 48px circle on the dot; the label sits below, above, left
 * or right of it (`side`), or at LA ([x, y] or [x, y, degrees, scale]) when the symbol sets it apart. Gaps: 24px below / above, 32px
 * beside.
 */
export function placeLabel(btn, dot, LA, side) {
  btn.style.left = dot[0] + 'px';
  btn.style.top = dot[1] + 'px';
  const lab = btn.firstElementChild;
  if (!lab) return;
  const st = lab.style;
  st.left = st.right = st.top = st.bottom = '';
  if (LA) {
    st.left = 24 + LA[0] - dot[0] + 'px';
    st.top = 24 + LA[1] - dot[1] + 'px';
    st.transformOrigin = '50% 50%';
    st.translate = '-50% -50%';
    st.rotate = LA.length > 2 ? LA[2] + 'deg' : '';
    st.scale = LA.length > 2 ? String(LA[3]) : '';
    return;
  }
  st.rotate = st.scale = '';
  if (side === 'left' || side === 'right') {
    st[side === 'right' ? 'left' : 'right'] = '56px';
    st.top = '50%';
    st.translate = '0 -50%';
  } else {
    st.left = '50%';
    st[side === 'above' ? 'bottom' : 'top'] = '48px';
    st.translate = '-50% 0';
  }
}

/**
 * One motion both ways. On hover the letters come out of the dot, nearest first, growing, sharpening and appearing; when the hover
 * ends they go back in the same way and the dot pulses once as the last one arrives. Each letter keeps its own progress, so a hover
 * that changes its mind halfway turns around smoothly.
 * btn: the page's button; dot: its dot on screen; on: hovered; rot: [degrees, scale] when the label sits apart.
 */
export function labelFx(s, pg, btn, dot, on, rot) {
  const lab = btn && btn.firstElementChild;
  if (!lab) return;
  const L = s.labels,
    chs = [...lab.children],
    st = L[pg] || (L[pg] = { on: false, t: 0, pk: null, p: chs.map(() => 0) }),
    dt = s.frameDt || 0;
  if (st.pk != null) {
    st.pk += dt;
    if (st.pk > LABEL.time + LABEL.pulse) st.pk = null;
  }
  if (on !== st.on || !st.plan) {
    // where each letter rests, untransformed, relative to the dot
    const keep = chs.map(c => c.style.transform);
    chs.forEach(c => {
      c.style.transform = 'none';
    });
    const th = rot ? (-rot[0] * Math.PI) / 180 : 0,
      sc = rot ? rot[1] || 1 : 1;
    const P = chs.map((el, i) => {
      const r = el.getBoundingClientRect(),
        dx = dot[0] - (r.left + r.width / 2),
        dy = dot[1] - (r.top + r.height / 2);
      return {
        el,
        i,
        d: Math.hypot(dx, dy),
        dx: (dx * Math.cos(th) - dy * Math.sin(th)) / sc,
        dy: (dx * Math.sin(th) + dy * Math.cos(th)) / sc,
      };
    });
    chs.forEach((c, i) => {
      c.style.transform = keep[i];
    });
    [...P]
      .sort((a, b) => a.d - b.d)
      .forEach((p, r) => {
        p.rank = r;
      });
    st.pk = st.on && !on ? 0 : on ? null : st.pk;
    st.plan = P;
    st.on = on;
    st.t = 0;
    st.gap = P.length > 1 ? (LABEL.time - LABEL.letter) / (P.length - 1) : 0;
  } else {
    st.t += dt;
    if (st.p.every(v => v === (on ? 1 : 0)) && st.rest) return;
  }
  let vis = 0;
  for (const p of st.plan) {
    if (st.t >= p.rank * st.gap) st.p[p.i] = clamp(st.p[p.i] + (on ? dt : -dt) / LABEL.letter, 0, 1);
    const u = 1 - smooth(st.p[p.i]);
    vis = Math.max(vis, 1 - u);
    p.el.style.transform =
      u < 0.001
        ? ''
        : `translate(${(p.dx * u).toFixed(1)}px, ${(p.dy * u).toFixed(1)}px) scale(${(1 - (1 - LABEL.shrink) * u).toFixed(3)})`;
    p.el.style.opacity = (1 - u * u).toFixed(3);
    p.el.style.filter = u > 0.02 ? `blur(${(LABEL.blur * u).toFixed(2)}px)` : '';
  }
  lab.style.opacity = vis > 0 ? '1' : '0';
  st.rest = st.p.every(v => v === (on ? 1 : 0));
}

/** 0..1 through the dot's pulse as the last letter goes back in. */
export function labelPulse(s, pg) {
  const lab = s.labels[pg];
  if (!lab || lab.pk == null) return 0;
  const u = clamp((lab.pk - (LABEL.time - LABEL.letter * 0.35)) / LABEL.pulse, 0, 1);
  return Math.sin(Math.PI * u);
}
