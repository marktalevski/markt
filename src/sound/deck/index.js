// The deck, painted: a DJ controller running edge to edge and off the bottom of the screen. (Its layout is in lib/deck-layout.js, its
// hit areas and what they do in ../controls.js.) This file paints its body and sets up each frame; the parts on it are in left.js
// (the jog wheel, play / pause, the volume fader), middle.js (the album clock's display, the screen, the squid) and right.js (the
// knobs and the beat pads). Each part eases its own state along and paints itself.
import { deckGeo, deckGeoV, deckScale } from '../../lib/deck-layout.js';
import { clamp, easeInOut, smooth } from '../../lib/math.js';
import { albums } from '../albums.js';
import { placeControls, showFullScreenAids } from '../controls.js';
import { drawFader, drawJog, drawPlayButton } from './left.js';
import { drawClockDisplay, drawScreen, drawSquid } from './middle.js';
import { accentOf, glow, noGlow, roundRect } from './paint.js';
import { drawDots, drawKnobs, drawPads } from './right.js';

// the paper inks the deck's lit edge picks from (all the wave's colours but the cream)
const INKS = [
  [232, 34, 44],
  [255, 118, 18],
  [255, 196, 0],
  [22, 168, 82],
  [110, 200, 230],
  [24, 88, 224],
  [138, 64, 214],
  [244, 138, 172],
];

/** The deck's outline: up its left side, round its corners, along its top and down its right side. */
function strokeEdge(ctx, G, H) {
  ctx.beginPath();
  ctx.moveTo(G.x0 + 0.5, H + 2);
  ctx.lineTo(G.x0 + 0.5, G.y0 + 18);
  ctx.arcTo(G.x0 + 0.5, G.y0 + 0.5, G.x0 + 18, G.y0 + 0.5, 18);
  ctx.lineTo(G.x1 - 18, G.y0 + 0.5);
  ctx.arcTo(G.x1 - 0.5, G.y0 + 0.5, G.x1 - 0.5, G.y0 + 18, 18);
  ctx.lineTo(G.x1 - 0.5, H + 2);
  ctx.stroke();
}

/**
 * Draws the deck for this frame, W x H being the screen. `dots`: a layer of their own for the dots that fly in and become the pads
 * (while the deck folds out, see fold.js); otherwise they are drawn straight onto ctx.
 */
export function drawDeck(s, ctx, screenW, screenH, t, dt, dots = null) {
  // on a narrow screen the deck is drawn at its own size and scaled down to fit (see deckScale); W, H and G here are in its own units
  const ds = deckScale(screenW, screenH),
    W = screenW / ds,
    H = screenH / ds,
    G = deckGeoV(W, H);
  if (ds < 1) {
    ctx.save();
    ctx.scale(ds, ds);
    if (dots) {
      dots.save();
      dots.scale(ds, ds);
    }
  }
  const accent = (s.accent = accentOf(s));
  // asm: how built the deck is (its controls); slide: how far it has dropped away below the screen
  const A = s.arrival,
    O = s.leaving;
  let asm = 1,
    slide = 0;
  if (O) {
    asm = 1 - smooth(clamp(O.t / 0.45, 0, 1));
    slide = easeInOut(clamp((O.t - 0.3) / 0.8, 0, 1));
  }
  // full screen: the controller slides away below the screen too
  s.fullEase += ((s.full ? 1 : 0) - s.fullEase) * Math.min(1, dt * 2.2);
  showFullScreenAids(s);
  const SY = Math.max(slide, easeInOut(clamp(s.fullEase, 0, 1))) * (H - G.y0 + 24),
    fade = 1 - asm;
  s.deckShift = SY * ds;
  placeControls(s, ds < 1 ? deckGeo(screenW, screenH) : G, SY * ds);
  {
    const o = (1 - fade).toFixed(3);
    if (s.clock.style.opacity !== o) s.clock.style.opacity = o;
  }
  for (let i = 0; i < 8; i++) s.padGlow[i] += ((s.padOver === i ? 1 : 0) - s.padGlow[i]) * Math.min(1, dt * 8);

  // the frame: what every part below draws from. fade: how far the controls have faded as the deck comes apart on the way out;
  // c: the piece loaded; pos: where it is (s); u: the same as 0..1 of its length; al: the album showing
  const c = s.player.piece,
    pos = s.player.position();
  const frame = {
    ctx,
    dots,
    G,
    H,
    ds,
    t,
    dt,
    accent,
    fade,
    A,
    O,
    asm,
    slide,
    c,
    playing: !!c && !c.paused,
    pos,
    u: c ? clamp(pos / c.tr.dur, 0, 1) : 0,
    al: albums[s.album],
  };
  ctx.save();
  ctx.translate(0, SY);
  ctx.globalAlpha = 1;
  drawBody(s, frame);
  drawEdgeLight(s, frame);
  ctx.globalAlpha = 1 - fade;
  drawJog(s, frame);
  drawPlayButton(s, frame);
  drawClockDisplay(s, frame);
  drawKnobs(s, frame);
  drawScreen(s, frame);
  drawSquid(s, frame);
  drawFader(s, frame);
  drawPads(s, frame);
  ctx.restore();
  ctx.font = '400 11px Michroma, sans-serif';
  drawDots(s, frame);
  if (ds < 1) {
    ctx.restore();
    if (dots) dots.restore();
  }
}

/** The body: only its top is on screen, the rest runs on below the edge. Its outline is lit in the accent colour. */
function drawBody(s, { ctx, G, H, accent }) {
  const face = ctx.createLinearGradient(0, G.y0, 0, H);
  face.addColorStop(0, '#17121f');
  face.addColorStop(1, '#0a0910');
  ctx.fillStyle = face;
  roundRect(ctx, G.x0, G.y0, G.w, H - G.y0 + 40, [18, 18, 0, 0]);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(G.mx0, G.y0, G.mx1 - G.mx0, H - G.y0);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.fillRect(G.mx0, G.y0 + 1, 1, H - G.y0);
  ctx.fillRect(G.mx1 - 1, G.y0 + 1, 1, H - G.y0);
  // (stroked with a gradient, though both its ends are the accent colour: browsers draw the glows of a plain-coloured stroke, and of
  // the strokes after it, a shade differently, and this is the look the deck was designed with)
  const outline = ctx.createLinearGradient(G.x0, 0, G.x1, 0);
  outline.addColorStop(0, accent.line);
  outline.addColorStop(1, accent.line);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.2;
  glow(ctx, accent.line, 10);
  strokeEdge(ctx, G, H);
  noGlow(ctx);
}

/**
 * With a piece loaded the edge lights up in one of the paper wave's inks, picked at random for each new piece and held for as long as
 * it plays (and while it is paused); a new piece fades it slowly to its own ink. The same hard line as the plain edge, which it fades
 * back to once nothing is loaded.
 */
function drawEdgeLight(s, { ctx, G, H, dt, c }) {
  const on = c ? 1 : 0;
  s.edgeLit = s.edgeLit + (on - s.edgeLit) * Math.min(1, dt * 3);
  if (c && c.tr.id !== s.edgePiece) {
    s.edgePiece = c.tr.id;
    let k;
    do k = Math.floor(Math.random() * INKS.length);
    while (k === s.edgeInkIndex && INKS.length > 1);
    s.edgeInkIndex = k;
    if (!s.edgeInk || s.edgeLit < 0.05) s.edgeInk = INKS[k].slice();
  }
  if (s.edgeInk && s.edgeInkIndex != null) {
    const tg = INKS[s.edgeInkIndex],
      e = Math.min(1, dt * 0.9);
    s.edgeInk = s.edgeInk.map((v, q) => v + (tg[q] - v) * e);
  }
  if (s.edgeLit > 0.01 && s.edgeInk) {
    ctx.strokeStyle = 'rgb(' + s.edgeInk.map(Math.round).join(',') + ')';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = s.edgeLit;
    strokeEdge(ctx, G, H);
    ctx.globalAlpha = 1;
  }
}
