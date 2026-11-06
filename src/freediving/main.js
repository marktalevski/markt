// Freediving: the dive log as a dive. A rope hangs from a buoy on the surface; each entry is a dot on the rope, deeper than the last,
// and scrolling takes you down it: the water darkens, an orange line follows you to the nearest entry, and a squid keeps you company.
//
// This file is the page's state and its frame-by-frame logic; the painting is in scene.js and the placing of the entries in layout.js.
import { entries as published } from '../../public/data/site.json';
import { BASE } from '../lib/base.js';
import { startLoop } from '../lib/loop.js';
import { clamp, rng, smooth, smoother } from '../lib/math.js';
import { bindMenu } from '../lib/menu.js';
import { handNavFrom, leaveTo, navDot, navDotEl, navDots, pageReady, takeNavFrom } from '../lib/nav.js';
import { LEAVE_PACE } from '../lib/pace.js';
import { paperGrain } from '../lib/paper.js';
import { buildEntries, closeCard, diveLog, openCard } from './entries.js';
import { layout } from './layout.js';
import { PAGE_DRAIN, SWIRL, drawFrame } from './scene.js';

const pad2 = n => String(n).padStart(2, '0');

class Freediving {
  constructor(root) {
    // ---- the page's elements
    this.root = root;
    this.canvas = root.querySelector('.freediving__water'); // the water, the rope and everything on it
    this.waveCanvas = root.querySelector('.freediving__surface'); // the surface lines and colour threads, above it
    this.world = root.querySelector('.world'); // the entries; it slides up as you dive
    this.chrome = root.querySelector('.chrome'); // the depth read-out
    this.depthText = root.querySelector('.chrome__depth');
    this.counterText = root.querySelector('.chrome__counter');
    this.menu = root.querySelector('.menu');
    this.menuItems = [...this.menu.querySelectorAll('.menu__item')].map(el => ({
      nameBox: el.querySelector('.menu__name-box'),
      dot: el.querySelector('[data-navdot]'),
    }));

    // ---- the dive
    this.depth = -1; // where the view is: -1 the surface, 0 the first entry, 1 the second, ... (it eases towards `target`)
    this.target = -1; // where scrolling has asked it to be
    this.focus = -1; // the entry nearest the view (-1: none, at the surface)
    this.open = null; // the entry whose card is open
    this.time = 0; // seconds the page has been running
    this.sizes = {}; // each entry's extra height (an open card under it, on narrow screens), eased
    this.entryY = []; // each entry's place down the rope, px
    this.ropeEnd = 0;
    this.ink = '#141414'; // the page's own text colour, following the water behind it
    this.entries = buildEntries(this.world, diveLog(published), i => this.pick(i));
    this.count = this.entries.length;

    // ---- arriving. The page comes in in order: the surface lines draw (they are already there when arriving from Home), the water
    // rises up to them, then the rope goes down as the entries come in, and the squid arrives last
    this.introT = 0; // seconds into the arrival
    this.introDone = false;
    if (/from=home/.test(location.search)) {
      // from Home, which has already drawn the surface and the buoy
      this.introT = 1;
      this.fromHome = true;
      this.skipWaves = true;
    } else if (/from=(sound|page)/.test(location.search)) {
      // from Sound or the Library: their dots are handed over (see arrival.js) and draw the surface themselves
      const handed = takeNavFrom();
      if (handed && handed.home && handed.freediving) {
        this.handed = handed;
        this.skipWaves = true;
      }
    }
    this.dropT = this.handed ? 2.75 : 1.6; // when the buoy drops in
    this.tideStart = this.fromHome ? 2.0 : this.handed ? 3.25 : 2.15; // when the water starts to rise
    this.tideEnd = this.tideStart + 1.5;
    this.introEnd = this.tideEnd + 1.15;

    // ---- leaving (see goHome and goPage)
    this.homeLeaveT = null; // seconds into leaving for Home
    this.pageLeave = null; // leaving for Sound or the Library: { href, k, t, nav }

    // ---- what drifts in the water: bubbles by the rope, marine snow, streaks of light near the surface. (Each takes its numbers
    // from the same run, at the place in it they have always come from, so they sit where they always have.)
    const GRAIN_PIXELS = 220 * 220;
    let random = rng(11, GRAIN_PIXELS);
    this.bubbles = Array.from({ length: 10 }, () => ({
      x: -22 + random() * 14,
      y: random(),
      r: 1.5 + random() * 3,
      v: 0.02 + random() * 0.03,
      ph: random() * 6.28,
    }));
    random = rng(11, GRAIN_PIXELS + 50 + 284);
    this.snow = Array.from({ length: 36 }, () => ({
      x: random(),
      y: random(),
      r: 0.6 + random() * 1.8,
      near: random() < 0.35,
    }));
    random = rng(11, GRAIN_PIXELS + 50 + 284 + 144 + 33);
    this.streaks = Array.from({ length: 3 }, (_, i) => ({ m: 0.5 + i * 0.6, ph: random() * 6.28 }));
    this.grain = paperGrain();

    this.listen();
    if (import.meta.env.DEV) window.__dive = this; // (a handle for checking the page in development)
    startLoop(dt => this.frame(dt));
  }

  // ---- input

  listen() {
    addEventListener('wheel', e => this.wheel(e), { passive: false });
    addEventListener('keydown', e => this.key(e));
    addEventListener('pointerdown', () => this.skipIntro());
    addEventListener('touchstart', e => (this.touchY = e.touches[0].clientY), { passive: true });
    addEventListener(
      'touchmove',
      e => {
        const t = e.touches[0];
        if (this.touchY == null) return;
        if (e.target.closest && e.target.closest('[data-scroll]')) return; // (a card scrolls its own text)
        e.preventDefault();
        this.push((this.touchY - t.clientY) * 1.2);
        this.touchY = t.clientY;
      },
      { passive: false }
    );
    bindMenu(this.menu, {
      home: e => this.goHome(e),
      freediving: () => this.goSurface(),
      sound: this.goPage('sound'),
      library: this.goPage('library'),
    });
  }

  /** Any input during the arrival skips to its end. */
  skipIntro() {
    if (!this.introDone) this.introT = Math.max(this.introT, this.introEnd);
  }

  wheel(e) {
    // over an open card, the wheel scrolls the card's text until it runs out
    const card = e.target.closest && e.target.closest('[data-scroll]');
    if (card) {
      const dy = e.deltaY;
      if ((dy > 0 && card.scrollTop + card.clientHeight < card.scrollHeight - 1) || (dy < 0 && card.scrollTop > 0))
        return;
    }
    e.preventDefault();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 32;
    if (!dy) dy = e.deltaX;
    this.push(dy);
  }

  /** Scrolls the dive by dy pixels of wheel or finger travel: one entry's spacing takes you one entry down. */
  push(dy) {
    if (!this.introDone) {
      this.skipIntro();
      return;
    }
    if (!this.count) return;
    const y = this.entryY,
      n = y.length,
      f = this.target;
    let spacing = y[0] || 200;
    if (f >= 0 && n > 1) {
      const i = Math.min(n - 2, Math.floor(f));
      spacing = y[i + 1] - y[i];
    }
    this.target = clamp(this.target + dy / spacing, -1, this.count - 1);
  }

  key(e) {
    if (!this.introDone) {
      this.skipIntro();
      return;
    }
    const k = e.key;
    if (k === 'Escape') {
      if (this.open != null) this.closeCard();
      else this.goSurface();
      return;
    }
    if (k === 'Enter') {
      const i = Math.round(this.target);
      if (i >= 0) this.pick(i);
      return;
    }
    const step = k === 'ArrowDown' || (k === ' ' && !e.shiftKey) ? 1 : k === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    this.target = clamp(Math.round(this.target) + step, -1, this.count - 1);
  }

  /**
   * An entry's card opens only when it is asked for (a tap or click on the entry, or Enter), never just by scrolling past it, so
   * scrolling stays free; asking again closes it, and scrolling away from it closes it too.
   */
  pick(i) {
    this.target = i;
    const wasOpen = this.open === i;
    this.closeCard();
    if (!wasOpen) {
      this.open = i;
      openCard(this.entries[i]);
    }
  }

  closeCard() {
    if (this.open != null) closeCard(this.entries[this.open]);
    this.open = null;
  }

  goSurface() {
    this.target = -1;
    this.closeCard();
  }

  // (a leave, once asked for, is the only one: going Home waits up to 1.3 s for the page to rise to the surface first, so homeAsked,
  // not homeLeaveT, is what keeps a second click, or a click on another page, from starting another)
  goHome(e) {
    e.preventDefault();
    if (this.homeAsked || this.pageLeave) return;
    this.homeAsked = true;
    const places = navDots();
    handNavFrom(places);
    const deep = this.depth > -0.9;
    this.goSurface();
    this.menuAt = places;
    setTimeout(() => (this.homeLeaveT = 0), deep ? 1300 / LEAVE_PACE : 0);
  }

  goPage(k) {
    return e => {
      if (e) e.preventDefault();
      if (this.homeAsked || this.pageLeave) return;
      this.pageLeave = {
        href: k === 'sound' ? BASE + 'sound/?from=page' : BASE + 'library/',
        t: 0,
        k,
        nav: { c4: navDot('c4'), sound: navDot('sound') },
      };
    };
  }

  // ---- one frame

  frame(dt) {
    this.time += dt;
    this.stepTide();
    this.stepHomeLeave(dt);
    this.stepArrivalNames();
    this.stepIntro(dt);
    this.stepDive(dt);
    this.stepPageLeave(dt);
    // how far through the dive the view is (0..1), eased: the light's tints follow it (palette.js)
    if (this.introDone && this.count) {
      const now = clamp((this.depth + 1) / this.count, 0, 1);
      this.diveFraction = (this.diveFraction || 0) + (now - (this.diveFraction || 0)) * (1 - Math.exp(-dt * 1.5));
    }
    drawFrame(this);
    if (!this.readied) {
      this.readied = true;
      pageReady();
    }
  }

  /** The tide: arriving, the water rises from below the screen up to the surface line; leaving for Home, it sinks away again. */
  stepTide() {
    if (this.homeLeaveT != null && this.menuAt) {
      const e = smoother(clamp((this.homeLeaveT - 1.75) / 1.4, 0, 1)),
        dy = innerHeight * 1.05 * e,
        sway = Math.sin(this.homeLeaveT * 2.4) * 6 * (1 - e);
      this.tideY = dy + sway;
      this.chrome.style.transform = 'translateY(' + (dy + sway).toFixed(1) + 'px)';
    }
    if (this.homeLeaveT == null) {
      const e = smoother(clamp((this.introT - this.tideStart) / 1.5, 0, 1)),
        dy = innerHeight * 1.05 * (1 - e),
        sway = Math.sin(this.introT * 2.4) * 6 * (1 - e);
      this.tideY = this.introDone ? 0 : dy + sway;
      this.chrome.style.transform = this.tideY ? 'translateY(' + this.tideY.toFixed(1) + 'px)' : 'none';
    }
  }

  /** Leaving for Home: the clock runs (scene.js reels the colours in by it); near the end each menu name is drawn up into its dot. */
  stepHomeLeave(dt) {
    if (this.homeLeaveT == null) return;
    this.homeLeaveT += dt * LEAVE_PACE;
    this.menuItems.forEach(({ nameBox, dot }, i) => {
      // rising, narrowing, softening
      const k = clamp((this.homeLeaveT - SWIRL * 0.85 - i * 0.1) / 0.75, 0, 1),
        e = k * k * (3 - 2 * k);
      nameBox.style.transformOrigin = '50% 0';
      nameBox.style.transform =
        'translateY(' +
        (-30 * e).toFixed(1) +
        'px) scaleY(' +
        (1 - 0.85 * e).toFixed(3) +
        ') scaleX(' +
        (1 - 0.5 * e).toFixed(3) +
        ')';
      nameBox.style.opacity = (1 - e).toFixed(3);
      nameBox.style.filter = e > 0.02 ? 'blur(' + (2.5 * e).toFixed(2) + 'px)' : '';
      if (k > 0) {
        const u = clamp((k - 0.55) / 0.45, 0, 1);
        dot.style.transform = 'scale(' + (1 + 0.18 * Math.sin(Math.PI * u)).toFixed(3) + ')';
      }
    });
    if (this.homeLeaveT > SWIRL * 0.85 + 1.25 && !this.left) {
      this.left = true;
      leaveTo(BASE + '?from=dive');
    }
  }

  /** Arriving from another page, the menu's names fade in once its dots have landed. */
  stepArrivalNames() {
    if (!(this.fromHome || this.handed) || this.namesShown) return;
    const k = this.introDone ? 1 : smooth(clamp((this.introT - (this.handed ? 3 : 1.3)) / 0.9, 0, 1));
    if (this.handed && k >= 1) this.menu.querySelectorAll('[data-navdot]').forEach(dot => (dot.style.opacity = '1'));
    for (const { nameBox } of this.menuItems) nameBox.style.opacity = k.toFixed(3);
    if (k >= 1) this.namesShown = true;
  }

  stepIntro(dt) {
    if (!this.introDone) {
      this.introT += dt;
      if (this.introT >= this.introEnd) this.introDone = true;
    }
    // the arrival skipped (or left) before the orange and red dots finished colouring the buoy and flag: their menu dots come back regardless
    if (!this.paintDone && (this.introDone || this.homeLeaveT != null || this.pageLeave)) {
      this.paintDone = true;
      this.painted = { c4: true, sound: true };
      for (const k of ['c4', 'sound']) {
        const dot = navDotEl(k);
        if (dot) dot.style.opacity = '1';
      }
    }
  }

  /**
   * The dive follows the scroll closely (a time constant of 1/11 s): smooth, without trailing behind slow scrolling. The cards, the
   * orange line and the squid each follow it in turn, so their rates are kept quick too, or their lags would add up.
   */
  stepDive(dt) {
    this.depth += (this.target - this.depth) * (1 - Math.exp(-dt * 11));
    if (Math.abs(this.target - this.depth) < 0.0002) this.depth = this.target;
    // scrolling away from an open card closes it (once this frame is laid out: its height still counts for this frame)
    const closing = this.open != null && Math.abs(this.target - this.open) > 0.6 ? this.entries[this.open] : null;
    if (closing) this.open = null;
    const focus = this.depth > -0.5 && this.count ? clamp(Math.round(this.depth), 0, this.count - 1) : -1;
    if (focus !== this.focus) {
      this.focus = focus;
      this.counterText.textContent = focus >= 0 ? `${pad2(focus + 1)} / ${pad2(this.count)}` : '';
    }
    layout(this, dt);
    if (closing) closeCard(closing);
  }

  /**
   * Leaving for Sound or the Library: the cards fade at once; the buoy's and flag's colours drain back into the orange and red dots
   * (scene.js, over PAGE_DRAIN), and only then does the water fade and the page go.
   */
  stepPageLeave(dt) {
    const L = this.pageLeave;
    if (!L) return;
    L.t += dt * LEAVE_PACE;
    const cards = smooth(clamp(L.t / 0.45, 0, 1)),
      water = smooth(clamp((L.t - PAGE_DRAIN) / 0.45, 0, 1));
    for (const canvas of [this.canvas, this.waveCanvas]) canvas.style.opacity = (1 - water).toFixed(3);
    for (const el of [this.world, this.chrome]) el.style.opacity = ((+el.style.opacity || 0) * (1 - cards)).toFixed(3);
    // the dot of the page it is going to swells and settles
    const dot = navDotEl(L.k);
    if (dot) dot.style.transform = 'scale(' + (1 + 0.6 * Math.sin(Math.PI * clamp(L.t / 0.55, 0, 1))).toFixed(3) + ')';
    // for Sound: the menu's names fade and only the dots stay; Sound takes them over from exactly where they sit
    if (L.k === 'sound') for (const { nameBox } of this.menuItems) nameBox.style.opacity = (1 - water).toFixed(3);
    if (L.t > PAGE_DRAIN + 0.5 && !this.left) {
      this.left = true;
      if (L.k === 'sound') handNavFrom(navDots());
      leaveTo(L.href);
    }
  }
}

new Freediving(document.querySelector('.freediving'));
