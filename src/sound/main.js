// Sound: recordings as a DJ deck. A wave of cut paper lies across the page over the album's photo; the deck along the bottom plays
// the album's pieces, and its beat pads are the site's menu.
//
// This file is the page's state and what a visitor can do to it. The painting is in scene.js (the page), wave.js, photos.js and
// deck/ (the controller); the controller's hit areas are in controls.js, the album clock in clock.js, the sound in player.js.
import { BASE } from '../lib/base.js';
import { deckGeo, isPhone } from '../lib/deck-layout.js';
import { followDrag } from '../lib/dom.js';
import { startLoop } from '../lib/loop.js';
import { clamp } from '../lib/math.js';
import { handNavFrom, leaveTo, pageReady, takeNavFrom } from '../lib/nav.js';
import { LEAVE_PACE } from '../lib/pace.js';
import { albums } from './albums.js';
import { placeClock, showAlbumNumber, stepFlip } from './clock.js';
import { bindControls } from './controls.js';
import { Player } from './player.js';
import { drawFrame, groundGrain } from './scene.js';

// where each page's beat pad goes (each page is told where it is being arrived at from, so it can pick the dots up)
const DESTINATION = {
  home: BASE + '?from=dive',
  freediving: BASE + 'freediving/?from=sound',
  library: BASE + 'library/',
};

class Sound {
  constructor(root) {
    // ---- the page's elements
    this.root = root;
    this.canvas = root.querySelector('.sound__canvas');
    this.clock = root.querySelector('.clock'); // the album clock: the names and the flip counter
    this.names = [...this.clock.querySelectorAll('.clock__name')];
    this.counter = {
      to: [...this.clock.querySelectorAll('[data-shows="to"]')],
      from: [...this.clock.querySelectorAll('[data-shows="from"]')],
    };
    [this.flapTop, this.flapBottom] = this.clock.querySelectorAll('.counter__flap');
    this.exitKey = root.querySelector('.exit'); // the way out of full screen
    this.exitKeyColour = this.cursor = null; // (what was last written to it, and the page's pointer: see controls.js)
    // the hit areas over the deck's controls
    this.hit = {
      pads: [...root.querySelectorAll('[data-navk]')],
      cpads: [...root.querySelectorAll('[data-cpad]')],
      jog: root.querySelector('[data-deck="jog"]'),
      full: root.querySelector('[data-deck="full"]'),
      play: root.querySelector('[data-deck="play"]'),
      vol: root.querySelector('[data-deck="vol"]'),
      knobs: [...root.querySelectorAll('[data-knob]')],
      rows: [...root.querySelectorAll('[data-row]')],
    };

    this.time = 0; // seconds the page has been running

    // ---- the album showing
    this.album = 0;
    this.albumDir = 1; // which way it was reached: 1 scrolling on, -1 scrolling back
    this.flipFrom = null; // the album the counter is flipping from
    this.flipStart = null; // when that flip began
    this.nameY = {}; // where each album's name is in the clock, eased

    // ---- the sound
    this.player = new Player(
      // while the playhead is being dragged, the piece is wherever the hand has it
      dur => (this.jogDrag ? this.jogDrag.pos : this.scrub ? clamp(this.scrub.x / innerWidth, 0, 1) * dur : null),
      () => {
        const piece = this.player.piece;
        this.hit.play.setAttribute('aria-label', piece && !piece.paused ? 'Pause' : 'Play');
      }
    );
    this.volume = 1; // 0..1, set by the fader

    // ---- arriving and leaving. Arriving from another page, its menu dots are handed over and fly in to become this page's beat
    // pads (the deck then folds out of them); leaving, the pads close back into dots, which the next page picks up
    this.arrival = null; // { dots: where the last page left each dot }
    if (/from=page/.test(location.search)) {
      const dots = takeNavFrom();
      if (dots) this.arrival = { dots };
    }
    this.leaving = null; // { href, t: seconds into leaving }
    this.gone = false;
    this.dotAt = {}; // where each dot is on screen, for handing over
    this.ready = false; // the first frame has been drawn

    // ---- the wave and the ground it lies on (see scene.js, wave.js, photos.js)
    this.grain = groundGrain();
    this.grainPattern = this.staticPattern = this.scanPattern = null;
    this.photos = {}; // each album's photo, by its address: { image, shown (0..1), stark, cyan, magenta, key }
    this.pieces = null; // the wave's paper shapes
    this.colHeight = this.colAlpha = this.colKind = this.colDance = null; // each column of the wave: its height, strength, kind, and how it dances
    this.spectrum = null; // the music's spectrum, for the dancing columns
    this.settle = 0; // 0..1: the pieces gather into neat lines round the playhead while it is dragged
    this.settleX = null; // where that is
    this.lean = this.leanTo = 0; // the wave leans a little with the pointer (-1..1 across the page)

    // ---- the deck (see deck/, controls.js)
    this.accent = null; // its accent colours, this frame
    this.deckShift = 0; // how far it has slid down off the screen, px (leaving, and in full screen)
    this.edgeLit = 0; // 0..1: its edge lights up in an ink of the wave while a piece is loaded
    this.edgeInk = this.edgePiece = this.edgeInkIndex = null; // that ink (easing toward the one picked for the piece)
    this.padGlow = new Array(8).fill(0); // each beat pad's glow under the pointer, eased
    this.padOver = null; // the pad under the pointer
    this.kickAt = null; // when the spare pad's kick drum was last hit
    this.jogCentre = [0, 0];
    this.jogAngle = 0; // how far the wheel has turned
    this.jogOver = this.rimOver = this.rimHeld = this.jogTurning = false;
    this.jogDrag = null; // while the wheel is dragged: { pos: where the hand has the piece, at }
    this.buttonOver = null; // 'play' or 'full'
    this.fullPressed = false;
    this.rowOver = null; // the row of the track list under the pointer
    this.knobs = [0, 0, 0, 0, 0, 0]; // the number each knob is set to
    this.knobAngle = [0, 0, 0, 0, 0, 0]; // where each one's pointer is, degrees (it eases to its number)
    this.knobRaw = []; // while one is being turned: where the hand has it
    this.knobKick = []; // each one's last click: { t, d: which way }
    this.knobHeld = this.knobOver = this.knobPoint = null; // (knobPoint: the number on a dial under the pointer, { i, q })
    this.knobsSwept = false;
    this.faderTo = this.faderY = null; // the volume fader: where it is set, and where its cap is on the way there
    this.faderHeld = false;
    this.tiles = this.foldDeck = this.foldDots = null; // the fold-out on arrival (see fold.js)

    // ---- the squid on the screen (see dance.js)
    this.squidTurn = this.squidTurnAt = null; // the little turn a beat pad set off, and when
    this.tempo = 100; // the music's, beats a minute
    this.bassBins = this.bassMean = null;
    this.bassLast = this.beatAt = 0;
    this.beatGaps = [];
    this.danceMove = null; // the move she is on, how many beats into it, and how many moves she has done
    this.danceBeat = this.danceCount = 0;

    // ---- full screen: the deck slides away and the photo fades, leaving only the wave and its playhead (and the browser goes full
    // screen too, where it can). There a click on the wave plays / pauses and the playhead can be dragged
    this.full = false;
    this.fullEase = 0; // 0..1, eased
    this.fullAt = this.fullMoveAt = 0; // when it began, and when the pointer last moved
    this.fullPointerX = null;
    this.browserFull = false;

    // ---- gestures in progress
    this.scrub = null; // the playhead being dragged: { x: where to, at }
    this.scrubEndAt = 0;
    this.touchY = null;
    this.wheelSum = this.wheelAt = this.wheelStepAt = 0;
    this.wheelArmed = false;

    this.listen();
    this.player.loadAlbum(albums[this.album]);
    if (import.meta.env.DEV) window.__sound = this; // (a handle for checking the page in development)
    startLoop(dt => this.frame(dt));
  }

  // ---- every frame

  frame(dt) {
    this.time += dt;
    if (this.arrival && (this.time > 4.5 || this.leaving)) this.arrival = null;
    if (this.leaving) {
      this.leaving.t += dt * LEAVE_PACE;
      if (this.leaving.t > 1.25 && !this.gone) {
        this.gone = true;
        handNavFrom({ ...this.dotAt });
        leaveTo(this.leaving.href);
      }
    }
    this.lean += (this.leanTo - this.lean) * Math.min(1, dt * 3);
    this.player.setVolume(this.volume);
    this.player.tick(dt);
    drawFrame(this, dt);
    stepFlip(this);
    placeClock(this, dt);
    if (!this.ready) {
      this.ready = true;
      pageReady();
    }
  }

  // ---- what a visitor can do

  listen() {
    addEventListener('wheel', e => this.wheel(e), { passive: true });
    addEventListener('keydown', e => this.key(e));
    addEventListener('pointermove', e => {
      this.fullMoveAt = performance.now();
      this.fullPointerX = e.clientX;
      this.leanTo = (e.clientX / innerWidth) * 2 - 1;
    });
    addEventListener('click', e => this.clickInFullScreen(e));
    addEventListener('click', e => this.tapOnPhone(e));
    addEventListener('pointerdown', e => this.grabPlayhead(e));
    addEventListener('pointerdown', e => this.dragOnPhone(e));
    addEventListener('touchstart', e => (this.touchY = e.touches[0].clientY), { passive: true });
    addEventListener('touchend', e => this.swipeEnd(e));
    // the browser's own way out of full screen (its Esc) leaves ours too
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) this.browserFull = true;
      else if (this.browserFull) {
        this.browserFull = false;
        if (this.full) this.leaveFull();
      }
    });
    bindControls(this);
  }

  /** Scrolling changes the album, one per gesture: a gesture is armed after a short pause in wheel events and fires once it has moved far enough. */
  wheel(e) {
    if (e.target.closest && e.target.closest('[data-knob]')) return; // (over a knob, the wheel turns the knob)
    const now = performance.now();
    if (now - this.wheelAt > 180) {
      this.wheelSum = 0;
      this.wheelArmed = true;
    }
    this.wheelAt = now;
    this.wheelSum += e.deltaY;
    if (this.wheelArmed && Math.abs(this.wheelSum) > 30 && now - this.wheelStepAt > 650) {
      this.wheelArmed = false;
      this.wheelStepAt = now;
      this.showAlbum(this.album + (this.wheelSum > 0 ? 1 : -1));
    }
  }

  key(e) {
    const tag = (e.target && e.target.tagName) || '',
      k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown') {
      e.preventDefault();
      this.showAlbum(this.album + 1);
    } else if (k === 'ArrowUp' || k === 'PageUp') {
      e.preventDefault();
      this.showAlbum(this.album - 1);
    } else if (k === ' ' && this.player.piece && !/BUTTON|^A$/.test(tag)) {
      // (on a button or a link, the space bar presses that instead)
      e.preventDefault();
      this.player.toggle();
    } else if (k === 'Escape') {
      if (this.full) this.leaveFull();
      else this.player.stop();
    } else if ((k === 'f' || k === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (this.full) this.leaveFull();
      else this.goFull();
    }
  }

  /** An up or down swipe changes the album too. */
  swipeEnd(e) {
    if (this.touchY == null) return;
    const dy = this.touchY - e.changedTouches[0].clientY;
    this.touchY = null;
    if (Math.abs(dy) > 50) this.showAlbum(this.album + (dy > 0 ? 1 : -1));
  }

  /** Shows album a (kept within the albums there are): the counter flips to it and its name rolls in. */
  showAlbum(a) {
    a = clamp(a, 0, albums.length - 1);
    if (a === this.album) return;
    this.albumDir = a > this.album ? 1 : -1;
    this.flipFrom = this.album;
    this.flipStart = this.time;
    this.player.loadAlbum(albums[a]);
    this.album = a;
    showAlbumNumber(this);
  }

  /** Play / pause; with nothing chosen yet it starts the album's first piece. */
  playPause() {
    if (this.player.piece) this.player.toggle();
    else this.player.play(albums[this.album].tracks[0]);
  }

  /** A page's beat pad: goes to that page (this page's own pad does nothing). */
  go(key, e) {
    e.preventDefault();
    if (key === 'sound' || this.leaving) return;
    this.player.stop();
    this.leaving = { href: DESTINATION[key], t: 0 };
  }

  // ---- full screen

  goFull() {
    try {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    } catch (e) {}
    this.full = true;
    this.fullMoveAt = this.fullAt = performance.now();
    try {
      const d = document.documentElement,
        asked = d.requestFullscreen && d.requestFullscreen();
      if (asked && asked.catch) asked.catch(() => {});
    } catch (e) {}
  }

  leaveFull() {
    this.full = false;
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) {}
  }

  /** In full screen a click on the wave plays / pauses (but not the click that began it, the end of a drag, or one on the playhead). */
  clickInFullScreen(e) {
    const now = performance.now();
    if (
      !this.full ||
      now - this.fullAt < 400 ||
      onExitKey(e) ||
      now - this.scrubEndAt < 350 ||
      this.nearPlayhead(e.clientX)
    )
      return;
    if (this.player.piece) this.player.toggle();
  }

  // ---- dragging the playhead

  /** Is x within reach of the playhead (9px)? */
  nearPlayhead(x) {
    const piece = this.player.piece;
    return !!piece && x != null && Math.abs(x - (this.player.position() / piece.tr.dur) * innerWidth) < 9;
  }

  /** A drag has the playhead at x on a page W wide: a playing piece jumps there every few frames, like dragging tape. */
  scrubTo(x, W) {
    this.scrub.x = x;
    const now = performance.now(),
      piece = this.player.piece;
    if (piece && !piece.paused && now - (this.scrub.at || 0) > 70) {
      this.scrub.at = now;
      this.player.seek(x / W);
    }
  }

  /** The drag is let go: the piece carries on from where it ended. */
  scrubEnd(W) {
    const u = this.scrub.x / W;
    this.scrub = null;
    this.scrubEndAt = performance.now();
    this.player.seek(u);
  }

  /** In full screen: press on the playhead and drag it. */
  grabPlayhead(e) {
    if (!this.full || this.fullEase < 0.5 || e.button || onExitKey(e) || !this.nearPlayhead(e.clientX)) return;
    e.preventDefault();
    this.scrub = { x: e.clientX };
    followDrag(
      ev => {
        this.fullPointerX = ev.clientX;
        this.fullMoveAt = performance.now();
        this.scrubTo(clamp(ev.clientX, 0, innerWidth), innerWidth);
      },
      () => this.scrubEnd(innerWidth)
    );
  }

  // ---- on a phone (which has no play button or jog wheel)

  /** Is this touch on the open page above the deck, not on a control, a link or the deck itself? */
  aboveDeckOnPhone(e) {
    if (this.full || !isPhone(innerWidth, innerHeight)) return false;
    if (e.clientY >= deckGeo(innerWidth, innerHeight).y0 + this.deckShift) return false;
    const on = 'button,a,input,[role],[data-row],[data-navk],[data-deck],[data-knob],[data-cpad],[data-full-exit]';
    return !(e.target.closest && e.target.closest(on));
  }

  /** A tap anywhere above the deck plays and pauses, or starts the album's first piece (but not a tap that ends a drag). */
  tapOnPhone(e) {
    if (performance.now() - this.scrubEndAt < 350 || !this.aboveDeckOnPhone(e)) return;
    this.playPause();
  }

  /**
   * A sideways drag anywhere above the deck moves the playhead: from where it was, by how far the finger goes (the screen's width is
   * the whole piece). Up-and-down swipes still change the album.
   */
  dragOnPhone(e) {
    const piece = this.player.piece;
    if (e.pointerType === 'mouse' || !piece || !this.aboveDeckOnPhone(e)) return;
    const x0 = e.clientX,
      y0 = e.clientY,
      W = innerWidth,
      u0 = clamp(this.player.position() / piece.tr.dur, 0, 1);
    let dragging = false;
    followDrag(
      ev => {
        const dx = ev.clientX - x0,
          dy = ev.clientY - y0;
        if (!dragging) {
          if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
          dragging = true;
          this.touchY = null; // (so it isn't taken for a swipe as well)
          this.scrub = { x: u0 * W };
        }
        this.scrubTo(clamp(u0 + dx / W, 0, 1) * W, W);
      },
      () => {
        if (dragging && this.scrub) this.scrubEnd(W);
      }
    );
  }
}

const onExitKey = e => e.target.closest && e.target.closest('[data-full-exit]');

new Sound(document.querySelector('.sound'));
