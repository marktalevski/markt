// The deck's controls: real elements laid over the drawing (so they can be clicked, focused and read out), where they sit, and what
// each one does. The drawing of them is in deck/.
import { deckGeo, deckGeoV, deckScale, rowsOf } from '../lib/deck-layout.js';
import { followDrag } from '../lib/dom.js';
import { TAU, clamp } from '../lib/math.js';
import { DOT_KEYS } from '../lib/nav.js';
import { albums } from './albums.js';
import { SQUID_REACTS } from './squid.js';

// ---- where they sit

/**
 * Puts every hit area over its control. G: the deck's layout on screen; shift: how far the deck has slid down (px).
 * Called every frame; it only touches an element whose place has changed.
 */
export function placeControls(s, G, shift) {
  const hit = s.hit;
  const put = (el, x, y, w, h) => {
    const st = el.style,
      v = [x, y + shift, w, h].map(n => Math.round(n) + 'px');
    if (st.left !== v[0]) st.left = v[0];
    if (st.top !== v[1]) st.top = v[1];
    if (st.width !== v[2]) st.width = v[2];
    if (st.height !== v[3]) st.height = v[3];
    if (st.display === 'none') st.display = '';
  };
  const say = (el, name, value) => {
    if (el.getAttribute(name) !== String(value)) el.setAttribute(name, String(value));
  };

  // the jog wheel, out to its lit rim; the full-screen key is its hub
  const [jx, jy, jr] = G.jog,
    jo = jr + 16,
    hub = jr * 0.3;
  put(hit.jog, jx - jo, jy - jo, jo * 2, jo * 2);
  s.jogCentre = [jx, jy + shift];
  put(hit.full, jx - hub, jy - hub, hub * 2, hub * 2);
  const piece = s.player.piece;
  say(hit.jog, 'aria-valuenow', piece ? Math.round((s.player.position() / piece.tr.dur) * 100) : 0);

  hit.knobs.forEach((el, i) => {
    const [kx, ky] = G.knobs[i],
      half = G.kc / 2;
    put(el, kx - half, ky - half, half * 2, half * 2);
    say(el, 'aria-valuenow', s.knobs[i]);
  });
  const [px, py, pr] = G.play;
  put(hit.play, px - pr, py - pr, pr * 2, pr * 2);
  hit.pads.forEach((el, i) => put(el, ...G.pads[i]));
  hit.cpads.forEach((el, i) => put(el, ...(i < 3 ? G.cpads[i] : G.spare)));
  put(hit.vol, G.vol.x - 14, G.vol.y0 - 6, 28, G.vol.y1 - G.vol.y0 + 12);
  say(hit.vol, 'aria-valuenow', Math.round(s.volume * 100));

  // the track list's rows: as many as the album has pieces
  const rows = rowsOf(G, albums[s.album].tracks.length);
  hit.rows.forEach((el, k) => {
    if (rows[k]) put(el, ...rows[k]);
    else if (el.style.display !== 'none') el.style.display = 'none';
  });
}

// ---- full screen

// pointers over the wave in full screen: a pause sign while a piece plays, a play sign while it is paused, and a drag sign over the
// playhead (black with a white edge so they read on any ground)
const cursor = shapes =>
  'url("data:image/svg+xml,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g fill='#0c0c0c' stroke='#fff' stroke-width='1.5' stroke-linejoin='round'>" +
      shapes +
      '</g></svg>'
  ) +
  '") 16 16, pointer';
const CURSOR_PAUSE = cursor(
  "<rect x='8.5' y='7' width='5.5' height='18' rx='1'/><rect x='18' y='7' width='5.5' height='18' rx='1'/>"
);
const CURSOR_PLAY = cursor("<path d='M10 6.5 L25 16 L10 25.5 Z'/>");
const CURSOR_SCRUB = cursor(
  "<rect x='14.5' y='4' width='3' height='24' rx='1'/><path d='M3.5 16 L11 10.5 L11 21.5 Z'/><path d='M28.5 16 L21 10.5 L21 21.5 Z'/>"
);

/**
 * In full screen there is only the wave, so the page shows two things to help: a key at the bottom to leave by (bright while the
 * mouse moves, faint while it is still) and a pointer that says what a click will do.
 */
export function showFullScreenAids(s) {
  const exit = s.exitKey,
    accent = s.accent,
    awake = s.full && (s.scrub || performance.now() - s.fullMoveAt < 2200);
  if (s.exitKeyColour !== accent.text) {
    s.exitKeyColour = accent.text;
    exit.style.color = accent.text;
    exit.style.borderColor = accent.alpha(0.75);
    exit.style.boxShadow = '0 0 10px ' + accent.alpha(0.35);
  }
  const opacity = String(!s.full ? 0 : awake ? 1 : 0.18);
  if (exit.style.opacity !== opacity) exit.style.opacity = opacity;
  const reach = s.full ? 'auto' : 'none';
  if (exit.style.pointerEvents !== reach) exit.style.pointerEvents = reach;

  const piece = s.player.piece;
  let pointer = '';
  if (s.full && s.fullEase >= 0.5) {
    if (s.scrub) pointer = CURSOR_SCRUB;
    else if (!awake) pointer = 'none';
    else if (piece) pointer = s.nearPlayhead(s.fullPointerX) ? CURSOR_SCRUB : piece.paused ? CURSOR_PLAY : CURSOR_PAUSE;
  }
  if (s.cursor !== pointer) s.root.style.cursor = s.cursor = pointer;
}

// ---- what they do

/** Wires every control to the page. */
export function bindControls(s) {
  const { hit, player } = s;
  const on = (el, events) => Object.entries(events).forEach(([type, fn]) => el.addEventListener(type, fn));

  // the beat pads: the four pages, the three still to come and the spare. Any of them under the pointer (or focused) sets the squid
  // off; a page's pad goes to it; the spare is a kick drum
  [...hit.pads, ...hit.cpads].forEach((el, i) => {
    const over = () => padOver(s, i),
      away = () => {
        if (s.padOver === i) s.padOver = null;
      };
    on(el, { mouseenter: over, mouseleave: away, focus: over, blur: away });
  });
  hit.pads.forEach((el, i) => el.addEventListener('click', e => s.go(DOT_KEYS[i], e)));
  hit.cpads[3].addEventListener('click', () => {
    s.kickAt = performance.now() / 1000; // (on its own clock, which nothing resets)
    player.kick();
  });

  on(hit.jog, {
    pointerdown: e => jogDown(s, e),
    pointermove: e => {
      s.rimOver = onRim(s, e);
      setCursor(e.currentTarget, s.rimOver ? 'pointer' : 'grab');
    },
    mouseenter: () => (s.jogOver = true),
    mouseleave: () => {
      s.jogOver = false;
      s.rimOver = false;
    },
  });

  on(hit.full, {
    click: () => s.goFull(),
    pointerdown: () => (s.fullPressed = true),
    pointerup: () => (s.fullPressed = false),
    mouseenter: () => (s.buttonOver = 'full'),
    mouseleave: () => {
      s.buttonOver = null;
      s.fullPressed = false;
    },
  });
  on(hit.play, {
    click: () => s.playPause(),
    mouseenter: () => (s.buttonOver = 'play'),
    mouseleave: () => (s.buttonOver = null),
  });
  s.exitKey.addEventListener('click', () => s.leaveFull());

  hit.knobs.forEach((el, i) => {
    on(el, {
      pointerdown: e => knobDown(s, i, e),
      pointermove: e => {
        const number = knobAt(knobPlace(s, i), e).number;
        s.knobPoint = number == null ? null : { i, q: number };
        setCursor(e.currentTarget, s.knobHeld === i ? 'grabbing' : 'grab');
      },
      mouseenter: () => (s.knobOver = i),
      mouseleave: () => {
        if (s.knobOver === i) s.knobOver = null;
        s.knobPoint = null;
      },
    });
    // scrolling over a knob turns it (and doesn't change the album: see the page's own wheel handler)
    el.addEventListener('wheel', e => setKnob(s, i, s.knobs[i] + (e.deltaY < 0 ? 1 : -1)), { passive: true });
  });

  hit.vol.addEventListener('pointerdown', e => faderDown(s, e));

  hit.rows.forEach((el, k) => {
    const over = () => (s.rowOver = k),
      away = () => {
        if (s.rowOver === k) s.rowOver = null;
      };
    on(el, {
      click: () => {
        const tr = albums[s.album].tracks[k];
        if (tr) player.select(tr);
      },
      mouseenter: over,
      mouseleave: away,
      focus: over,
      blur: away,
    });
  });

  s.names.forEach((el, i) => el.addEventListener('click', () => s.showAlbum(i)));
}

const setCursor = (el, cursor) => {
  if (el.style.cursor !== cursor) el.style.cursor = cursor;
};

/**
 * A beat pad comes under the pointer: the squid on the screen goes off on a little turn, picked at random (never the same twice
 * running), and then drops off again.
 */
function padOver(s, i) {
  if (s.padOver !== i) {
    let turn;
    do turn = SQUID_REACTS[Math.floor(Math.random() * SQUID_REACTS.length)];
    while (turn === s.squidTurn);
    s.squidTurn = turn;
    s.squidTurnAt = s.time;
  }
  s.padOver = i;
}

// ---- the jog wheel: drag it round to scrub (a turn is six seconds of the piece, clockwise forward; a playing piece jumps along every
// few frames, like tape), or click it to play / pause. Its lit rim is a ring you can press: the top is the start of the piece and it
// runs clockwise to the end, so a click (or a drag along it) jumps straight there. With nothing loaded it starts the album's first
// piece at that point

/** Is the pointer on the jog's rim? */
function onRim(s, e) {
  const r = deckGeo(innerWidth, innerHeight).jog[2],
    d = Math.hypot(e.clientX - s.jogCentre[0], e.clientY - s.jogCentre[1]);
  return d > r + 1 && d < r + 17;
}

/** How far round the rim the pointer is, 0..1 from the top, clockwise. */
function rimAt(s, e) {
  let a = Math.atan2(e.clientX - s.jogCentre[0], -(e.clientY - s.jogCentre[1]));
  if (a < 0) a += TAU;
  return a / TAU;
}

function jogDown(s, e) {
  if (e.button) return;
  e.preventDefault();
  const player = s.player;

  // on the rim: jump there. Held and dragged round it, the piece pauses while the pointer travels and plays on from wherever it is let go
  if (onRim(s, e)) {
    const u = rimAt(s, e);
    if (player.piece) player.seek(u);
    else {
      const first = albums[s.album].tracks[0];
      player.play(first, u * first.dur);
    }
    s.rimHeld = true;
    const resume = player.piece && !player.piece.paused;
    if (resume) player.toggle();
    followDrag(
      ev => player.seek(rimAt(s, ev)),
      () => {
        s.rimHeld = false;
        if (resume && player.piece && player.piece.paused) player.toggle();
      }
    );
    return;
  }

  // on the wheel: turning it scrubs; a click with no turn plays / pauses, like the play button
  const [jx, jy] = s.jogCentre,
    x0 = e.clientX,
    y0 = e.clientY;
  let last = Math.atan2(e.clientY - jy, e.clientX - jx),
    moved = false;
  s.jogDrag = player.piece ? { pos: player.position(), at: 0 } : null; // where the hand has the piece, and when it last jumped there
  followDrag(
    ev => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      moved = true;
      s.jogTurning = true;
      const a = Math.atan2(ev.clientY - jy, ev.clientX - jx);
      let d = a - last;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      last = a;
      s.jogAngle = s.jogAngle + d;
      const piece = player.piece,
        held = s.jogDrag;
      if (!piece || !held) return;
      held.pos = clamp(held.pos + (d / TAU) * 6, 0, piece.tr.dur);
      const now = performance.now();
      if (piece.paused) piece.off = held.pos;
      else if (now - held.at > 70) {
        held.at = now;
        player.play(piece.tr, held.pos);
      }
    },
    () => {
      const held = s.jogDrag,
        piece = player.piece;
      s.jogDrag = null;
      s.jogTurning = false;
      if (!moved) s.playPause();
      else if (piece && held) {
        if (piece.paused) piece.off = held.pos;
        else player.play(piece.tr, held.pos);
      }
    }
  );
}

// ---- the six numbered knobs, a combination lock: each turns through 0..9 and clicks into place on a number. Grab one and turn it
// round (like a real dial: the pointer leans toward the hand, then snaps to the next number with a click), click a number to turn
// straight to it, or scroll over it. Set to 5 2 3 8 6 9 they will open something (still to come); for now every number stays lit
// while it is set, so you can tell

const DEGREES_PER_NUMBER = 300 / 9; // (the dial runs from -150 degrees at 0 to +150 at 9)

/** Knob i on screen: its centre and radius. */
function knobPlace(s, i) {
  const [x, y, r] = deckGeo(innerWidth, innerHeight).knobs[i];
  return [x, y + s.deckShift, r];
}

/**
 * Where the pointer is against a knob: d (px from its centre), angle (degrees round it, 0 at the top, clockwise) and number (the
 * number on its dial the pointer is over, or null).
 */
function knobAt([x, y, r], e) {
  const dx = e.clientX - x,
    dy = e.clientY - y,
    d = Math.hypot(dx, dy),
    angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return {
    d,
    angle,
    number:
      d > r * 1.15 && angle >= -168 && angle <= 168
        ? clamp(Math.round((angle + 150) / DEGREES_PER_NUMBER), 0, 9)
        : null,
  };
}

/** Turns knob i to number v (wrapping round), with its click. */
function setKnob(s, i, v) {
  v = ((v % 10) + 10) % 10;
  const old = s.knobs[i];
  if (old === v) return;
  s.knobs[i] = v;
  s.knobKick[i] = { t: s.time, d: v > old ? 1 : -1 };
  s.player.detent();
  try {
    if (navigator.vibrate && matchMedia('(pointer: coarse)').matches) navigator.vibrate(4);
  } catch (e) {}
}

function knobDown(s, i, e) {
  if (e.button) return;
  e.preventDefault();
  const el = e.currentTarget,
    place = knobPlace(s, i),
    press = knobAt(place, e);
  // turning: the hand's angle round the knob's centre, unwrapped, moves the dial (between its stops at 0 and 9); it settles on the
  // nearest number
  let last = press.angle,
    raw = -150 + s.knobs[i] * DEGREES_PER_NUMBER,
    turned = 0;
  s.knobHeld = i;
  s.knobRaw[i] = raw;
  el.style.cursor = 'grabbing';
  document.body.style.cursor = 'grabbing';
  followDrag(
    ev => {
      const at = knobAt(place, ev);
      if (at.d < 4) return;
      let d = at.angle - last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      last = at.angle;
      turned += Math.abs(d);
      raw = clamp(raw + d, -150, 150);
      s.knobRaw[i] = raw;
      setKnob(s, i, Math.round((raw + 150) / DEGREES_PER_NUMBER));
    },
    () => {
      s.knobHeld = null;
      s.knobRaw[i] = null;
      el.style.cursor = 'grab';
      document.body.style.cursor = '';
      // pressed on a number and let go without turning: straight to that number
      if (turned < 4 && press.number != null) setKnob(s, i, press.number);
    }
  );
}

// ---- the volume fader beside the screen: press or drag anywhere along it

function faderDown(s, e) {
  if (e.button) return;
  e.preventDefault();
  // (kept in the deck's own units, which the drawing uses: on a narrow screen the deck is drawn scaled down)
  const set = y => {
    const scale = deckScale(innerWidth, innerHeight),
      G = deckGeoV(innerWidth / scale, innerHeight / scale);
    s.faderTo = clamp((y - s.deckShift) / scale, G.lo, G.hi);
  };
  set(e.clientY);
  s.faderHeld = true;
  followDrag(
    ev => set(ev.clientY),
    () => (s.faderHeld = false)
  );
}
