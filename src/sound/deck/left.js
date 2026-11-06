// The deck's left side: the jog wheel with the full-screen key at its hub, play / pause, and the volume fader.
import { TAU, clamp } from '../../lib/math.js';
import { GREY, MICHROMA, MONO, glow, noGlow, roundRect } from './paint.js';

/**
 * The jog wheel, a whole circle. It turns with the record while a piece plays and under the hand while dragged; the lit ring round
 * it is how far the piece has got.
 */
export function drawJog(s, frame) {
  const { ctx, G, t, dt, accent, c, playing, u } = frame;
  if (!s.jogDrag)
    s.jogAngle =
      s.jogAngle +
      (playing ? dt * TAU * 0.55 : 0) +
      (s.arrival && t > 3.2 && t < 3.95 ? dt * TAU * 2.4 * (1 - (t - 3.2) / 0.75) : 0);
  const [jx, jy, jr] = G.jog;
  const rh = s.rimOver || s.rimHeld;
  ctx.strokeStyle = rh ? accent.alpha(0.35) : 'rgba(255,255,255,.08)';
  ctx.lineWidth = rh ? 5 : 3;
  if (rh) glow(ctx, accent.line, 8);
  ctx.beginPath();
  ctx.arc(jx, jy, jr + 9, 0, TAU);
  ctx.stroke();
  noGlow(ctx);
  // tick marks just outside the rim, like a dial, so it reads as somewhere to click: faint at rest, lit when pointed at
  ctx.strokeStyle = rh ? accent.alpha(0.75) : 'rgba(255,255,255,.16)';
  ctx.lineWidth = 1;
  if (rh) glow(ctx, accent.line, 4);
  ctx.beginPath();
  for (let q = 0; q < 48; q++) {
    const a = (q / 48) * TAU,
      l = q % 12 === 0 ? 5 : q % 6 === 0 ? 3.5 : 2,
      r0 = jr + 13;
    ctx.moveTo(jx + Math.sin(a) * r0, jy - Math.cos(a) * r0);
    ctx.lineTo(jx + Math.sin(a) * (r0 + l), jy - Math.cos(a) * (r0 + l));
  }
  ctx.stroke();
  noGlow(ctx);
  if (c) {
    ctx.strokeStyle = accent.line;
    glow(ctx, accent.line, 10);
    ctx.beginPath();
    ctx.arc(jx, jy, jr + 9, -Math.PI / 2, -Math.PI / 2 + u * TAU);
    ctx.stroke();
    noGlow(ctx);
  }
  ctx.fillStyle = '#2a2e33';
  ctx.beginPath();
  ctx.arc(jx, jy, jr, 0, TAU);
  ctx.fill();
  const rim = ctx.createLinearGradient(jx - jr, jy - jr, jx + jr, jy);
  rim.addColorStop(0, '#7a828a');
  rim.addColorStop(0.5, '#2b3036');
  rim.addColorStop(1, '#60676e');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(jx, jy, jr - 3, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#0f1113';
  ctx.beginPath();
  ctx.arc(jx, jy, jr * 0.86, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.045)';
  ctx.lineWidth = 1;
  for (let q = 0.34; q < 0.84; q += 0.045) {
    ctx.beginPath();
    ctx.arc(jx, jy, jr * q, 0, TAU);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(jx, jy);
  ctx.rotate(s.jogAngle);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (const a of [0, Math.PI]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, jr * 0.86, a - 0.3, a + 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#f2f2f0';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -jr * 0.5);
  ctx.lineTo(0, -jr * 0.82);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
  drawFullKey(s, frame);
  if (c && (s.jogDrag || s.jogOver)) {
    ctx.strokeStyle = accent.line;
    glow(ctx, accent.line, 8);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(jx, jy, jr * 0.88, 0, TAU);
    ctx.stroke();
    noGlow(ctx);
  }
}

/**
 * The jog's hub is the full-screen key: a raised push button (like play / pause) in a dark well, ringed in the accent colour, marked
 * FULL over a two-way arrow; it lifts a shade when pointed at and sinks in while pressed.
 */
function drawFullKey(s, { ctx, G, fade, accent }) {
  const [jx, jy, jr] = G.jog;
  const hv = s.buttonOver === 'full',
    dn = s.fullPressed && hv,
    hr = jr * 0.3,
    sk = dn ? 1.5 : 0;
  ctx.fillStyle = '#08090b';
  ctx.beginPath();
  ctx.arc(jx, jy + 1.5, hr + 3, 0, TAU);
  ctx.fill();
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowBlur = dn ? 2 : 5;
  ctx.shadowOffsetY = dn ? 1 : 3;
  const cap = ctx.createLinearGradient(0, jy - hr, 0, jy + hr);
  cap.addColorStop(0, hv ? '#4a5159' : '#3d434a');
  cap.addColorStop(1, hv ? '#25292e' : '#1c1f23');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(jx, jy + sk, hr, 0, TAU);
  ctx.fill();
  noGlow(ctx);
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(jx, jy + sk, hr - 0.5, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.strokeStyle = accent.line;
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = (1 - fade) * (hv ? 1 : 0.7);
  glow(ctx, accent.line, hv ? 12 : 5);
  ctx.beginPath();
  ctx.arc(jx, jy + sk, hr - 3, 0, TAU);
  ctx.stroke();
  noGlow(ctx);
  const lc = hv ? accent.textBright : accent.text,
    fz = clamp(hr * 0.26, 7.5, 10.5);
  ctx.globalAlpha = 1 - fade;
  ctx.fillStyle = lc;
  ctx.font = '400 ' + fz.toFixed(1) + 'px ' + MICHROMA;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (hv) glow(ctx, accent.line, 6);
  // the word and its arrow both run up the diagonal, the arrow a short two-way one under the word
  ctx.save();
  ctx.translate(jx, jy + sk);
  ctx.rotate(-Math.PI / 4);
  ctx.fillText('FULL', 0.5, -hr * 0.13);
  const a = hr * 0.3,
    ay = hr * 0.3,
    ah = Math.max(2.5, hr * 0.11);
  ctx.strokeStyle = lc;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-a, ay);
  ctx.lineTo(a, ay);
  ctx.moveTo(-a + ah, ay - ah);
  ctx.lineTo(-a, ay);
  ctx.lineTo(-a + ah, ay + ah);
  ctx.moveTo(a - ah, ay - ah);
  ctx.lineTo(a, ay);
  ctx.lineTo(a - ah, ay + ah);
  ctx.stroke();
  ctx.restore();
  noGlow(ctx);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

/**
 * Play / pause, at the top of the left deck's column: a round button with depth (a dark well, the cap raised out of it and lit from
 * above, a green ring that glows while a piece plays). It is the size of the knobs; its icon scales with it.
 */
export function drawPlayButton(s, { ctx, G, fade, playing }) {
  const [bx, by, br] = G.play,
    col = 'rgb(40,220,120)',
    lit = playing,
    hov = s.buttonOver === 'play';
  ctx.globalAlpha = 1 - fade;
  ctx.fillStyle = '#08090b';
  ctx.beginPath();
  ctx.arc(bx, by + 1.5, br + 3, 0, TAU);
  ctx.fill();
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 3;
  const cap = ctx.createLinearGradient(0, by - br, 0, by + br);
  cap.addColorStop(0, hov ? '#4a5159' : '#3d434a');
  cap.addColorStop(1, hov ? '#25292e' : '#1c1f23');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, TAU);
  ctx.fill();
  noGlow(ctx);
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(bx, by, br - 0.5, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = (1 - fade) * (lit ? 1 : hov ? 0.85 : 0.55);
  if (lit) glow(ctx, col, 12);
  ctx.beginPath();
  ctx.arc(bx, by, br - 3, 0, TAU);
  ctx.stroke();
  noGlow(ctx);
  ctx.fillStyle = lit ? col : '#d9dde0';
  ctx.globalAlpha = 1 - fade;
  const q = G.play[2] / 18;
  if (playing) {
    ctx.fillRect(bx - 5 * q, by - 6 * q, 3.5 * q, 12 * q);
    ctx.fillRect(bx + 1.5 * q, by - 6 * q, 3.5 * q, 12 * q);
  } else {
    ctx.beginPath();
    ctx.moveTo(bx - 4 * q, by - 7 * q);
    ctx.lineTo(bx + 7 * q, by);
    ctx.lineTo(bx - 4 * q, by + 7 * q);
    ctx.closePath();
    ctx.fill();
  }
}

/** The volume fader, standing beside the screen. */
export function drawFader(s, { ctx, G, dt, fade, accent }) {
  const V = G.vol,
    lo = G.lo,
    hi = G.hi;
  s.faderTo = clamp(s.faderTo ?? lo, lo, hi);
  s.faderY =
    s.faderY == null ? s.faderTo : s.faderY + (s.faderTo - s.faderY) * Math.min(1, dt * (s.faderHeld ? 30 : 10));
  ctx.font = '500 7.5px ' + MONO;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GREY;
  ctx.fillText('VOL', V.x, V.y0 - 12);
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  roundRect(ctx, V.x - 3, V.y0, 6, V.y1 - V.y0, 3);
  ctx.fill();
  ctx.globalAlpha = (1 - fade) * 0.35;
  ctx.fillStyle = GREY;
  for (let q = 0; q <= 6; q++) ctx.fillRect(V.x - 11, lo + ((hi - lo) * q) / 6, q % 3 ? 2 : 4, 1);
  const VC = accent.line;
  ctx.globalAlpha = (1 - fade) * 0.85;
  ctx.fillStyle = VC;
  glow(ctx, VC, 6);
  ctx.fillRect(V.x - 1, s.faderY, 2, V.y1 - s.faderY);
  noGlow(ctx);
  const cg = ctx.createLinearGradient(0, s.faderY - 10, 0, s.faderY + 10);
  cg.addColorStop(0, '#59626b');
  cg.addColorStop(0.5, '#3a4249');
  cg.addColorStop(1, '#262c31');
  ctx.globalAlpha = 1 - fade;
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = cg;
  ctx.fillRect(V.x - 10, s.faderY - 10, 20, 20);
  noGlow(ctx);
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = VC;
  glow(ctx, VC, 8);
  ctx.fillRect(V.x - 9, s.faderY - 1, 18, 2);
  noGlow(ctx);
  s.volume = clamp(1 - (s.faderTo - lo) / (hi - lo), 0, 1);
}
