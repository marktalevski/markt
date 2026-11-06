// Home: a symbol painted in brush lines. A black ink line draws it and six coloured lines join in; three of the colours end in the
// dots of the site's pages. The black dot at the ink line's end shuffles to another symbol.
//
// This file is the page's state and what a visitor can do. The symbols are in symbols/, where their lines run in layout.js, the
// lines as paint in strokes.js and paint.js, the frame in scene.js, and the ways out in leave.js.
import { BASE } from '../lib/base.js';
import { leaveTo, pageReady } from '../lib/cover.js';
import { startLoop } from '../lib/loop.js';
import { handNavFrom, takeNavFrom } from '../lib/nav.js';
import { LEAVE_PACE } from '../lib/pace.js';
import { paperGrain } from '../lib/paper.js';
import { FADE, fadeTick } from './fade.js';
import { layout } from './layout.js';
import { exitsToFreediving, sndDrop } from './leave.js';
import { DOT_KEYS, LINES } from './lines.js';
import { pickShape } from './pick.js';
import { drawFrame } from './scene.js';
import { SHAPES } from './symbols/index.js';

const isTouch = () => matchMedia('(hover: none)').matches;

class Home {
  constructor(root) {
    // ---- the page's elements
    this.canvas = root.querySelector('.home__canvas');
    this.buttons = {}; // each page's button, which sits on its dot (its label is its only child)
    root.querySelectorAll('.page').forEach(el => (this.buttons[el.dataset.page] = el));
    this.inkButton = root.querySelector('.ink'); // the black dot: shuffle

    // ---- the symbol
    let last = null;
    try {
      last = sessionStorage.getItem('home-shape');
    } catch (e) {}
    this.picked = pickShape(last); // the one for this visit (never the one shown last)
    this.asked = null; // the one a shuffle (or the symbol picker) asked for instead
    this.shapeName = null; // the one laid out (see layout.js, which sets geo, stations, paths and the rest)
    this.geo = this.paths = null;
    this.previous = null; // after a shuffle: the last symbol's lines, which the new one's grow out of
    this.time = 0; // seconds since this symbol began
    this.readyT = undefined; // when it is drawn and the page can be used
    this.frameDt = 0;
    this.heads = {}; // where each line's head is: { p, col, t (when), set }, by dot key

    // ---- arriving from another page: its menu dots are handed over, and each line sets off from its dot
    this.fromDive = /from=dive/.test(location.search);
    const handed = takeNavFrom();
    this.arriving = this.fromDive && handed ? handed : null;

    // ---- leaving
    this.leaving = null; // seconds into leaving
    this.dest = null; // where to, for Sound and the Library (Freediving has its own way out: see leave.js)
    this.exits = this.flyFrom = this.exitHeads = null;
    this.gone = false;

    // ---- what is under the pointer (0 or 1), and the same eased
    this.overDive = this.overDiveT = 0; // the Freediving dot
    this.overPage = {}; // the Sound and Library dots
    this.overPageT = {};
    this.overInk = this.overInkT = 0; // the black dot
    this.inkArmed = false; // on a touch screen: the black dot has been tapped once
    this.fade = LINES.map(() => 0); // how far each line has washed out (see fade.js)
    this.labels = {}; // each page's label on its way out of its dot or back in (see labels.js)

    // ---- painting
    this.grain = paperGrain();
    this.grainPattern = null;
    this.strokeLayer = null; // the finished strokes, kept between frames
    this.strokeSig = null;
    this.layers = {};
    this.stillSig = null;
    this.ready = false; // the first frame has been drawn

    this.listen();
    if (import.meta.env.DEV) {
      window.__home = this; // (a handle for checking the page in development)
      // the symbol picker: a tool for designing the symbols, on your own computer only
      import('../dev/symbol-picker.js').then(({ symbolPicker }) => symbolPicker(this));
    }
    startLoop(dt => this.frame(dt));
  }

  // ---- every frame

  frame(dt) {
    this.time += dt;
    const ease = 1 - Math.exp(-dt * 8);
    this.overDiveT += (this.overDive - this.overDiveT) * ease;
    for (const k of ['sound', 'library'])
      this.overPageT[k] = (this.overPageT[k] || 0) + ((this.overPage[k] || 0) - (this.overPageT[k] || 0)) * ease;
    fadeTick(this, dt);
    this.frameDt = Math.max(0, dt);

    // leaving: the last frame is kept (see Base.astro) and shown by the next page while it loads, so there's no blank moment
    if (this.leaving != null) {
      this.leaving += dt * LEAVE_PACE;
      const toSound = /\/sound\//.test(this.dest || '');
      if (this.leaving > (this.dest ? (toSound ? 1.3 : 2.05) : 4.05) && !this.gone) {
        this.gone = true;
        if (toSound) {
          // Sound picks the menu dots up where they are and drops them onto its beat pads
          const dots = {};
          DOT_KEYS.forEach(k => {
            const from = this.flyFrom && this.flyFrom[k];
            dots[k] = from ? from.p : sndDrop(k, innerWidth, innerHeight);
          });
          handNavFrom(dots);
        }
        leaveTo(this.dest || BASE + 'freediving/?from=home');
      }
    }

    // once the symbol has settled (drawn, its transition over, nothing hovered, fading or with labels moving) the picture doesn't
    // change, so it isn't redrawn every frame; any hover, shuffle or resize wakes it
    const near = (a, b) => Math.abs((a || 0) - (b || 0)) < 0.002,
      still =
        this.leaving == null &&
        !this.previous &&
        this.time > (this.readyT ?? 99) + 3 &&
        near(this.overDiveT, this.overDive) &&
        near(this.overInkT, this.overInk) &&
        ['sound', 'library'].every(k => near(this.overPageT[k], this.overPage[k])) &&
        this.fade.every(c => c === 0 || c === FADE.sweep) &&
        Object.values(this.labels).every(x => x.rest && x.pk == null),
      sig = [
        innerWidth + 'x' + innerHeight,
        this.shapeName,
        this.fade.join(),
        '' + this.overDive + this.overInk + (this.overPage.sound || 0) + (this.overPage.library || 0),
      ].join(':');
    if (still && this.stillSig === sig) return;
    this.stillSig = still ? sig : null;

    drawFrame(this);
    if (!this.ready) {
      this.ready = true;
      pageReady();
    }
  }

  // ---- what a visitor can do

  listen() {
    const on = (el, events) => Object.entries(events).forEach(([type, fn]) => el.addEventListener(type, fn));
    const hover = (el, set) =>
      on(el, { mouseenter: () => set(1), mouseleave: () => set(0), focus: () => set(1), blur: () => set(0) });
    hover(this.buttons.freediving, v => (this.overDive = v));
    hover(this.buttons.sound, v => (this.overPage.sound = v));
    hover(this.buttons.library, v => (this.overPage.library = v));
    this.buttons.freediving.addEventListener('click', () => this.goFreediving());
    this.buttons.sound.addEventListener('click', () => this.goPage('sound'));
    this.buttons.library.addEventListener('click', () => this.goPage('library'));
    on(this.inkButton, {
      mouseenter: () => (this.overInk = 1),
      mouseleave: () => {
        if (!this.inkArmed) this.overInk = 0;
      },
      click: () => this.inkTap(),
    });
  }

  /** Can the page be used yet (the symbol drawn, and not already leaving)? */
  get usable() {
    return this.leaving == null && this.time >= this.readyT;
  }

  /**
   * Touch screens have no hover: the first tap on a page's dot shows its label (only that one: another page's shown label goes), and
   * the second goes there. Says whether this tap was the first.
   */
  tapReveal(pg) {
    if (!isTouch()) return false;
    const label = this.labels[pg];
    if (label && label.on) return false;
    this.overDive = pg === 'freediving' ? 1 : 0;
    this.overPage.sound = pg === 'sound' ? 1 : 0;
    this.overPage.library = pg === 'library' ? 1 : 0;
    if (!this.offTap) {
      // a tap anywhere else puts the label away again
      this.offTap = e => {
        if (e.target.closest && e.target.closest('button[aria-label]')) return;
        this.overDive = 0;
        this.overPage.sound = this.overPage.library = 0;
      };
      document.addEventListener('pointerdown', this.offTap);
    }
    return true;
  }

  /** To Freediving: the lines draw its surface, buoy and flag first, then carry on up into their menu dots. */
  goFreediving() {
    if (!this.usable || this.tapReveal('freediving')) return;
    exitsToFreediving(this);
    this.leaving = 0;
  }

  /** To Sound or the Library: the lines fade and every line's dot flies off, and the page opens with the same dots in place. */
  goPage(pg) {
    if (!this.usable || this.tapReveal(pg)) return;
    this.exits = [];
    this.flyFrom = {};
    DOT_KEYS.forEach(k => {
      const head = this.heads[k];
      if (head) this.flyFrom[k] = { p: head.p.slice(), col: head.col };
    });
    this.dest = pg === 'sound' ? BASE + 'sound/?from=page' : BASE + 'library/';
    this.leaving = 0;
  }

  /**
   * Paints another symbol: the lines of this one flow on into the next. With no name it picks one (the black dot); the symbol
   * picker passes a name. Says whether it could (not while a symbol is still being drawn).
   */
  shuffle(name) {
    if (!this.paths || !this.usable) return false;
    this.previous = this.paths.map(P => {
      const from = P.cut0 || 0;
      return { pts: P.pts.slice(from), z: P.zA.slice(from), cw: P.cw.slice(from), wt: P.wt.slice(from) };
    });
    this.asked = SHAPES.includes(name) ? name : pickShape(this.shapeName);
    layout(this, this.geo.W, this.geo.H);
    this.time = 0;
    return true;
  }

  /**
   * The black dot. With a mouse, hovering it fades the coloured lines and a click shuffles. On a touch screen (no hover) it takes two
   * taps: the first fades the coloured lines, the second shuffles (the new symbol comes in with every line showing); a tap anywhere
   * else undoes the first.
   */
  inkTap() {
    if (!isTouch()) {
      this.shuffle();
      return;
    }
    const disarm = () => {
      this.inkArmed = false;
      this.overInk = 0;
      if (this.offInk) {
        document.removeEventListener('pointerdown', this.offInk, true);
        this.offInk = null;
      }
    };
    if (!this.inkArmed) {
      this.inkArmed = true;
      this.overInk = 1;
      this.offInk = e => {
        if (!this.inkButton.contains(e.target)) disarm();
      };
      document.addEventListener('pointerdown', this.offInk, true);
      return;
    }
    disarm();
    this.shuffle();
  }
}

new Home(document.querySelector('.home'));
