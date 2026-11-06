// The album clock, in the tall display beside the screen: a flip counter showing the album's number, and the album names rolling
// through the display round it. They are real elements over the drawing (see sound.astro), moved here every frame.
import { deckGeo, deckScale } from '../lib/deck-layout.js';
import { clamp, easeInOut } from '../lib/math.js';
import { pad2 } from './albums.js';

/** Writes the counter's numbers: the album showing, and the one it is flipping from. */
export function showAlbumNumber(s) {
  const to = pad2(s.album + 1),
    from = pad2((s.flipFrom ?? s.album) + 1);
  s.counter.to.forEach(el => (el.textContent = to));
  s.counter.from.forEach(el => (el.textContent = from));
}

/**
 * The counter flips like a clock: the old number's top half folds down, then the new number's bottom half lands. (The halves that
 * don't move show the new number's top and the old number's bottom; once the flap has landed they both show the new one.)
 */
export function stepFlip(s) {
  const top = s.flapTop.style,
    bottom = s.flapBottom.style,
    ft = s.flipStart == null ? 2 : (s.time - s.flipStart) / 0.6;
  if (ft >= 1) {
    // landed (the bottom flap stays where it came down)
    if (s.flipFrom != null && s.flipFrom !== s.album) {
      s.flipFrom = s.album;
      showAlbumNumber(s);
    }
    return;
  }
  const e = easeInOut(clamp(ft, 0, 1));
  top.visibility = e < 0.5 ? 'visible' : 'hidden';
  top.transform = 'rotateX(' + (-180 * e).toFixed(1) + 'deg)';
  bottom.visibility = e >= 0.5 ? 'visible' : 'hidden';
  bottom.transform = 'rotateX(' + (180 - 180 * e).toFixed(1) + 'deg)';
}

/**
 * Puts the clock over its display and rolls the names. The current album's name sits just off the counter: below it when it rolled
 * in from below (scrolling on), above it when it came from above (scrolling back). The others sit further out in order, the album
 * before above and the one after below.
 */
export function placeClock(s, dt) {
  const box = s.clock,
    st = box.style,
    ds = deckScale(innerWidth, innerHeight),
    [x, y, w, h] = deckGeo(innerWidth, innerHeight).clockScr,
    // (laid out at the deck's own size and scaled down with it on a narrow screen)
    width = w / ds,
    height = h / ds;
  const place = [x + 'px', (y + s.deckShift).toFixed(1) + 'px', width + 'px', height + 'px'];
  if (st.left !== place[0]) st.left = place[0];
  if (st.top !== place[1]) st.top = place[1];
  if (st.width !== place[2]) st.width = place[2];
  if (st.height !== place[3]) st.height = place[3];
  const scale = ds < 1 ? 'scale(' + ds.toFixed(4) + ')' : '';
  if (st.transform !== scale) st.transform = scale;

  // the counter and the current name take the deck's accent colour
  const accent = s.accent;
  if (st.getPropertyValue('--accent-text') !== accent.text) {
    st.setProperty('--accent-text', accent.text);
    st.setProperty('--accent-glow', accent.alpha(0.6));
    st.setProperty('--accent', accent.line);
    st.setProperty('--accent-halo', accent.alpha(0.75));
  }

  const dir = s.albumDir,
    near = 56,
    step = Math.min(22, (height / 2 - near - 8) / 1.5),
    half = height / 2;
  s.names.forEach((el, j) => {
    const d = j - s.album;
    // its slot: the current name on its side of the counter; its neighbours stepping outwards (the ones on the current name's side
    // go beyond it)
    let slot;
    if (d === 0) slot = dir * near;
    else if (Math.sign(d) === dir) slot = dir * (near + Math.abs(d) * step);
    else slot = -dir * (near + (Math.abs(d) - 1) * step);
    const was = s.nameY[j] ?? slot,
      yy = (s.nameY[j] = was + (slot - was) * Math.min(1, dt * 7));
    const opacity = d === 0 ? 1 : clamp(1 - (Math.abs(yy) - near) / (step * 2.4), 0, 1) * 0.5,
      inside = Math.abs(yy) < half - 6;
    el.style.top = (half + yy).toFixed(1) + 'px';
    el.style.opacity = (inside ? opacity : 0).toFixed(3);
    el.style.pointerEvents = inside && opacity > 0.2 ? '' : 'none';
    el.classList.toggle('is-current', d === 0);
  });
}
