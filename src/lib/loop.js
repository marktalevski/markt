// The frame loop every animated page runs on, and what keeps its frames even on a device that can't keep up.
//
// A page draws once for each frame the screen shows. A device that takes longer than that over some frames shows them late: some
// frames stay up twice as long as others, and the motion stutters. Slower but even looks far better than faster but uneven, so when
// frames keep coming late the loop settles the page at a pace the device can hold:
//   - if it may be the drawing that is slow, the canvases are made of fewer pixels (pixelScale): a little softer, just as smooth.
//     That is kept only if the frames do then come faster
//   - otherwise a frame is drawn for every second (or third) frame of the screen: slower, but perfectly regular
// It goes back up when the device has room to spare again. A device that keeps up never sees any of this.

/**
 * How finely the canvases are drawn, against how they are on a device that keeps up: the steps down. (A screen of ordinary sharpness
 * has less to give away.)
 */
const SCALES = (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) >= 1.5 ? [1, 0.7, 0.5] : [1, 0.75];
/** No frame is longer than this (ms): the pages' animations run by the clock, and never step further than this at once. */
const LONGEST_FRAME = 50;

const pace = {
  scale: 0, // which of SCALES the canvases are drawn at
  every: 1, // a frame is drawn for every this many of the screen's
};
// (the frame meter shows it)
if (typeof window !== 'undefined') window.__pace = () => ({ pixels: SCALES[pace.scale], every: pace.every });

let sharp = false;
/** The size of a canvas pixel: how many to each CSS pixel, on this screen and at the pace the device holds. */
export const pixelScale = () => Math.min(2, devicePixelRatio || 1) * (sharp ? 1 : SCALES[pace.scale]);

/** Draws at full sharpness whatever the pace: for a picture that is about to stay up, when one slow frame won't show. */
export function atFullSharpness(draw) {
  sharp = true;
  try {
    draw();
  } finally {
    sharp = false;
  }
}

/** Some spacings' middle value, and whether they are even: most of them (seven in ten) within 15% of it. */
function usualOf(spacings) {
  const usual = spacings.slice().sort((a, b) => a - b)[spacings.length >> 1];
  return { usual, even: spacings.filter(d => Math.abs(d - usual) < usual * 0.15).length >= spacings.length * 0.7 };
}

// ---- the screen's own frame time

/** The screen's frame (ms): taken to be a sixtieth of a second, until the browser's frame callbacks show otherwise. */
let screenFrame = 1000 / 60;
const callbacks = []; // how far apart the last forty came

/**
 * A faster screen shows itself: the callbacks come evenly, and closer together. (Further apart says nothing by itself: a page that
 * takes two of the screen's frames over every one of its own looks just like a screen half as fast.)
 */
function learnScreenFrame(spacing) {
  callbacks.push(spacing);
  if (callbacks.length > 40) callbacks.shift();
  if (callbacks.length < 12) return;
  const { usual, even } = usualOf(callbacks);
  if (even && usual < screenFrame * 0.9) {
    // the page keeps the pace it had settled at, counted in the new frames
    if (pace.every > 1) pace.every = Math.round((pace.every * screenFrame) / usual);
    screenFrame = usual;
    pace.every = Math.min(pace.every, slowestPace());
    newSpell();
  }
}

/** The most of the screen's frames that one of the page's may take. */
const slowestPace = () => Math.max(1, Math.floor((LONGEST_FRAME + 1) / screenFrame));

// ---- watching how the frames go, and settling the pace

/** Frames are judged a spell at a time: this many of them, or the ones drawn in this long (ms) if that is fewer. */
const SPELL = 30,
  SPELL_TIME = 700;
/** A spell with this share of its frames late is a bad one. Two bad spells running, and the device isn't keeping up... */
const BAD = 1 / 6;
/** ...and with this share, one spell is enough. (A single hiccup, like a page still loading, is neither.) */
const CLEARLY_BAD = 1 / 2;
/** How long every frame must have come on time before more pixels are tried again (ms). */
const SHARPEN_AFTER = 20000;

const watch = {
  spell: [], // this spell's frames so far: how far apart each came from the one before (ms)
  spellFrom: 0, // when it began
  late: 0, // how many of its frames came late
  badSpells: 0, // bad spells in a row
  work: 0, // how long the page takes over a frame, ms (smoothed)
  restUntil: 0, // nothing is counted until then (the page has only just started or come back, or the pace has just changed)
  calmSince: 0, // since when every frame has come on time
  slowedForPage: false, // the pace was last slowed because the page's own work was what took long
  patience: 4000, // how long they must, before the pace is tried a step up (doubled each time a step up doesn't last)
  triedUpAt: -1e9,
  triedSharper: false, // more pixels have been tried again this visit
  trial: null, // fewer pixels are being tried: see tryFewerPixels
  pixelsHelp: true, // (until fewer pixels turn out not to make the frames faster: then they aren't tried again in this tab)
};
function newSpell() {
  watch.spell = [];
  watch.late = 0;
  watch.badSpells = 0;
}

const remembered = () => 'pace:' + location.pathname;
/**
 * A page starts one step up from where its last visit (in this tab) settled: back there within a second if the device is as it was,
 * and better off if that was only a bad moment.
 */
function recallPace() {
  try {
    watch.pixelsHelp = sessionStorage.getItem('pace:pixels') !== 'no';
    const [scale, every] = JSON.parse(sessionStorage.getItem(remembered()) || '[0,1]');
    pace.scale = watch.pixelsHelp ? Math.max(0, Math.min(SCALES.length - 1, scale | 0)) : 0;
    pace.every = Math.max(1, Math.min(6, every | 0));
    stepUp();
  } catch (e) {}
}
function stepUp() {
  if (pace.every > 1) pace.every--;
  else if (pace.scale > 0) pace.scale--;
}
/** Tells the next visit where this one has settled. */
function remember() {
  try {
    sessionStorage.setItem(remembered(), JSON.stringify([pace.scale, pace.every]));
    if (!watch.pixelsHelp) sessionStorage.setItem('pace:pixels', 'no');
  } catch (e) {}
}
/** The pace has changed: a fresh start for the watching. */
function settle(now) {
  newSpell();
  watch.restUntil = now + 400; // (resizing the canvases takes a moment itself)
  watch.calmSince = 0;
  remember();
}

/**
 * A slower pace, to suit how the frames of a spell came (spell: their spacings; usual, even: see usualOf). Says whether there was
 * one to take.
 */
function slowDown(spell, usual, even) {
  const was = pace.every,
    wasFrame = screenFrame,
    frames = usual / screenFrame;
  if (even && Math.round(frames) > pace.every) {
    // they came evenly, only slowly: that pace, if it is a whole number of the screen's frames...
    if (Math.abs(frames - Math.round(frames)) < 0.15) pace.every = Math.round(frames);
    // ...and if it isn't, it is the screen's own after all (one that shows fewer frames a second than most)
    else if (usual <= LONGEST_FRAME) {
      screenFrame = usual;
      pace.every = 1;
    } else pace.every = slowestPace();
  } else {
    // they came unevenly: the pace that three in four of them kept
    const most = spell.slice().sort((a, b) => a - b)[Math.floor(spell.length * 0.75)];
    pace.every = Math.max(pace.every + 1, Math.round(most / screenFrame));
  }
  pace.every = Math.max(1, Math.min(pace.every, slowestPace()));
  return pace.every !== was || screenFrame !== wasFrame;
}

/** The device isn't keeping up: fewer pixels, or a slower pace. */
function easeOff(now, spell, usual, even) {
  // (it had just been tried a step up, and that didn't last: wait twice as long before the next try)
  if (now - watch.triedUpAt < 3000) watch.patience = Math.min(60000, watch.patience * 2);
  const canShrink = watch.pixelsHelp && pace.scale < SCALES.length - 1,
    // the page's own work takes under half of each frame: the rest is the drawing, which fewer pixels may speed up
    drawingMayBeSlow = watch.work < 0.5 * usual;
  // fewer pixels first if the drawing may be slow; and last, when there is no slower pace left to take
  if (!(canShrink && drawingMayBeSlow) && slowDown(spell, usual, even)) {
    watch.slowedForPage = !drawingMayBeSlow;
    return settle(now);
  }
  if (!canShrink) return;
  pace.scale++;
  watch.trial = { fewer: true, before: usual };
  settle(now);
}

/**
 * Fewer pixels are on trial, a spell at a time (usual: how far apart this spell's frames came). They stay if the frames came faster
 * for them. If the frames came just as before, the pixels are put back for a spell: should the frames come no slower for that
 * either, it isn't the drawing that is slow, and fewer pixels aren't tried again. (The page's own load changes from moment to
 * moment, which is why it takes the second look.) Says whether the pace was changed here.
 */
function tryFewerPixels(now, usual) {
  const trial = watch.trial;
  watch.trial = null;
  if (trial.fewer) {
    // faster for it (or slower, for some other reason): kept
    if (usual < trial.before * 0.95 || usual > trial.before * 1.1) return false;
    pace.scale--;
    watch.trial = { fewer: false, during: usual };
  } else if (usual > trial.during * 1.1) pace.scale++;
  else {
    watch.pixelsHelp = false;
    remember();
    return false;
  }
  settle(now);
  return true;
}

/** Is it time to try a step up? */
function roomToSpare(now) {
  const calm = watch.calmSince ? now - watch.calmSince : 0;
  // a slower pace: once the page's own work takes little enough, the next pace up will hold it. (That is known at once if the work
  // was what took long, as in a page's busiest moments; if it wasn't, it is only a hope, to be tried with patience)
  if (pace.every > 1)
    return calm > (watch.slowedForPage ? 1000 : watch.patience) && watch.work < 0.3 * (pace.every - 1) * screenFrame;
  // fewer pixels were for the drawing, which can't be timed from here: all there is to do is try, so that is done once a visit
  return pace.scale > 0 && !watch.triedSharper && calm > SHARPEN_AFTER;
}

/** After each frame drawn: how long since the last one, and how long the page took over it (ms). */
function frameDrawn(now, spacing, took) {
  watch.work += (took - watch.work) * (watch.work ? 0.1 : 1);
  if (now < watch.restUntil) return;
  if (!watch.spell.length) watch.spellFrom = now - spacing;
  watch.spell.push(spacing);
  // late: a whole frame of the screen (or more) after its turn
  if (spacing > (pace.every + 0.4) * screenFrame) {
    watch.late++;
    watch.calmSince = 0;
  } else if (!watch.calmSince) watch.calmSince = now;
  const frames = watch.spell.length;
  if (frames < SPELL && (frames < 8 || now - watch.spellFrom < SPELL_TIME)) return;

  // the spell is over: how did it go?
  const spell = watch.spell,
    late = watch.late,
    bad = late >= Math.max(2, frames * BAD),
    badSpells = bad ? watch.badSpells + 1 : 0,
    { usual, even } = usualOf(spell);
  newSpell();
  watch.badSpells = badSpells;
  if (watch.trial && tryFewerPixels(now, usual)) return;
  if (late >= frames * CLEARLY_BAD || badSpells >= 2) easeOff(now, spell, usual, even);
  else if (!bad && roomToSpare(now)) {
    if (pace.every === 1) watch.triedSharper = true;
    stepUp();
    watch.triedUpAt = now;
    settle(now);
  }
}

/**
 * Calls frame(dt, now) for every frame to draw. dt is the seconds since the last one, never more than 0.05: after a long pause (a
 * busy moment, a tab left in the background) the animation carries on from where it was instead of jumping ahead.
 */
export function startLoop(frame) {
  let lastCallback = 0,
    lastDrawn = 0;
  recallPace();
  const tick = now => {
    requestAnimationFrame(tick);
    // (the first callback has nothing to measure from, and a gap of a fifth of a second is a pause, not a slow frame: after either,
    // the page is given a moment to get going before its frames are judged)
    const sinceCallback = now - lastCallback,
      measured = lastCallback > 0 && sinceCallback > 0 && sinceCallback < 200;
    lastCallback = now;
    if (measured) learnScreenFrame(sinceCallback);
    else {
      newSpell();
      watch.restUntil = now + 1500;
    }
    // not this frame's turn (a little early counts: the callbacks' times wobble)
    if (pace.every > 1 && lastDrawn && now - lastDrawn < (pace.every - 0.25) * screenFrame) return;

    const sinceDrawn = now - (lastDrawn || now),
      started = performance.now();
    lastDrawn = now;
    frame(Math.min(0.05, sinceDrawn / 1000), now);
    if (measured) frameDrawn(now, sinceDrawn, performance.now() - started);
  };
  requestAnimationFrame(tick);
}
