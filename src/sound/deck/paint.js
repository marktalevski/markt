// What the deck's parts share: its type and colours, the accent colour that follows the music, and a few small ways of painting.
import { clamp } from '../../lib/math.js';

export const GREY = '#8a8f94',
  MONO = "'JetBrains Mono', monospace",
  MICHROMA = 'Michroma, sans-serif';
// the beat pads: the four pages, then the three still to come, in the menu dots' colours (the pages' labels a little lighter, to read
// on the dark pads)
export const PAD_NAMES = ['Home', 'Freediving', 'Sound', 'Library'],
  PAD_COLOURS = [
    '#f2f2f0',
    'rgb(24,88,224)',
    'rgb(232,34,44)',
    'rgb(255,196,0)',
    'rgb(255,118,18)',
    'rgb(22,168,82)',
    'rgb(138,64,214)',
  ],
  PAD_LABEL_COLOURS = ['#f2f2f0', 'rgb(120,166,255)', 'rgb(255,112,108)', 'rgb(255,206,60)'];

// ---- colours that follow the music

/**
 * The controller's accent: cyan with nothing loaded, blending into the loaded piece's ink (the lit edge's colour) as the edge lights.
 * line: for strokes and glows (the ink a little brightened); text and textBright: lighter tints that read on the dark glass;
 * alpha(a): the line colour at opacity a.
 */
export function accentOf(s) {
  const k = clamp(s.edgeLit, 0, 1),
    ink = s.edgeInk || [0, 229, 255],
    mix = (a, b, u) => a.map((v, q) => Math.round(v + (b[q] - v) * u));
  const base = mix([0, 229, 255], mix(ink, [255, 255, 255], 0.22), k),
    lt = mix(base, [255, 255, 255], 0.5);
  return {
    line: 'rgb(' + base.join(',') + ')',
    text: 'rgb(' + lt.join(',') + ')',
    textBright: 'rgb(' + mix(base, [255, 255, 255], 0.75).join(',') + ')',
    alpha: al => 'rgba(' + base.join(',') + ',' + al + ')',
  };
}

/** The lit edge's colour (the playhead and the squid's notes take it too); null while the edge is plain. */
export function edgeColour(s) {
  return s.edgeLit > 0.5 && s.edgeInk ? 'rgb(' + s.edgeInk.map(Math.round).join(',') + ')' : null;
}

// ---- small ways of painting

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
export function glow(ctx, colour, blur) {
  ctx.shadowColor = colour;
  ctx.shadowBlur = blur;
}
export function noGlow(ctx) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

/** A piece of black glass with a fine lit edge and scanlines across it. `content` paints what shows on it, clipped to its shape. */
export function glass(frame, [x, y, w, h], content) {
  const { ctx, fade, accent } = frame;
  ctx.globalAlpha = 1 - fade;
  ctx.fillStyle = '#04030a';
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.save();
  roundRect(ctx, x, y, w, h, 5);
  ctx.clip();
  content();
  ctx.globalAlpha = 1 - fade;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  for (let q = y + 1; q < y + h; q += 2) ctx.fillRect(x, q, w, 1);
  ctx.restore();
  ctx.globalAlpha = 1 - fade;
  ctx.strokeStyle = accent.alpha(0.45);
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 4.5);
  ctx.stroke();
}
