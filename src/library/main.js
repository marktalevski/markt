// The Library: a reading room. The books (a bullet journal, short readings, quotes, a pillow book, musings) lie in a painted stack in
// the bottom-right corner, a mug on the top one; the book you pick fills a wide reading column on the left. A line in the book's
// colour runs down beside the text and shows where you are in it, with a ring at each section to jump to.
//
// Each book is one of the menu's dots: arriving, the dots fly down and open out into the books; leaving, the books fold back into
// their dots, which rise to the menu (or wait where the books were, for Freediving to pick up).
import { books as published } from '../data/site.json';
import { BASE } from '../lib/base.js';
import { leaveTo, pageReady } from '../lib/cover.js';
import { h } from '../lib/dom.js';
import { clamp } from '../lib/math.js';
import { bindMenu } from '../lib/menu.js';
import { DOT_CSS, dotRadius, handNavFrom, navAt, navDots, takeNavFrom } from '../lib/nav.js';
import { LEAVE_PACE } from '../lib/pace.js';
import { BOOK_DOT, COVER } from './books.js';
import { easeIn, easeOut, flight, play, reducedMotion } from './flights.js';
import { layoutFor, textSizes } from './layout.js';
import { blocksOf, renderBlocks } from './reading.js';
import { buildShelf, markOpen, sizeShelf } from './spines.js';

const px = n => n + 'px';

class Library {
  constructor(root) {
    this.root = root;
    this.books = Array.isArray(published) ? published : [];
    this.scroller = root.querySelector('[data-read]');
    this.text = root.querySelector('.reading__text');
    this.rail = root.querySelector('[data-rail]');
    this.marker = root.querySelector('.rail__marker');
    this.shelf = root.querySelector('[data-books]');
    this.fade = root.querySelector('.library__fade');
    this.open = null; // the open book's slug; the page starts on the stack alone, the reading side blank until one is picked
    this.leaving = false;
    this.switching = false; // a book change is under way
    this.notchKey = null; // what the rings on the line were last placed for (see measure)

    // arriving under the last page's picture, its dots may be handed over (Sound leaves them where its pads closed), to fly on from there
    const handed = takeNavFrom();
    this.handed = handed && document.getElementById('page-cover') ? handed : null;

    this.relayout();
    addEventListener('resize', () => {
      this.relayout();
      this.measure();
    });
    // the number keys open the books
    addEventListener('keydown', e => {
      if (!/^[1-9]$/.test(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
      const book = this.books[+e.key - 1];
      if (book) this.pick(book.slug);
    });
    this.scroller.addEventListener('scroll', () => this.placeMarker());
    bindMenu(document.querySelector('.menu'), {
      home: this.leave(BASE + '?from=dive', true),
      freediving: this.leave(BASE + 'freediving/?from=page', 'books'),
      sound: this.leave(BASE + 'sound/?from=page', true),
      library: e => e.preventDefault(),
    });
    // the rings sit by where each heading falls, which moves once the web fonts are in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.measure(true));
    // the page fades in from blank paper (see .library__fade)
    setTimeout(() => (this.fade.style.opacity = '0'), 80);

    this.measure();
    pageReady();
    this.arrive();
  }

  // ---- layout

  /** Sizes everything for the window as it is now; the books are rebuilt when the screen crosses between wide and narrow. */
  relayout() {
    const was = this.L,
      L = (this.L = layoutFor(innerWidth, innerHeight, this.books.length)),
      sizes = textSizes(L.fontSize);
    const vars = {
      '--col-w': px(L.colW),
      '--col-l': px(L.colL),
      '--pad-top': px(L.padTop),
      '--pad-bottom': px(L.padBottom),
      '--fade-top': px(L.fadeTop),
      '--fade-bottom': px(L.fadeBottom),
      '--rail-h': px(L.railH),
      '--stack-w': px(L.stackW),
      '--mug-right': px(L.mugRight),
      '--spine-fs': px(L.spineFontSize),
      '--fs': px(sizes.base),
      '--fs-title': px(sizes.title),
      '--fs-heading': px(sizes.heading),
      '--fs-quote': px(sizes.quote),
      '--fs-meta': px(sizes.meta),
    };
    for (const [name, value] of Object.entries(vars)) this.root.style.setProperty(name, value);
    if (!was || was.narrow !== L.narrow) {
      buildShelf(this.shelf, this.books, L, slug => this.pick(slug));
      markOpen(this.shelf, this.open, L.narrow);
    } else sizeShelf(this.shelf, this.books, L);
  }

  // ---- reading

  /** Puts a book's text in the reading column, colours the line to match and slides the book out of the stack. */
  show(slug) {
    this.open = slug;
    const book = this.books.find(b => b.slug === slug);
    this.text.replaceChildren(...(book ? renderBlocks(blocksOf(book), () => this.measure(true)) : []));
    this.root.style.setProperty('--rule', (book && COVER[book.kind]) || '#111');
    this.rail.classList.toggle('is-on', !!book);
    markOpen(this.shelf, slug, this.L.narrow);
    this.measure();
  }

  /** A new book: the text lifts away, the column goes back to the top, and the new book's text rises in. */
  pick(slug) {
    if (slug === this.open || this.switching || this.leaving) return;
    this.switching = true;
    play(
      this.text,
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-12px)' },
      ],
      { duration: 220, easing: 'ease-in', fill: 'forwards' }
    );
    this.pickTimer = setTimeout(() => {
      if (this.leaving) return;
      this.scroller.scrollTop = 0;
      this.show(slug);
      requestAnimationFrame(() => {
        this.switching = false;
        if (this.leaving) return;
        this.text.getAnimations().forEach(a => a.cancel());
        play(
          this.text,
          [
            { opacity: 0, transform: 'translateY(16px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
      });
    }, 230);
  }

  /**
   * Places a ring on the line for each heading, by how far down the text it sits. It only does the work when something it depends
   * on has changed (the book, the text's height, the window); `force` is for when a heading may have moved without those changing.
   */
  measure(force) {
    const sc = this.scroller,
      range = Math.max(1, sc.scrollHeight - sc.clientHeight),
      railH = this.L.railH;
    const key = [this.open, sc.scrollHeight, sc.clientHeight, railH].join();
    if (!force && key === this.notchKey) return;
    this.notchKey = key;
    const notches = [...this.text.querySelectorAll('p[data-h="1"]')].map((heading, i) => {
      const top = heading.offsetTop,
        label = heading.textContent;
      return h(
        'button',
        {
          class: 'rail__notch' + (i === 0 ? ' rail__notch--title' : ''),
          title: label,
          'aria-label': 'Jump to ' + label,
          tabindex: i === 0 ? '-1' : '0',
          style: { top: px(Math.round(clamp((top - 30) / range, 0, 1) * railH)) },
          onclick: () => sc.scrollTo({ top: Math.max(0, top - 30), behavior: 'smooth' }),
        },
        h('span')
      );
    });
    this.rail.replaceChildren(...notches, this.marker);
    this.placeMarker();
  }

  /** The dot on the line follows how far down the text you are. */
  placeMarker() {
    const sc = this.scroller,
      range = Math.max(1, sc.scrollHeight - sc.clientHeight),
      p = Math.min(1, sc.scrollTop / range);
    this.marker.style.transform = 'translateY(' + (p * this.L.railH).toFixed(1) + 'px)';
  }

  // ---- arriving and leaving

  /** The books in the stack, top first, each with its dot (key, the dot element that flies, its radius) and where the book sits. */
  spines() {
    return [...this.shelf.querySelectorAll('[data-book]')]
      .map(el => {
        const key = BOOK_DOT[el.dataset.kind],
          r = el.getBoundingClientRect(),
          rad = dotRadius(key);
        return (
          key && {
            el,
            key,
            rad,
            at: [r.left + r.width / 2, r.top + r.height / 2],
            dot: this.root.querySelector('[data-fly="' + key + '"]'),
            // the book scaled down to the size of its dot
            asDot: `${((2 * rad) / r.width).toFixed(3)} ${((2 * rad) / r.height).toFixed(3)}`,
          }
        );
      })
      .filter(Boolean);
  }

  /**
   * Arriving: each book's dot drops from where it is (the menu, or where the last page left it) to the book's place in the stack,
   * bottom book first, and opens out into the book; dots that aren't books (Home, Library) fly back up to the menu. The mug slides
   * onto the top book last and the text rises in. (Books use the separate `scale` property, so their own slide-out and hover, on
   * `transform`, carry on untouched.)
   */
  arrive() {
    if (reducedMotion()) return;
    const anims = (this.arrival = []),
      run = (el, keyframes, options) => anims.push(play(el, keyframes, options));
    const W = innerWidth,
      handed = this.handed || {},
      from = key => handed[key] || handed[key === 'home' ? 'ink' : key] || navAt(W, key);
    const START = 120,
      STEP = 90,
      FLY = 540,
      OPEN = 300; // ms
    // where the mug rests, measured before the books start (the top book's opening scale would carry it along)
    const mug = this.shelf.querySelector('[data-mug]'),
      mugLeft = mug ? mug.getBoundingClientRect().left : 0;
    const books = this.spines().reverse();
    books.forEach(({ el, key, at, rad, dot, asDot }, i) => {
      if (!dot) return;
      const S = from(key),
        delay = START + i * STEP;
      run(
        dot,
        flight(
          S,
          [S[0] - 30, S[1] + 70],
          [at[0], at[1] - 140],
          at,
          rad,
          easeIn,
          [DOT_CSS[key], getComputedStyle(el).backgroundColor],
          true
        ),
        { duration: FLY, delay, fill: 'both' }
      );
      run(
        dot,
        [
          { opacity: 1, scale: '1 1' },
          { opacity: 0, scale: '2.4 1' },
        ],
        { duration: OPEN * 0.6, delay: delay + FLY, fill: 'forwards' }
      );
      run(
        el,
        [
          { scale: asDot, opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { scale: '1.03 1.12', offset: 0.7 },
          { scale: '1 1', opacity: 1 },
        ],
        { duration: OPEN, delay: delay + FLY, fill: 'backwards', easing: 'ease-out' }
      );
    });
    // a handed-over dot that isn't a book goes up to its place in the menu
    for (const key of ['home', 'library']) {
      if (!handed[key] && !(key === 'home' && handed.ink)) continue;
      const dot = this.root.querySelector('[data-fly="' + key + '"]');
      if (!dot) continue;
      const S = from(key),
        N = navAt(W, key);
      run(
        dot,
        flight(
          S,
          [S[0], S[1] - 120],
          [N[0] - 30, N[1] + 80],
          N,
          dotRadius(key),
          easeOut,
          [DOT_CSS[key], DOT_CSS[key]],
          true
        ),
        { duration: FLY + 200, delay: START, fill: 'both' }
      );
      run(dot, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, delay: START + FLY + 200, fill: 'forwards' });
    }
    const landed = START + (books.length - 1) * STEP + FLY + OPEN;
    if (mug) {
      // the mug slides in along the top book from off the right edge and slows to a stop in its place (no overshoot)
      run(mug, [{ translate: `${innerWidth - mugLeft + 60}px 0` }, { translate: '0 0' }], {
        duration: 900,
        delay: landed + 20,
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'backwards',
      });
      // hidden until then: while the top book opens out of its dot, its scale would carry the waiting mug into view
      run(mug, [{ opacity: 0 }, { opacity: 0 }], { duration: landed + 20 });
    }
    run(
      this.text,
      [
        { opacity: 0, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 520, delay: landed + 150, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
    );
  }

  /**
   * A click handler that leaves for `href`. `dots`: true hands the menu dots' places to the next page (its dots fly on from them);
   * 'books' (to Freediving) leaves each book's dot where its book folded and hands those places over instead, so the next page's
   * dots set off from the books.
   */
  leave(href, dots) {
    return e => {
      if (e) e.preventDefault();
      if (this.leaving) return;
      this.leaving = true;
      const still = reducedMotion(),
        atBooks = dots === 'books' && !still;
      if (dots) {
        const places = navDots();
        if (atBooks) for (const { key, at } of this.spines()) places[key] = at;
        handNavFrom(places);
      }
      const go = () => leaveTo(href);
      if (still) {
        // no motion: the page fades to its paper colour, then goes
        this.fade.style.opacity = '1';
        setTimeout(go, 480);
        return;
      }
      // a leave during the arrival: the arrival jumps to its end first, so nothing still waiting to appear pops in over the leave
      for (const a of this.arrival || []) {
        try {
          a.finish();
        } catch (x) {}
      }
      clearTimeout(this.pickTimer);
      // the text and the line fade, the mug slides off to the right, then the books fold back into their dots, top one first, and the
      // dots rise into the menu (or, to Freediving, stay where their books were); the next page picks them up there. It goes once
      // the last dot has arrived
      const W = innerWidth,
        FOLD = 210,
        FLY = 480,
        STEP = 70, // ms
        flights = [];
      // (the text and the line fade from as they are: the line is hidden with no book open)
      for (const el of [this.text, this.rail])
        play(
          el,
          [{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }],
          { duration: 220, fill: 'forwards' },
          LEAVE_PACE
        );
      const mug = this.shelf.querySelector('[data-mug]');
      if (mug)
        play(
          mug,
          [{ translate: '0 0' }, { translate: `${innerWidth - mug.getBoundingClientRect().left + 60}px 0` }],
          { duration: 420, easing: 'cubic-bezier(.55,0,.75,.4)', fill: 'forwards' },
          LEAVE_PACE
        );
      this.spines().forEach(({ el, key, at, rad, dot, asDot }, i) => {
        const N = navAt(W, key),
          delay = 160 + i * STEP;
        play(
          el,
          [
            { scale: '1 1', opacity: 1 },
            { scale: asDot, opacity: 0 },
          ],
          { duration: FOLD, delay, fill: 'forwards', easing: 'ease-in' },
          LEAVE_PACE
        );
        if (!dot) return;
        dot.getAnimations().forEach(a => a.cancel()); // its arrival (which ends stretched out and hidden) is over
        const appear = play(
          dot,
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: FOLD * 0.5, delay: delay + FOLD * 0.5, fill: 'both' },
          LEAVE_PACE
        );
        if (atBooks) {
          dot.style.translate = `${at[0] - rad}px ${at[1] - rad}px`;
          dot.style.backgroundColor = DOT_CSS[key];
          flights.push(appear);
          return;
        }
        flights.push(
          play(
            dot,
            flight(at, [at[0], at[1] - 140], [N[0] - 30, N[1] + 70], N, rad, easeOut, [
              getComputedStyle(el).backgroundColor,
              DOT_CSS[key],
            ]),
            { duration: FLY, delay: delay + FOLD * 0.5, fill: 'both' },
            LEAVE_PACE
          )
        );
      });
      // (with no books to fold, it still waits for the text to fade)
      let gone = false;
      const once = () => {
        if (!gone) {
          gone = true;
          go();
        }
      };
      Promise.all(flights.map(a => a.finished)).then(() => setTimeout(once, flights.length ? 60 : 280), once);
    };
  }
}

new Library(document.querySelector('.library'));
