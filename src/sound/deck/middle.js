// The deck's middle: the album clock's tall display, the main screen with the track list, and the squid that lives on it.
import { rowsOf, squidPixel, stripExtra } from '../../lib/deck-layout.js';
import { clamp } from '../../lib/math.js';
import { minSec, pad2 } from '../albums.js';
import { danceStep } from '../dance.js';
import { SQUID_H, SQUID_W, squid, squidCells } from '../squid.js';
import {
  GREY,
  MICHROMA,
  MONO,
  PAD_COLOURS,
  PAD_LABEL_COLOURS,
  edgeColour,
  glass,
  glow,
  noGlow,
  roundRect,
} from './paint.js';

/** The album clock's tall display: the flip counter (a real element, see clock.js) sits in the middle of it and the album names roll through it. */
export function drawClockDisplay(s, frame) {
  const { ctx, G, accent } = frame,
    [gx, gy, gw, gh] = G.clockScr;
  glass(frame, G.clockScr, () => {
    ctx.fillStyle = accent.alpha(0.05);
    ctx.fillRect(gx, gy, gw, gh);
    // its label, lit like the counter so it reads as the display's title
    ctx.font = '500 9px ' + MICHROMA;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent.line;
    glow(ctx, accent.line, 8);
    ctx.fillText('ALBUM', gx + gw / 2, gy + 12);
    noGlow(ctx);
  });
  // the well the counter sits in
  const [kx, ky, kw, kh] = G.clock;
  ctx.fillStyle = '#060708';
  roundRect(ctx, kx - 3, ky - 2, kw + 6, kh + 6, 8);
  ctx.fill();
}

/** The album's photo, cropped square, for the screen. */
function drawCover(s, { ctx, fade, al }, x, y, sz) {
  const P = al.img && s.photos[al.img];
  ctx.fillStyle = '#1b1e22';
  ctx.fillRect(x, y, sz, sz);
  if (P && P.stark) {
    const iw = P.stark.width,
      ih = P.stark.height,
      side = Math.min(iw, ih) * 0.7;
    ctx.globalAlpha = (1 - fade) * 0.95;
    ctx.drawImage(P.stark, (iw - side) * (al.imgX ?? 1) * 0.9, (ih - side) * 0.3, side, side, x, y, sz, sz);
    ctx.globalAlpha = 1 - fade;
  }
  ctx.strokeStyle = 'rgba(255,255,255,.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, sz - 1, sz - 1);
}

/**
 * The main screen: the piece playing (its title, where it has got to and what is left, a thin line for how far through it is) over
 * the album's pieces, which you pick from.
 */
export function drawScreen(s, frame) {
  const { ctx, G, t, accent, c, pos, u, al } = frame,
    [sx, sy, sw] = G.scr;
  glass(frame, G.scr, () => {
    // the cover and the text beside it sit centred in the strip, sized to its height (it is taller than it used to be)
    const stH = 50 + stripExtra(G),
      tsz = stH - 18,
      tmid = sy + stH / 2,
      tx = sx + 10 + tsz + 12,
      fT = G.phone ? 12.5 : 14,
      fN = G.phone ? 13 : 16,
      fR = G.phone ? 8.5 : 9.5,
      tbT = tmid - (0.72 * fT + fN + 5) / 2 + 0.72 * fT,
      tbN = tbT + fN + 5;
    drawCover(s, frame, sx + 10, tmid - tsz / 2, tsz);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if (c) {
      ctx.font = '500 ' + fT + 'px ' + MONO;
      ctx.fillStyle = accent.text;
      glow(ctx, accent.line, 6);
      const ttl = c.tr.title.toUpperCase(),
        room = sx + sw - tx - SQUID_W * squidPixel(G) - 24,
        tw = ctx.measureText(ttl).width;
      ctx.save();
      ctx.beginPath();
      ctx.rect(tx, tbT - fT, room, fT * 1.5);
      ctx.clip();
      if (tw <= room) ctx.fillText(ttl, tx, tbT);
      else {
        const L = tw + 36,
          o = (t * 28) % L;
        ctx.fillText(ttl, tx - o, tbT);
        ctx.fillText(ttl, tx - o + L, tbT);
      }
      ctx.restore();
      noGlow(ctx);
      // the time, under the title: where you are, then what is left (and PAUSED when it is)
      ctx.textAlign = 'left';
      ctx.font = '400 ' + fN + 'px ' + MICHROMA;
      ctx.fillStyle = '#f2f2f0';
      const tnow = minSec(pos) + '.' + (Math.floor(pos * 10) % 10);
      ctx.fillText(tnow, tx, tbN);
      const tnw = ctx.measureText(tnow).width;
      ctx.font = '400 ' + fR + 'px ' + MONO;
      ctx.fillStyle = accent.line;
      ctx.fillText('-' + minSec(Math.max(0, c.tr.dur - pos)) + (c.paused ? '   PAUSED' : ''), tx + tnw + 10, tbN);
      ctx.fillStyle = 'rgba(255,255,255,.1)';
      ctx.fillRect(sx + 10, sy + 50 + stripExtra(G), sw - 20, 1.5);
      ctx.fillStyle = accent.line;
      glow(ctx, accent.line, 6);
      ctx.fillRect(sx + 10, sy + 50 + stripExtra(G), (sw - 20) * u, 1.5);
      noGlow(ctx);
    } else {
      ctx.font = '400 ' + fT + 'px ' + MICHROMA;
      ctx.fillStyle = '#e9edf0';
      const room = sx + sw - tx - SQUID_W * squidPixel(G) - 18;
      ctx.save();
      ctx.beginPath();
      ctx.rect(tx, sy, room, 50 + stripExtra(G));
      ctx.clip();
      ctx.fillText('STANDBY', tx, tmid + fT * 0.36);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.1)';
      ctx.fillRect(sx + 10, sy + 50 + stripExtra(G), sw - 20, 1);
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.font = '400 7.5px ' + MONO;
    ctx.fillStyle = GREY;
    const tot = al.tracks.reduce((a2, q) => a2 + q.dur, 0);
    ctx.fillText(al.tracks.length + ' PIECES · ' + minSec(tot), sx + sw - 12, sy + 59 + stripExtra(G));
    rowsOf(G, al.tracks.length).forEach(([rx, ry, rw, rh], k) => {
      const tr = al.tracks[k],
        on = c && c.tr.id === tr.id,
        hv = s.rowOver === k,
        mid = ry + rh / 2;
      if (on || hv) {
        ctx.fillStyle = on ? accent.alpha(0.13) : 'rgba(255,255,255,.05)';
        ctx.fillRect(rx, ry + 0.5, rw, rh - 1);
      }
      if (on) {
        ctx.fillStyle = accent.line;
        ctx.fillRect(rx, ry + rh - 1.5, rw * u, 1);
      }
      // the rows share the screen's height, and their type grows with them
      const fz2 = clamp(rh * 0.34, 9, 12.5);
      ctx.textAlign = 'left';
      ctx.font = '400 ' + fz2.toFixed(1) + 'px ' + MONO;
      ctx.fillStyle = on ? accent.text : GREY;
      ctx.fillText(on ? (c.paused ? '❙❙' : '▶') : pad2(k + 1), rx + 8, mid);
      // the length on the right; the title takes the rest
      ctx.font = '400 ' + (fz2 - 0.5).toFixed(1) + 'px ' + MONO;
      const gp = 14,
        wD = ctx.measureText('00:00').width,
        xDur = rx + rw - 8,
        tEnd = xDur - wD - gp;
      ctx.textAlign = 'right';
      ctx.fillStyle = GREY;
      ctx.fillText(minSec(tr.dur), xDur, mid);
      ctx.textAlign = 'left';
      ctx.fillStyle = on || hv ? '#f2f2f0' : '#c3c8cc';
      ctx.font = '500 ' + (fz2 + 0.5).toFixed(1) + 'px ' + MONO;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rx + 32, ry, tEnd - rx - 32, rh);
      ctx.clip();
      ctx.fillText(tr.title.toUpperCase(), rx + 32, mid);
      ctx.restore();
    });
  });
}

/**
 * The squid, on the right of the now-playing strip: asleep while nothing plays, dancing while a piece does, or off on the little turn
 * a beat pad under the pointer sets off. Its notes and stars take the edge's ink while it is lit.
 */
export function drawSquid(s, { ctx, G, t, dt, fade, playing }) {
  const [sx, sy, sw] = G.scr;
  const hp = s.padOver,
    mode = hp != null ? s.squidTurn : playing ? 'dance' : 'sleep',
    kp = squidPixel(G),
    kw = SQUID_W * kp,
    sEx = stripExtra(G),
    ky = sy + 50 + sEx - SQUID_H * kp - 2;
  // she keeps to one spot at the strip's right end and dances there
  const kx = sx + sw - 12 - kw;
  const dO = mode === 'dance' ? danceStep(s, dt) : {};
  const ink =
    edgeColour(s) || (hp != null ? (hp < 4 ? PAD_LABEL_COLOURS[hp] : hp < 7 ? PAD_COLOURS[hp] : '#ffd84a') : '#ffd84a');
  const P = squid(mode, t, { tau: t - (s.squidTurnAt ?? t), lv: clamp(s.player.level || 0, 0, 1), ink, ...dO });
  // drawn in square pixels, each cell's edges rounded to whole screen pixels so no seams show between them
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx + 2, sy + 2, sw - 4, 48 + sEx);
  ctx.clip();
  ctx.globalAlpha = 1 - fade;
  squidCells(P, t).forEach(([q, r, col]) => {
    const x0 = Math.round(kx + q * kp),
      y0 = Math.round(ky + r * kp);
    ctx.fillStyle = col;
    ctx.fillRect(x0, y0, Math.round(kx + (q + 1) * kp) - x0, Math.round(ky + (r + 1) * kp) - y0);
  });
  ctx.restore();
  ctx.globalAlpha = 1 - fade;
}
