// The Sound page's DJ deck (after a Pioneer Opus-Quad): a controller running edge to edge and off the bottom of the screen, so only its top shows.
// Left deck: a jog wheel that scrubs, with the volume fader and play / pause beside it. Middle: the album clock (a flip counter in a tall display, the album names rolling round it), the main
// screen (now playing over the album's track list). Right deck: six numbered knobs (a combination
// lock, for something to come) in a row under the beat pads, square, four wide and two tall: the four pages, three for the pages still to come
// (orange, green, purple) and one spare. The menu dots fly into the pads.
// It lives here so Home can drop its dots straight onto the pads when it hands over to Sound.
export const DECK_KEYS = ['home', 'freediving', 'sound', 'journal', 'c4', 'c5', 'c6'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// the deck needs about this much width; on a narrower screen (a phone) it is laid out at this width and the whole thing scaled down to fit,
// rather than squeezing its three panels into each other. deckScale is that factor (1 on wider screens)
export const DECK_MIN_W = 820;
// a phone held upright gets a deck of its own instead (deckPhone): taller, the screen and pads big enough to use
export const isPhone = (W, H) => W < 640 && H >= W * 1.15;
export const deckScale = (W, H) => isPhone(W, H ?? Infinity) ? 1 : Math.min(1, W / DECK_MIN_W);
// the deck where it is on screen (what pointer handling, hit areas and the other pages use)
export function deckGeo(W, H) {
  const s = deckScale(W, H); if (s >= 1) return deckGeoV(W, H);
  const sc = v => typeof v === 'number' ? v * s : Array.isArray(v) ? v.map(sc) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sc(x)])) : v;
  return sc(deckGeoV(W / s, H / s));
}
// the deck at its own size (what the drawing uses, under a scale of deckScale(W)): W and H are the screen's, divided by deckScale
export function deckGeoV(W, H) {
  if (isPhone(W, H)) return deckPhone(W, H);
  const hV = Math.round(clamp(H * .4, 220, 330)), x0 = 0, x1 = W, w = x1 - x0, y0 = H - hV, cyM = y0 + hV / 2;
  // the mixer in the middle, a deck either side of it; the right deck is the wider, so its row of six knobs has room
  const L = Math.round(clamp(w * .27, 230, 360)), Rr = Math.round(clamp(w * .32, 260, 420)), Mw = w - L - Rr, mx0 = x0 + L, mx1 = mx0 + Mw;
  // left deck: the jog wheel, a whole circle, as large as the deck allows
  // (the volume fader and play / pause stand in a column at the deck's right edge)
  const jr = Math.round(clamp(Math.min((hV - 18) / 2 - 12, (L - 70) / 2 - 18), 56, 170)), jog = [x0 + 14 + (L - 70) / 2, y0 + hV / 2, jr];
  // middle: the clock and the screen. (The left deck's play / pause is set after the knobs, whose size it matches)
  const clock = [mx0 + 16, Math.round(cyM - 42), 64, 84], clockScr = [mx0 + 8, y0 + 16, 80, hV - 32];
  const scr = [mx0 + 96, y0 + 16, Mw - 96 - 14, hV - 32];
  // right deck: square beat pads above, four wide and two tall (the four pages, then the three to come and the spare), and the six knobs in a
  // row along the bottom (kc: the width each knob gets)
  const Rw = x1 - mx1 - 28, gap = 8, kc = Math.floor(Math.min(Rw / 6, 64)), s = Math.floor(Math.min((Rw - 3 * gap) / 4, (hV - 26 - kc - 8 - gap) / 2));
  const gx = mx1 + 14 + Math.round((Rw - (4 * s + 3 * gap)) / 2), gy = y0 + 14 + Math.round((hV - 26 - kc - 8 - (2 * s + gap)) / 2);
  const cell = n => [gx + (n % 4) * (s + gap), gy + Math.floor(n / 4) * (s + gap), s, s];
  const pads = [0, 1, 2, 3].map(cell), cpads = [4, 5, 6].map(cell), spare = cell(7);
  // play / pause at the top of the left deck's right-hand column, the volume fader under it
  const pr = Math.round(kc * .28), play = [x0 + L - 34, y0 + 18 + pr, pr], vol = { x: x0 + L - 34, y0: play[1] + pr + 30, y1: H - 22 };
  // the knob row sits low, near the bottom edge
  const kgx = mx1 + 14 + (Rw - 6 * kc) / 2, ky = Math.round(H - 12 - kc / 2), knobs = [0, 1, 2, 3, 4, 5].map(i => [kgx + (i + .5) * kc, ky, kc * (kc < 44 ? .23 : .28)]);
  return { x0, y0, x1, y1: H, w, h: hV, mx0, mx1, jog, knobs, kc, play, clock, clockScr, scr, vol, pads, cpads, spare, lo: vol.y0 + 8, hi: vol.y1 - 8 };
}
// where each menu dot lands: the centre of its beat pad
export const padOf = (G, k) => { const i = DECK_KEYS.indexOf(k === 'ink' ? 'home' : k), p = i < 4 ? G.pads[i] : G.cpads[i - 4]; return [p[0] + p[2] / 2, p[1] + p[3] / 2]; };

// the phone deck: a phone held upright has height to spare but no width, so the controller stacks instead of spreading out. Top: the album clock
// beside the screen (now playing over the track list, rows tall enough to tap; a tap on a song, or on the wave above, plays and pauses, so there
// is no play button). Below: the beat pads, four wide and two tall, as large as the width allows. The jog wheel, volume fader (the phone has its own), play button and the combination knobs are left off; their
// positions sit off the edge of the screen so the drawing and the hit areas skip them
function deckPhone(W, H) {
  const hV = Math.round(clamp(H * .52, 360, 490)), x0 = 0, x1 = W, w = x1 - x0, y0 = H - hV, pad = 12, gap = 8, off = -4000;
  const s = Math.floor(Math.min((w - 2 * pad - 3 * gap) / 4, 96)), gy = H - 12 - (2 * s + gap), gx = x0 + Math.round((w - (4 * s + 3 * gap)) / 2);
  const cell = n => [gx + (n % 4) * (s + gap), gy + Math.floor(n / 4) * (s + gap), s, s];
  const pads = [0, 1, 2, 3].map(cell), cpads = [4, 5, 6].map(cell), spare = cell(7);
  const top = y0 + 14, sh = gy - 14 - top, clockScr = [x0 + pad, top, 80, sh], clock = [x0 + pad + 8, Math.round(top + sh / 2 - 42), 64, 84], scr = [x0 + pad + 88, top, w - 2 * pad - 88, sh];
  const play = [off, y0 + 40, 24], kc = 44, knobs = [0, 1, 2, 3, 4, 5].map(i => [off - i * 60, y0 + 40, 10]), vol = { x: off, y0: y0 + 34, y1: y0 + 140 };
  return { x0, y0, x1, y1: H, w, h: hV, mx0: x0, mx1: x1, jog: [off, y0 + hV / 2, 56], knobs, kc, play, clock, clockScr, scr, vol, pads, cpads, spare, lo: vol.y0 + 8, hi: vol.y1 - 8, phone: true };
}
