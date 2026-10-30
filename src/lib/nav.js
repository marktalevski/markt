// The page menu in the top-right corner: four page dots in 24px columns, then the three small dots to come in 16px columns, 12px in from
// the right and top edges. Pages that draw their own dots (Home's strokes end on them) take the positions from here, so they land exactly
// where the HTML menu puts them. navAt(W, k): the centre of dot k on a screen W wide
export const NAV_X = { home: 12, freediving: 36, sound: 60, library: 84, c4: 104, c5: 120, c6: 136 };
export const NAV_W = 156, NAV_Y = 28;
export const navAt = (W, k) => [W - NAV_W + NAV_X[k === 'ink' ? 'home' : k], NAV_Y];
// where the HTML menu's dots actually are on screen: navDot(k) the centre of dot k (null if it isn't there), navDots() every dot by key,
// with 'ink' (Home's black dot) at home's; this is what a page writes to sessionStorage 'nav-from' to hand its dots over
export const navDotEl = k => document.querySelector('[data-navk="' + k + '"] [data-navdot]');
export const navDot = k => { const d = navDotEl(k); if (!d) return null; const r = d.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
export const navDots = () => { const o = {}; document.querySelectorAll('[data-navk]').forEach(el => { const k = el.getAttribute('data-navk'), p = navDot(k); if (p) o[k] = p; }); o.ink = o.home; return o; };
// handing the dots over: a page leaving writes where its dots are (handNavFrom; Home's black dot is 'ink' there and 'home' here, so each
// is filled in from the other), and the next page takes them once (takeNavFrom, which clears them so a reload doesn't fly them in again)
export const handNavFrom = o => { try { o.ink = o.ink || o.home; o.home = o.home || o.ink; sessionStorage.setItem('nav-from', JSON.stringify(o)); } catch (e) {} };
export const takeNavFrom = () => { try { const v = JSON.parse(sessionStorage.getItem('nav-from') || 'null'); sessionStorage.removeItem('nav-from'); return v; } catch (e) { return null; } };
// going to the next page: through Base.astro's __leave, which keeps this page's last picture up until the next one is ready
export const leaveTo = href => (window.__leave || (h => { location.href = h; }))(href);
