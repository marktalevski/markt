// Each album's photo, laid into the page: full height, in black and white, multiplied into the grey ground so its white disappears
// and only its darks show, with a cyan and a magenta copy slipped a little to either side. It crossfades between albums, and jumps
// about for a moment when the album changes or the page tunes in.
import { clamp, easeInOut, smooth } from '../lib/math.js';
import { albums } from './albums.js';

/** How strongly the photo shows. */
const STRENGTH = 0.9;

/**
 * Makes the copies of a photo the page draws from, at the size it shows at: stark (flipped or mirrored as the album asks, every edge
 * softened into white so it has no frame), and the cyan and magenta copies. They are kept until the size changes.
 */
function prepare(P, a, iw, ih, pr) {
  const key = ih + 'x' + pr + 'cm' + !!a.imgFlip + !!a.imgMirror;
  if (P.stark && P.key === key) return;
  P.key = key;
  P.stark = document.createElement('canvas');
  P.stark.width = Math.round(iw * pr);
  P.stark.height = Math.round(ih * pr);
  const px = P.stark.getContext('2d');
  if (a.imgFlip) {
    px.translate(0, P.stark.height);
    px.scale(1, -1);
  }
  if (a.imgMirror) {
    px.translate(P.stark.width, 0);
    px.scale(-1, 1);
  }
  px.drawImage(P.image, 0, 0, P.stark.width, P.stark.height);
  px.setTransform(1, 0, 0, 1, 0, 0);
  // soften every edge into white so the photo has no frame
  const cw = P.stark.width,
    chh = P.stark.height,
    fx = cw * 0.2,
    fy = chh * 0.08;
  [
    [0, 0, fx, 0, 0, 0, fx, chh],
    [cw, 0, cw - fx, 0, cw - fx, 0, fx, chh],
    [0, 0, 0, fy, 0, 0, cw, fy],
    [0, chh, 0, chh - fy, 0, chh - fy, cw, fy],
  ].forEach(([x0, y0, x1, y1, rx, ry, rw, rh]) => {
    const gg = px.createLinearGradient(x0, y0, x1, y1);
    gg.addColorStop(0, 'rgba(255,255,255,1)');
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    px.fillStyle = gg;
    px.fillRect(rx, ry, rw, rh);
  });
  // tinted copies for the cyberpunk colour split: green+blue lifted (darks print cyan), red+blue lifted (darks print magenta)
  const tint = rgb => {
    const t2 = document.createElement('canvas');
    t2.width = cw;
    t2.height = chh;
    const tx = t2.getContext('2d');
    tx.drawImage(P.stark, 0, 0);
    tx.globalCompositeOperation = 'lighter';
    tx.fillStyle = rgb;
    tx.fillRect(0, 0, cw, chh);
    return t2;
  };
  P.cyan = tint('rgb(0,255,255)');
  P.magenta = tint('rgb(255,0,255)');
}

/** Draws the photos (only the showing album's, but for a crossfade). */
export function drawPhotos(s, frame) {
  const { ctx, W, H, dpr, t, dt, fade, tn } = frame;
  const ph = s.photos,
    pr = Math.min(dpr, 1.5),
    pa =
      STRENGTH *
      (s.arrival ? (tn ? tn.sig : t < 1.6 ? 0 : 1) : smooth(clamp((t - 0.2) / 1.2, 0, 1))) *
      (1 - fade) *
      (1 - easeInOut(clamp(s.fullEase, 0, 1)));
  albums.forEach((a, ai) => {
    if (!a.img) return;
    let P = ph[a.img];
    if (!P) {
      P = ph[a.img] = { image: new Image(), shown: 0 };
      P.image.src = a.img;
    }
    const ok = P.image.complete && P.image.naturalWidth > 0;
    P.shown += ((ai === s.album && ok ? 1 : 0) - P.shown) * Math.min(1, dt * 2.4);
    if (P.shown < 0.004 || !ok) return;
    // full height, pushed right against the panel; imgY lifts it so the subject sits in the open top right, above the track list
    const ih = H,
      iw = Math.round((ih * P.image.naturalWidth) / P.image.naturalHeight),
      iy = Math.round((a.imgY ?? 0) * H),
      ix = Math.round((a.imgX ?? 1) * (W - iw));
    prepare(P, a, iw, ih, pr);
    const al = pa * smooth(P.shown);
    ctx.globalCompositeOperation = 'multiply';
    const gl = Math.max(
        s.flipStart != null ? clamp(1 - (t - s.flipStart) / 0.5, 0, 1) : 0,
        tn ? (1 - tn.sig) * smooth(clamp(tn.u / 0.1, 0, 1)) : 0
      ),
      jx = 3 + gl * (8 + 12 * Math.random()),
      jy = gl * (Math.random() - 0.5) * 8;
    ctx.globalAlpha = al * 0.75;
    ctx.drawImage(P.cyan, ix - jx, iy + jy, iw, ih);
    ctx.drawImage(P.magenta, ix + jx, iy - jy, iw, ih);
    if (gl > 0) {
      ctx.globalAlpha = al;
      for (let q = 0; q < 5; q++) {
        const sy = Math.random() * ih,
          sh = 4 + Math.random() * 34,
          sx = (Math.random() - 0.5) * 60 * gl,
          k2 = P.stark.height / ih;
        ctx.drawImage(P.stark, 0, sy * k2, P.stark.width, sh * k2, ix + sx, iy + sy, iw, sh);
      }
    }
    ctx.globalAlpha = al;
    ctx.drawImage(P.stark, ix, iy, iw, ih);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  });
}
