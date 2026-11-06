// The Sound page's DJ deck: where everything on it sits. (After a Pioneer Opus-Quad.) A controller running edge to edge and off the
// bottom of the screen, so only its top shows.
//   Left deck: a jog wheel that scrubs, with play / pause and the volume fader in a column beside it.
//   Middle: the album clock (a flip counter in a tall display, the album names rolling round it) and the main screen (now playing,
//   over the album's track list).
//   Right deck: the beat pads, square, four wide and two tall (the four pages, then three for the pages still to come and one
//   spare), over a row of six numbered knobs (a combination lock, for something to come).
// The menu's dots fly into the pads. The layout lives here, not with the Sound page, because Home drops its dots straight onto the pads
// when it hands over to Sound.
import { clamp } from './math.js';
import { DOT_KEYS } from './nav.js';

// the deck needs about this much width; on a narrower screen (a phone) it is laid out at this width and the whole thing scaled down to fit,
// rather than squeezing its three panels into each other. deckScale is that factor (1 on wider screens)
const DECK_MIN_W = 920;
/** A phone held upright gets a deck of its own instead (deckPhone): taller, the screen and pads big enough to use. */
export const isPhone = (W, H) => W < 640 && H >= W * 1.15;
export const deckScale = (W, H) => (isPhone(W, H ?? Infinity) ? 1 : Math.min(1, W / DECK_MIN_W));
const scaled = (v, s) =>
  typeof v === 'number'
    ? v * s
    : Array.isArray(v)
      ? v.map(x => scaled(x, s))
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scaled(x, s)]))
        : v;
let geoMemo = null;
/**
 * The deck where it is on a screen W x H (what pointer handling, hit areas and the other pages use). It is asked for several times a
 * frame and on every pointer move, so the last size's layout is kept; nothing may write into it.
 */
export function deckGeo(W, H) {
  if (geoMemo && geoMemo.W === W && geoMemo.H === H) return geoMemo.G;
  const s = deckScale(W, H),
    G = s >= 1 ? deckGeoV(W, H) : scaled(deckGeoV(W / s, H / s), s);
  geoMemo = { W, H, G };
  return G;
}
/**
 * The deck at its own size (what the drawing uses, under a scale of deckScale): W and H are the screen's, divided by deckScale.
 * Rectangles are [x, y, w, h]; circles [x, y, r]. x0, y0, x1, y1, w, h: the whole deck; mx0, mx1: the middle section's sides;
 * kc: the width each knob gets; vol: the fader's track (x, from y0 to y1), lo and hi: the ends of its travel.
 */
export function deckGeoV(W, H) {
  if (isPhone(W, H)) return deckPhone(W, H);
  const hV = Math.round(clamp(H * 0.4, 220, 330)),
    x0 = 0,
    x1 = W,
    w = x1 - x0,
    y0 = H - hV,
    cyM = y0 + hV / 2;
  // the mixer in the middle, a deck either side of it; the right deck is the wider, so its row of six knobs has room
  const L = Math.round(clamp(w * 0.25, 220, 340)),
    Rr = Math.round(clamp(w * 0.32, 260, 420)),
    Mw = w - L - Rr,
    mx0 = x0 + L,
    mx1 = mx0 + Mw;
  // left deck: the jog wheel, a whole circle, as large as the deck allows
  // (the volume fader and play / pause stand in a column at the deck's right edge)
  const jr = Math.round(clamp(Math.min((hV - 18) / 2 - 12, (L - 70) / 2 - 18), 56, 170)),
    jog = [x0 + 14 + (L - 70) / 2, y0 + hV / 2, jr];
  // middle: the clock and the screen. (The left deck's play / pause is set after the knobs, whose size it matches)
  const clock = [mx0 + 16, Math.round(cyM - 42), 64, 84],
    clockScr = [mx0 + 8, y0 + 16, 80, hV - 32];
  const scr = [mx0 + 96, y0 + 16, Mw - 96 - 14, hV - 32];
  // right deck: square beat pads above, four wide and two tall (the four pages, then the three to come and the spare), and the six knobs in a
  // row along the bottom (kc: the width each knob gets)
  const Rw = x1 - mx1 - 28,
    gap = 8,
    kc = Math.floor(Math.min(Rw / 6, 64)),
    s = Math.floor(Math.min((Rw - 3 * gap) / 4, (hV - 26 - kc - 8 - gap) / 2));
  const gx = mx1 + 14 + Math.round((Rw - (4 * s + 3 * gap)) / 2),
    gy = y0 + 14 + Math.round((hV - 26 - kc - 8 - (2 * s + gap)) / 2);
  const cell = n => [gx + (n % 4) * (s + gap), gy + Math.floor(n / 4) * (s + gap), s, s];
  const pads = [0, 1, 2, 3].map(cell),
    cpads = [4, 5, 6].map(cell),
    spare = cell(7);
  // play / pause at the top of the left deck's right-hand column, the volume fader under it
  const pr = Math.round(kc * 0.28),
    play = [x0 + L - 34, y0 + 18 + pr, pr],
    vol = { x: x0 + L - 34, y0: play[1] + pr + 30, y1: H - 22 };
  // the knob row sits low, near the bottom edge
  const kgx = mx1 + 14 + (Rw - 6 * kc) / 2,
    ky = Math.round(H - 12 - kc / 2),
    knobs = [0, 1, 2, 3, 4, 5].map(i => [kgx + (i + 0.5) * kc, ky, kc * (kc < 44 ? 0.23 : 0.28)]);
  return {
    x0,
    y0,
    x1,
    y1: H,
    w,
    h: hV,
    mx0,
    mx1,
    jog,
    knobs,
    kc,
    play,
    clock,
    clockScr,
    scr,
    vol,
    pads,
    cpads,
    spare,
    lo: vol.y0 + 8,
    hi: vol.y1 - 8,
  };
}
/** Where menu dot k lands: the centre of its beat pad. */
export const padOf = (G, k) => {
  const i = DOT_KEYS.indexOf(k === 'ink' ? 'home' : k),
    p = i < 4 ? G.pads[i] : G.cpads[i - 4];
  return [p[0] + p[2] / 2, p[1] + p[3] / 2];
};

// the phone deck: a phone held upright has height to spare but no width, so the controller stacks instead of spreading out. Top: the album clock
// beside the screen (now playing over the track list, rows tall enough to tap; a tap on a song, or on the wave above, plays and pauses, so there
// is no play button). Below: the beat pads, four wide and two tall, as large as the width allows. The jog wheel, volume fader (the phone has its own), play button and the combination knobs are left off; their
// positions sit off the edge of the screen so the drawing and the hit areas skip them
function deckPhone(W, H) {
  const hV = Math.round(clamp(H * 0.52, 360, 490)),
    x0 = 0,
    x1 = W,
    w = x1 - x0,
    y0 = H - hV,
    pad = 12,
    gap = 8,
    off = -4000;
  const s = Math.floor(Math.min((w - 2 * pad - 3 * gap) / 4, 96)),
    gy = H - 12 - (2 * s + gap),
    gx = x0 + Math.round((w - (4 * s + 3 * gap)) / 2);
  const cell = n => [gx + (n % 4) * (s + gap), gy + Math.floor(n / 4) * (s + gap), s, s];
  const pads = [0, 1, 2, 3].map(cell),
    cpads = [4, 5, 6].map(cell),
    spare = cell(7);
  const top = y0 + 14,
    sh = gy - 14 - top,
    clockScr = [x0 + pad, top, 80, sh],
    clock = [x0 + pad + 8, Math.round(top + sh / 2 - 42), 64, 84],
    scr = [x0 + pad + 88, top, w - 2 * pad - 88, sh];
  const play = [off, y0 + 40, 24],
    kc = 44,
    knobs = [0, 1, 2, 3, 4, 5].map(i => [off - i * 60, y0 + 40, 10]),
    vol = { x: off, y0: y0 + 34, y1: y0 + 140 };
  return {
    x0,
    y0,
    x1,
    y1: H,
    w,
    h: hV,
    mx0: x0,
    mx1: x1,
    jog: [off, y0 + hV / 2, 56],
    knobs,
    kc,
    play,
    clock,
    clockScr,
    scr,
    vol,
    pads,
    cpads,
    spare,
    lo: vol.y0 + 8,
    hi: vol.y1 - 8,
    phone: true,
  };
}

// ---- the main screen

/** The screen's top strip (now playing, and the squid's stage) is this much taller than its text needs, so the squid has room to dance. */
export const stripExtra = G => (G.phone ? 16 : 30);

/** The squid's pixel size on the screen: as big as the strip allows. */
export const squidPixel = G => (G.phone || G.scr[2] < 320 ? 2.5 : 3);

/** The track list on the screen: where each of its n rows sits (shared by the drawing and the row buttons over it). */
export function rowsOf(G, n) {
  const [sx, sy, sw, sh] = G.scr,
    ex = stripExtra(G),
    top = sy + 66 + ex,
    rh = clamp((sh - 70 - ex) / Math.max(1, n), 15, 44);
  return Array.from({ length: n }, (_, k) => [sx + 4, top + k * rh, sw - 8, rh]);
}
