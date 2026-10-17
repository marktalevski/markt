// The Freediving squid, in pixels, on the Sound deck's screen. She stays on her spot and dances there. squid(mode, t, o) gives her pose for
// the moment: where her body is on a 22 x 20 grid and how squashed (bx, by, rx, ry), how far each tentacle is swung out (aL, aR, as arms), the
// arms' shuffle (fL, fR), where she looks (edx), her eyes (open, shut, happy) and mouth, whether she's turned (flip, flipY, rot) and the sparkles
// round her (fx: notes, stars, Zs, ink, as [x, y, colour] cells on the same grid). squidCells(P, t) turns a pose into lit cells. Modes: idle,
// sleep and yawn (resting); dance (a piece is playing: o.move and o.mp say which move and how far in); and the little turns a beat pad sets
// off: wave, jump, ink, jet, happy, spin, yawn. o: { tau: seconds since the mode began, lv: loudness 0..1, ink: the colour for notes and stars }
export const SQUID_W = 22, SQUID_H = 20;
export const SQUID_IDLES = ['idle', 'sleep', 'yawn'];
// the dance's twenty moves, all on the spot, and how many beats each lasts
export const SQUID_MOVES = { sway: 4, spin: 2, hop: 4, shimmy: 4, jumpspin: 2, breakdance: 4, pose: 2, squish: 4, clap: 4, robot: 4,
  twist: 4, armwave: 4, bob: 4, float: 4, backflip: 2, stomp: 4, disco: 4, upside: 4, spin360: 2, headbang: 4 };
// which moves suit slow music and which fast (the rest suit any): slow music favours the first, fast the second
export const SQUID_SLOW = ['sway', 'bob', 'float', 'armwave', 'squish', 'upside'];
export const SQUID_FAST = ['spin360', 'hop', 'spin', 'jumpspin', 'breakdance', 'backflip', 'stomp', 'robot', 'clap', 'twist', 'shimmy', 'headbang'];
export const SQUID_REACTS = ['wave', 'jump', 'ink', 'jet', 'happy', 'spin', 'yawn'];
// the Freediving squid's colours: outline, pink, its shade, the white streak, eyes, pupils, blush; ink cloud; white; the Zs
const C = { o: '#141414', b: '#f48aac', s: '#d8698f', h: '#ffffff', e: '#ffffff', p: '#141414', c: '#ec547c', inkD: '#1b1d2a', inkL: '#3a3e55', w: '#ffffff', z: '#9fd8ff' };
const STAR = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
const ZED = [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]];
const INK = [[0, 0], [1, 0], [0, 1], [1, 1]], BUB = [[0, 0]];
const s01 = v => Math.max(0, Math.min(1, v)), sm = v => v * v * (3 - 2 * v);

export function squid(mode, t, o = {}) {
  const tau = o.tau ?? t, lv = o.lv ?? 0, ink = o.ink || '#ffd84a';
  // rot: how far she's turned (0 upright, mantle up)
  let rot = 0, spin = mode === 'dance' ? t * 6 : 0, bx = 11, by = 11, rx = 6.3, ry = 5.9, aL = -.35, aR = -.35, fL = [0, 0], fR = [0, 0], edx = 0, eyes = 'open', mouth = 'none', flip = false;
  const fx = [];   // extra cells: notes, stars, Zs, sparkles
  const add = (shape, x, y, col) => shape.forEach(([q, r]) => fx.push([Math.round(x) + q, Math.round(y) + r, col]));
  const blink = (t % 3.7) < .13;
  if (mode === 'idle') {
    // breathing, a blink now and then, and a look round every so often
    const br = Math.sin(t * 2.1); ry *= 1 + .03 * br; rx *= 1 - .015 * br; by += .25 * br;
    const lc = t % 9; edx = lc > 5 && lc < 6.4 ? -1 : lc > 6.4 && lc < 7.6 ? 1 : 0; eyes = blink ? 'shut' : 'open';
  } else if (mode === 'sleep') {
    const br = Math.sin(t * 1.3); ry *= .95 + .05 * br; rx *= 1.04 - .02 * br; by += .5 + .3 * br; eyes = 'shut'; mouth = br > .3 ? 'o' : 'none'; aL = aR = -.6;
    const zt = (t * .7) % 1; add(ZED, 17 + zt * 2, 4 - zt * 4, C.z); if (zt > .5) add(ZED, 19, 1 - (zt - .5) * 2, C.z);
  } else if (mode === 'yawn') {
    // rests, then every few seconds a big stretching yawn
    const y = (t % 5) / 5, k = y > .55 && y < .85 ? Math.sin((y - .55) / .3 * Math.PI) : 0; ry *= 1 + .12 * k; rx *= 1 - .05 * k; by -= k * .8;
    aL = aR = -.35 + 1.6 * k; eyes = k > .15 ? 'shut' : blink ? 'shut' : 'open'; mouth = k > .2 ? 'big' : 'none';
  } else if (mode === 'dance') {
    // one move of the dance; mp is how many beats into it it is. The moves:
    // sway, spin, hop, shimmy, jumpspin, breakdance, pose, and the rest below
    const mv = o.move || 'sway', mp = o.mp || 0, beat = Math.floor(mp), f = mp - beat, up = Math.sin(f * Math.PI), land = f < .15 ? 1 - f / .15 : 0;
    eyes = blink ? 'shut' : 'open'; mouth = 'smile';
    if (mv === 'sway') { const sd = beat % 2 ? 1 : -1; bx += sd * .5; by -= up * (.6 + .8 * lv); if (sd < 0) { aL = .35; aR = 1.3; } else { aR = .35; aL = 1.3; } edx = sd; eyes = beat % 4 > 1 ? 'happy' : eyes; }
    else if (mv === 'spin') { flip = Math.floor(mp * 6) % 2 === 1; aL = aR = .2; eyes = 'shut'; mouth = 'none'; by -= up * 1.1; }
    else if (mv === 'hop') { by -= up * (1.6 + 1.6 * lv); ry *= 1 - .12 * land; rx *= 1 + .08 * land; aL = aR = up > .3 ? 1.35 : -.4; eyes = 'happy'; mouth = 'big'; }
    else if (mv === 'shimmy') { bx += Math.sin(mp * Math.PI * 8) * .7; const a = Math.floor(mp * 4) % 2; aL = a ? 1.3 : -.45; aR = a ? -.45 : 1.3; eyes = 'happy'; edx = a ? -1 : 1; }
    else if (mv === 'jumpspin') { const c = mp / 2; let h = 0, sq = 0; if (c < .12) sq = c / .12; else if (c < .82) { const u = (c - .12) / .7; h = Math.sin(u * Math.PI) * 4.6; flip = u > .25 && u < .75 && Math.floor(u * 12) % 2 === 1; } else sq = 1 - (c - .82) / .18;
      by -= h; ry *= 1 - .14 * sq; rx *= 1 + .1 * sq; by += sq * .8; aL = aR = h > .5 ? 1.25 : -.5; eyes = h > .5 ? 'happy' : 'open'; mouth = h > .5 ? 'big' : 'smile'; }
    else if (mv === 'breakdance') { ry *= .8; rx *= 1.08; by += 1.3; flip = Math.floor(mp * 8) % 2 === 1; fL = [0, -2.2 * Math.abs(Math.sin(mp * Math.PI * 2))]; fR = [0, -2.2 * Math.abs(Math.cos(mp * Math.PI * 2))]; aL = aR = .05; eyes = 'shut'; mouth = 'big'; }
    else if (mv === 'pose') { const k = Math.min(1, mp * 2); aL = -.4 + 1.75 * k; aR = -.3; eyes = 'happy'; mouth = 'big'; edx = -1; by -= Math.sin(Math.min(1, mp) * Math.PI) * 1.5; if (mp > .5) add(STAR, 2, 2, ink); }
    // squish: squashes and stretches like jelly on each beat
    else if (mv === 'squish') { const k = Math.sin(mp * Math.PI * 2); ry *= 1 + .14 * k; rx *= 1 - .1 * k; by -= k * .7; aL = aR = k > 0 ? .9 : -.5; eyes = k > .3 ? 'happy' : eyes; mouth = k > 0 ? 'big' : 'smile'; }
    // clap: claps overhead on every beat, a little hop with each
    else if (mv === 'clap') { const k = up > .5 ? 1 : 0; aL = aR = k ? 1.4 : .6; by -= up * .8; eyes = 'happy'; mouth = 'big'; if (k && f > .45 && f < .6) add(STAR, 10, 0, ink); }
    // robot: stiff, in steps: arms snap between poses on the half beat, the body ticks side to side, no bounce
    else if (mv === 'robot') { const h = Math.floor(mp * 2) % 4; bx += [-1, 0, 1, 0][h]; aL = [1.3, -.4, .3, 1.3][h]; aR = [-.4, 1.3, .3, -.4][h]; eyes = 'open'; mouth = 'none'; edx = [-1, 0, 1, 0][h]; }
    // twist: low, feet swapping as it turns this way and that
    else if (mv === 'twist') { const k = Math.sin(mp * Math.PI * 2); ry *= .92; by += .6; flip = k < 0; fL = [k * 1.4, 0]; fR = [-k * 1.4, 0]; aL = .3 + .4 * k; aR = .3 - .4 * k; eyes = 'happy'; mouth = 'smile'; }
    // armwave: the arms rise one after the other, like a stadium wave, slow and smooth
    else if (mv === 'armwave') { const k = mp * Math.PI; aL = .5 + .9 * Math.sin(k); aR = .5 + .9 * Math.sin(k - 1.3); by -= .4 * Math.sin(k * 2); edx = Math.sin(k) > 0 ? -1 : 1; mouth = 'smile'; }
    // bob: a bob to the beat, reels shut, in the groove
    else if (mv === 'bob') { const d = f < .25 ? f / .25 : 1 - (f - .25) / .75; by += d * 1.1; ry *= 1 - .06 * d; eyes = 'shut'; mouth = 'smile'; aL = aR = -.3 + .2 * d; }
    // float: swells a little and drifts in the air, arms paddling slowly
    else if (mv === 'float') { rx = 7.1; ry = 6.8; by = 9.6 + .9 * Math.sin(mp * Math.PI); aL = aR = .4 + .5 * Math.sin(mp * Math.PI * 2); fL = fR = [0, -1]; mouth = 'puff'; }
    // backflip: a crouch, a big jump turning over at the top, and a squashed landing
    else if (mv === 'backflip') { const c = mp / 2; let h = 0, sq = 0; if (c < .12) sq = c / .12; else if (c < .82) { const u = (c - .12) / .7; h = Math.sin(u * Math.PI) * 4.8; o.flipY = u > .3 && u < .7; } else sq = 1 - (c - .82) / .18;
      by -= h; ry *= 1 - .14 * sq; rx *= 1 + .1 * sq; by += sq * .8; aL = aR = h > .5 ? 1.25 : -.5; eyes = h > .5 ? 'shut' : 'open'; mouth = h > .5 ? 'big' : 'smile'; }
    // stomp: heavy stomps, one foot then the other, a shake on each landing
    else if (mv === 'stomp') { const sd = beat % 2 ? 1 : -1, lift = up * 2; if (sd < 0) fL = [0, -lift]; else fR = [0, -lift]; bx += land * (Math.random() - .5) * .9; ry *= 1 - .08 * land; aL = aR = .1; eyes = 'open'; mouth = land > .3 ? 'big' : 'smile'; }
    // disco: one arm pointing up across, the other down, swapping every two beats, hips bouncing
    else if (mv === 'disco') { const sd = Math.floor(mp / 2) % 2 ? 1 : -1; if (sd > 0) { aR = 1.45; aL = -.6; } else { aL = 1.45; aR = -.6; } bx += sd * .7; by -= up * .5; edx = sd; eyes = 'open'; mouth = 'smile'; }
    // upside: turns over, dances a while upside down, tentacles up, and turns back
    else if (mv === 'upside') { const n = SQUID_MOVES.upside, k = sm(s01(mp / .6)) * sm(s01((n - mp) / .6)); rot = Math.PI * k; by -= up * .8; aL = aR = .6; eyes = 'happy'; }
    // spin360: two whole turns on the spot, lifting a little
    else if (mv === 'spin360') { const n = SQUID_MOVES.spin360; rot = sm(s01(mp / n)) * Math.PI * 4; by -= Math.sin(mp / n * Math.PI) * 2; eyes = 'happy'; }
    // headbang: quick nods twice a beat, eyes shut, mouth open, arms flung up on the beat
    else if (mv === 'headbang') { const k = Math.abs(Math.sin(mp * Math.PI * 2)); by += k * 1.2; ry *= 1 - .08 * k; rx *= 1 + .04 * k; aL = aR = f < .3 ? 1.2 : -.2; eyes = 'shut'; mouth = 'big'; }
  } else if (mode === 'wave') {
    const w = Math.sin(tau * 9); aR = 1.15 + .35 * w; aL = -.4; eyes = blink ? 'shut' : 'open'; mouth = 'smile'; edx = 1; by += .2 * Math.sin(tau * 3);
  } else if (mode === 'jump') {
    // a crouch, a spring up (stretched), and a squashed landing
    const c = (tau % 1.1) / 1.1; let h = 0, sq = 0;
    if (c < .2) sq = c / .2; else if (c < .7) { const u = (c - .2) / .5; h = Math.sin(u * Math.PI) * 4.5; sq = -.6 * Math.sin(u * Math.PI); } else if (c < .85) sq = 1 - (c - .7) / .15;
    by -= h; ry *= 1 - .14 * sq; rx *= 1 + .1 * sq; by += sq * .8; aL = aR = h > .5 ? 1.2 : -.5; eyes = h > .5 ? 'happy' : 'open'; mouth = h > .5 ? 'big' : 'smile';
    if (h > 3) add(STAR, 18, 2, ink);
  } else if (mode === 'ink') {
    // a little squirt of ink: it shrinks back and a cloud puffs out below and drifts off
    const k = s01(tau / .25); ry *= 1 - .1 * k; rx *= 1 + .06 * k; eyes = 'shut'; aL = aR = -.5; by -= .5 * k;
    for (let n = 0; n < 4; n++) { const u = (tau * 1.2 + n / 4) % 1, cx = 11 + (n - 1.5) * 2.2 * (.4 + u), cy = 18 - u * 3; add(INK, cx, cy, u > .75 ? C.inkL : C.inkD); }
  } else if (mode === 'jet') {
    // squeezes and shoots up, arms streaming out behind, then drifts back down
    const c = (tau % 1.2) / 1.2, h = c < .35 ? s01(c / .35) * 4 : 4 * (1 - s01((c - .35) / .65)); by -= h; ry *= 1 + .14 * (c < .35 ? 1 : 0); rx *= c < .35 ? .88 : 1; aL = aR = -.6; fL = fR = [0, h * .5]; eyes = h > 1 ? 'happy' : 'open';
    if (c < .4) for (let n = 0; n < 3; n++) add(BUB, 9 + n * 2, 19 - n, C.w);
  } else if (mode === 'happy') {
    // both arms up, ^^ reels, stars round it
    const b = Math.abs(Math.sin(tau * 5)); by -= b * 1.2; aL = aR = 1.35; eyes = 'happy'; mouth = 'big';
    for (let n = 0; n < 3; n++) { const a = tau * 2 + n * 2.1; add(STAR, 10 + Math.cos(a) * 9.5, 8 + Math.sin(a) * 6.5, n === 1 ? C.w : ink); }
  } else if (mode === 'spin') {
    // a twirl (it turns side to side quickly), then a pose
    const c = tau % 1.6; if (c < 1) { flip = Math.floor(c * 8) % 2 === 1; aL = aR = .25; eyes = 'shut'; by -= Math.sin(c * Math.PI) * 1.2; }
    else { aL = 1.3; aR = -.2; eyes = 'open'; mouth = 'smile'; add(STAR, 18, 3, ink); }
  }
  return { bx, by, rx, ry, aL, aR, fL, fR, edx, eyes, mouth, flip, flipY: !!o.flipY, fx, rot };
}

// the pose as lit cells [x, y, colour]: a pointed mantle with fins at its tip, a white streak down it, big round eyes (^^ with a pink blush when
// she's happy), four short arms and two long tentacles with club tips, all pink with dark outlines like the Freediving squid. Cells may fall a
// little outside the grid (a jump lifts her above it); the deck clips them to the screen
export function squidCells(P, t) {
  const { bx, by, rx, ry, aL, aR, fL, fR, edx, eyes, mouth } = P;
  // the mantle: a teardrop pointed at the top, fins either side of its tip; centred a little above the pose's body point so the arms fit below
  const G0 = 6, GW = SQUID_W + G0 * 2, GH = SQUID_H + G0 * 2, rm = ry * .78, wm = rx * .62, my = by - 2.2, own = new Uint8Array(GW * GH), O = 1, F = 2, A = 3, T = 4;
  const at = (x, y) => x < -G0 || y < -G0 || x >= SQUID_W + G0 || y >= SQUID_H + G0 ? 0 : own[(y + G0) * GW + x + G0];
  const set = (x, y, k) => { x = Math.round(x); y = Math.round(y); if (x >= -G0 && y >= -G0 && x < SQUID_W + G0 && y < SQUID_H + G0 && !own[(y + G0) * GW + x + G0]) own[(y + G0) * GW + x + G0] = k; };
  const halfW = v => v < -.3 ? Math.max(0, (v + 1.45) / 1.15) : 1 - .22 * Math.max(0, v - .35) / .65;
  for (let y = -G0; y < SQUID_H + G0; y++) for (let x = -G0; x < SQUID_W + G0; x++) { const u = (x + .5 - bx) / wm, v = (y + .5 - my) / rm; if (v < -1.45 || v > 1) continue;
    const hw = halfW(v); if (Math.abs(u) <= hw) set(x, y, O); else if (v > -1.1 && v < -.25 && Math.abs(u) <= hw + .55 * (1 - Math.abs(v + .67) / .43)) set(x, y, F); }
  // four short arms from the mantle's rim with gaps between them, wiggling (the pose's feet offsets push them about), and two long tentacles
  // on the outside that hang down and swing out and up like arms, with a club at each tip
  const rimY = my + rm, wig = (k, q) => Math.sin(t * 3.6 + k * 1.3 + q * .9) * .55 * q / 4;
  [-2.1, -.7, .7, 2.1].forEach((dx, k) => { const off = k < 2 ? fL : fR; for (let q = 0; q <= 4; q++) set(bx + dx + wig(k, q) + off[0] * q / 4, rimY + q + off[1] * q / 4, A); });
  [[-1, aL], [1, aR]].forEach(([sd, a]) => { const lift = Math.max(-.6, Math.min(1.4, a)) + .6; let x = bx + sd * 3.2, y = rimY - .4;
    for (let q = 1; q <= 7; q++) { const u = q / 7, th = lift * 1.25 * u; x += sd * Math.sin(th) * 1.0 + Math.sin(t * 3 + q + sd) * .18 * u; y += Math.cos(th) * 1.0; set(x, y, T); }
    set(x + sd, y, T); set(x, y + (lift > 1.4 ? -1 : 1), T); });
  const out = [];
  for (let y = -G0; y < SQUID_H + G0; y++) for (let x = -G0; x < SQUID_W + G0; x++) { const k = at(x, y);
    if (!k) { if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) out.push([x, y, C.o]); continue; }
    const u = (x + .5 - bx) / wm, v = (y + .5 - my) / rm;
    if (k === O) { out.push([x, y, Math.abs(u + .35) < .16 && v > -1.05 && v < -.2 ? C.h : u > .45 || v > .7 ? C.s : C.b]); continue; }
    out.push([x, y, k === F ? C.s : C.b]); }
  // the face, low on the mantle: big round eyes (or shut, or ^^ with a blush), looking the way the pose says
  const fx0 = Math.round(bx) + edx, ey = Math.round(my + rm * .35), L = fx0 - 3, R = fx0 + 2, put = (x, y, col) => out.push([x, y, col]);
  if (eyes === 'open') [L, R].forEach(x => { put(x, ey, C.e); put(x + 1, ey, C.e); put(x, ey + 1, C.e); put(x + 1, ey + 1, C.p); });
  else if (eyes === 'shut') [L, R].forEach(x => { put(x, ey + 1, C.p); put(x + 1, ey + 1, C.p); });
  else if (eyes === 'happy') { [L, R].forEach(x => { put(x, ey + 1, C.p); put(x + 1, ey, C.p); put(x + 2, ey + 1, C.p); }); put(L - 1, ey + 2, C.c); put(R + 3, ey + 2, C.c); }
  if (mouth === 'big' || mouth === 'o') { put(fx0 - 1, ey + 3, C.p); put(fx0, ey + 3, C.p); }
  let cells = out;
  if (P.flip) cells = cells.map(([x, y, c]) => [Math.round(2 * bx) - 1 - x, y, c]);
  if (P.flipY) cells = cells.map(([x, y, c]) => [x, Math.round(2 * by) - 1 - y, c]);
  // a turn (upside down, a spin): each cell of the turned picture takes the colour of the cell it came from, so she stays solid at any angle
  const r = ((P.rot || 0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  if (r > .02 && r < Math.PI * 2 - .02) { const src = new Map(cells.map(([x, y, c]) => [x + ',' + y, c])), cs = Math.cos(r), sn = Math.sin(r), cx = bx, cy = by - 1, turned = [];
    for (let y = -G0; y < SQUID_H + G0; y++) for (let x = -G0; x < SQUID_W + G0; x++) { const dx = x + .5 - cx, dy = y + .5 - cy, c = src.get(Math.floor(cx + dx * cs + dy * sn) + ',' + Math.floor(cy - dx * sn + dy * cs)); if (c) turned.push([x, y, c]); }
    cells = turned; }
  return cells.concat(P.fx);
}
