// One frame of the page, painted in order: the grey ground, the album's photo, static while the page tunes in, scanlines, the wave
// and its playhead, and the deck over the bottom.
import { clamp, smooth } from '../lib/math.js';
import { grainTile } from '../lib/paper.js';
import { drawDeck } from './deck/index.js';
import { edgeColour } from './deck/paint.js';
import { drawDeckFoldingOut } from './fold.js';
import { drawPhotos } from './photos.js';
import { drawWave } from './wave.js';

const MAGENTA = '#ff2bd6';
/** The paper the other pages are on: it comes in under the page when it hands over to them, and goes out as it arrives from them. */
const PAPER = '#f5f3ee';
/** How strongly the ground's grain shows. */
const GRAIN = 0.12;

/** The ground's grain: mid-grey speckle, lighter and darker, overlaid on it. */
export const groundGrain = () => grainTile(7, r => 128 + (r - 0.5) * 150);

/**
 * Arriving from another page, once the dots have become beat pads the page tunes in like a radio finding its station. Gives
 * { u: seconds since tuning began, sig: the signal's strength, rising with a few dropouts }, or null when it isn't tuning.
 */
function tuningAt(s, t) {
  if (!s.arrival) return null;
  const u = t - 1.6;
  if (u > 1.9) return null;
  const drop = [0.3, 0.55, 0.82].reduce((m, c) => Math.max(m, Math.exp(-(((u - c) / 0.035) ** 2))), 0);
  return { u, sig: u <= 0 ? 0 : clamp(smooth(clamp(u / 1.2, 0, 1)) * (1 - 0.75 * drop), 0, 1) };
}

/** Paints the frame. */
export function drawFrame(s, dt) {
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
  ctx.filter = 'none';

  // the frame: what every part below draws from. fade: how far the page has faded on its way out; c: the piece loaded; playX: where
  // the playhead is across the page; live: how loud the piece is right now; tn: the tuning-in (see tuningAt)
  const t = s.time,
    c = s.player.piece,
    frame = {
      ctx,
      W,
      H,
      dpr,
      t,
      dt,
      fade: s.leaving ? smooth(clamp(s.leaving.t / 0.45, 0, 1)) : 0,
      c,
      playX: c ? (s.player.position() / c.tr.dur) * W : null,
      live: c && !c.paused ? s.player.level : 0,
      tn: tuningAt(s, t),
    };
  drawGround(s, frame);
  drawPhotos(s, frame);
  drawStatic(s, frame);
  drawScanlines(s, frame);
  drawWave(s, frame);
  drawPlayhead(s, frame);
  drawPaper(s, frame);
  if (s.arrival) drawDeckFoldingOut(s, ctx, W, H, t, dt);
  else drawDeck(s, ctx, W, H, t, dt);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/** The ground: pale grey, a little darker toward the edges, with a fine grain. */
function drawGround(s, { ctx, W, H }) {
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#eaeae7');
  gr.addColorStop(1, '#d0d1ce');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(
    W * 0.42,
    H * 0.45,
    Math.min(W, H) * 0.2,
    W * 0.42,
    H * 0.45,
    Math.max(W, H) * 0.8
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.12)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  if (!s.grainPattern) s.grainPattern = ctx.createPattern(s.grain, 'repeat');
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = GRAIN;
  ctx.fillStyle = s.grainPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/** Static while the page tunes in: grain that thins out as the signal locks on. */
function drawStatic(s, { ctx, W, H, tn }) {
  if (tn && tn.u > 0) {
    const sa = 0.5 * (1 - tn.sig) * smooth(clamp(tn.u / 0.12, 0, 1));
    if (sa > 0.01) {
      if (!s.staticPattern) {
        const c2 = document.createElement('canvas');
        c2.width = c2.height = 160;
        const x2 = c2.getContext('2d'),
          im = x2.createImageData(160, 160);
        for (let q = 0; q < im.data.length; q += 4) {
          const v = Math.random() < 0.5 ? 20 : 235;
          im.data[q] = im.data[q + 1] = im.data[q + 2] = v;
          im.data[q + 3] = Math.random() * 255;
        }
        x2.putImageData(im, 0, 0);
        s.staticPattern = ctx.createPattern(c2, 'repeat');
      }
      ctx.save();
      ctx.globalAlpha = sa;
      ctx.translate(Math.random() * 160, Math.random() * 160);
      ctx.fillStyle = s.staticPattern;
      ctx.fillRect(-160, -160, W + 160, H + 160);
      ctx.restore();
    }
  }
}

/** Fine scanlines over the ground and photo. */
function drawScanlines(s, { ctx, W, H, fade }) {
  if (!s.scanPattern) {
    const sc = document.createElement('canvas');
    sc.width = 1;
    sc.height = 3;
    const sx = sc.getContext('2d');
    sx.fillStyle = 'rgba(0,0,0,.05)';
    sx.fillRect(0, 0, 1, 1);
    s.scanPattern = ctx.createPattern(sc, 'repeat');
  }
  ctx.globalAlpha = 1 - fade;
  ctx.fillStyle = s.scanPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

/** The playhead: a glowing line down the page, magenta, or the colour of the deck's lit edge. */
function drawPlayhead(s, { ctx, H, fade, playX }) {
  if (playX != null) {
    ctx.globalAlpha = 0.9 * (1 - fade);
    const rc = edgeColour(s);
    ctx.fillStyle = rc || MAGENTA;
    ctx.shadowColor = rc || MAGENTA;
    ctx.shadowBlur = 12;
    ctx.fillRect(Math.round(playX) - 0.75, 0, 1.5, H);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
}

/** Handing over to or from another page: their paper ground comes in under the deck. */
function drawPaper(s, { ctx, W, H, t }) {
  const pap = s.arrival
    ? 1 - smooth(clamp((t - 0.2) / 1, 0, 1))
    : s.leaving
      ? smooth(clamp((s.leaving.t - 0.25) / 0.7, 0, 1))
      : 0;
  if (pap > 0) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = pap;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}
