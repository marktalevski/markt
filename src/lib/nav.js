// The page menu's dots, and how one page hands them to the next.
//
// The menu sits in the top-right corner: four page dots in 24px columns, then three small dots (pages still to come) in 16px columns,
// 12px in from the right and top edges. Every page has the same seven dots somewhere (Home's lines end on them, Sound's are its beat
// pads, the Library's are its books), and when you go from one page to another the dots travel: the page leaving says where its dots
// are, and the page arriving starts its own from there.

/** The seven dots, in menu order. */
export const DOT_KEYS = ['home', 'freediving', 'sound', 'library', 'c4', 'c5', 'c6'];

/** Each dot's colour. */
export const DOT_RGB = {
  home: [20, 20, 20],
  freediving: [24, 88, 224],
  sound: [232, 34, 44],
  library: [255, 196, 0],
  c4: [255, 118, 18],
  c5: [22, 168, 82],
  c6: [138, 64, 214],
};
export const DOT_CSS = Object.fromEntries(DOT_KEYS.map(k => [k, `rgb(${DOT_RGB[k].join(',')})`]));

/** A menu dot's radius: the page dots are 16px across, the small ones 11px. */
export const dotRadius = k => (/^c\d/.test(k) ? 5.5 : 8);

// ---- where the menu's dots are

export const NAV_X = { home: 12, freediving: 36, sound: 60, library: 84, c4: 104, c5: 120, c6: 136 };
export const NAV_W = 156,
  NAV_Y = 28;

/** The centre of dot k in the menu, on a screen W wide (worked out, for pages that draw the dots themselves). */
export const navAt = (W, k) => [W - NAV_W + NAV_X[k === 'ink' ? 'home' : k], NAV_Y];

/** The menu's dot element for k, if this page has an HTML menu. */
export const navDotEl = k => document.querySelector('[data-navk="' + k + '"] [data-navdot]');

/** Where dot k actually is on screen right now (null if it isn't there). */
export const navDot = k => {
  const dot = navDotEl(k);
  if (!dot) return null;
  const r = dot.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
};

/** Every menu dot's place on screen, by key ('ink', Home's black dot, is at home's). */
export const navDots = () => {
  const places = {};
  document.querySelectorAll('[data-navk]').forEach(el => {
    const k = el.getAttribute('data-navk'),
      p = navDot(k);
    if (p) places[k] = p;
  });
  places.ink = places.home;
  return places;
};

// ---- handing the dots from one page to the next

const HANDOFF_KEY = 'nav-from';

/** A page leaving writes where its dots are. (Home's black dot is 'ink' there and 'home' elsewhere, so each is filled in from the other.) */
export const handNavFrom = places => {
  try {
    places.ink = places.ink || places.home;
    places.home = places.home || places.ink;
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(places));
  } catch (e) {}
};

/** The next page takes them, once (they are cleared, so a reload doesn't fly them in again). */
export const takeNavFrom = () => {
  try {
    const places = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || 'null');
    sessionStorage.removeItem(HANDOFF_KEY);
    return places;
  } catch (e) {
    return null;
  }
};
