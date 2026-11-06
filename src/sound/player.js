// Playing a piece: through Web Audio, from its file if it has one, or else as a synthesised stand-in of its kind (wind and water
// for a field recording, a little tune for music, a murmuring voice for voice). Also the deck's own two sounds: the knobs' click
// and the spare pad's kick drum.
import { clamp, rng } from '../lib/math.js';
import { albums, fileEnvelope, hash, levelAt } from './albums.js';

// the stand-in tune's scale (semitones above its root) and the stand-in voice's vowels (each one's two formants, Hz)
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const VOWELS = [
  [730, 1090],
  [270, 2290],
  [300, 870],
  [530, 1840],
  [660, 1720],
  [440, 1020],
];
// a few milliseconds of silence, looped alongside a playing piece on older iPhones (see mediaOn)
const SILENT_WAV =
  'data:audio/wav;base64,UklGRuwAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YcgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

// ---- what sounds for a piece. Each of these plays into `out` and gives { list: the nodes to stop when it ends, step(piece, e, pos,
// now): what keeps a stand-in going, called every frame with the piece's loudness e (0..1) where it has got to, pos seconds in }

/** The piece's own sound file, from `off` seconds in. */
function fileVoice(ac, out, buffer, now, off) {
  const source = ac.createBufferSource();
  source.buffer = buffer;
  source.connect(out);
  out.gain.value = 1;
  source.start(now, off);
  return { list: [source] };
}

const STAND_IN = {
  /** A field recording: wind and water. Soft noise through a filter that opens as the piece gets louder. */
  field(ac, out) {
    const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate),
      d = noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < d.length; i++) {
      b = 0.97 * b + 0.03 * (Math.random() * 2 - 1);
      d[i] = b * 4 + (Math.random() * 2 - 1) * 0.12;
    }
    const source = ac.createBufferSource(),
      filter = ac.createBiquadFilter();
    source.buffer = noise;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.5;
    source.connect(filter);
    filter.connect(out);
    source.start();
    return {
      list: [source],
      step(piece, e, pos, now) {
        out.gain.setTargetAtTime(0.32 * e, now, 0.08);
        filter.frequency.setTargetAtTime(220 + 1300 * e * e, now, 0.12);
      },
    };
  },

  /** Music: a little tune of plucked notes from a five-note scale over a slow bass, the same tune every time for the same piece. */
  music(ac, out) {
    const lead = ac.createOscillator(),
      pluck = ac.createGain(),
      bass = ac.createOscillator(),
      bassGain = ac.createGain();
    lead.type = 'triangle';
    bass.type = 'sine';
    pluck.gain.value = 0;
    bassGain.gain.value = 0.45;
    lead.connect(pluck);
    pluck.connect(out);
    bass.connect(bassGain);
    bassGain.connect(out);
    lead.start();
    bass.start();
    return {
      list: [lead, bass],
      step(piece, e, pos, now) {
        out.gain.setTargetAtTime(0.1 * (0.35 + 0.65 * e), now, 0.1);
        // the notes due by now (a little ahead, so none comes in late)
        while (piece.nextNote <= pos + 0.05) {
          const deg = SCALE[Math.floor(rng(piece.seed + piece.n * 7919)() * SCALE.length)],
            at = now + Math.max(0, piece.nextNote - pos);
          lead.frequency.setValueAtTime(220 * Math.pow(2, deg / 12), at);
          pluck.gain.setTargetAtTime(1, at, 0.008);
          pluck.gain.setTargetAtTime(0, at + 0.06, 0.14);
          if (piece.n % 8 === 0)
            bass.frequency.setValueAtTime(55 * Math.pow(2, [0, 5, 7, 3][((piece.n / 8) % 4) | 0] / 12), at);
          piece.n++;
          piece.nextNote += 0.3125;
        }
      },
    };
  },

  /** A voice: a murmur. A buzz with a slow wobble, through two filters that move from vowel to vowel, falling silent in the pauses. */
  voice(ac, out) {
    const saw = ac.createOscillator(),
      wobble = ac.createOscillator(),
      wobbleDepth = ac.createGain(),
      formant1 = ac.createBiquadFilter(),
      formant2 = ac.createBiquadFilter(),
      formant2Gain = ac.createGain();
    saw.type = 'sawtooth';
    saw.frequency.value = 118;
    wobble.frequency.value = 5.2;
    wobbleDepth.gain.value = 2.5;
    wobble.connect(wobbleDepth);
    wobbleDepth.connect(saw.frequency);
    [formant1, formant2].forEach(b => {
      b.type = 'bandpass';
      b.Q.value = 9;
      saw.connect(b);
    });
    formant2Gain.gain.value = 0.6;
    formant1.connect(out);
    formant2.connect(formant2Gain);
    formant2Gain.connect(out);
    saw.start();
    wobble.start();
    return {
      list: [saw, wobble],
      step(piece, e, pos, now) {
        out.gain.setTargetAtTime(e > 0.2 ? 0.7 * e : 0, now, 0.03);
        saw.frequency.setTargetAtTime(108 + 22 * Math.sin(pos * 0.9), now, 0.2);
        while (piece.nextVowel <= pos) {
          const v = VOWELS[Math.floor(rng(piece.seed + ((piece.nextVowel * 100) | 0))() * VOWELS.length)];
          formant1.frequency.setTargetAtTime(v[0], now, 0.03);
          formant2.frequency.setTargetAtTime(v[1], now, 0.03);
          piece.nextVowel += 0.14 + 0.06 * Math.sin(piece.nextVowel * 3);
        }
      },
    };
  },
};

export class Player {
  /**
   * heldAt(dur): where the hand has the playhead (seconds into a piece dur long) while it is being dragged, or null when it isn't.
   * onChange(): called whenever a piece starts, pauses or stops.
   */
  constructor(heldAt, onChange) {
    this.heldAt = heldAt;
    this.onChange = onChange;
    /**
     * The piece loaded (playing or paused), or null: { tr (the piece), t0 (the audio clock's time at its start), paused, off (where
     * it was paused, s), voice (what is sounding, see above; out: the gain it all plays into), and, for the stand-in tune and
     * voice, where they have got to: nextNote, n (the note's number), nextVowel, seed (what makes the piece's tune its own) }.
     */
    this.piece = null;
    this.level = 0; // how loud it is right now, 0..1 (the wave's pieces jump with it)
    // the audio graph, made on the first sound (browsers only allow it after a click): a piece -> analyser -> gain (the volume) -> out
    this.context = null;
    this.analyser = null;
    this.gain = null;
    this.samples = null;
    this.silent = null;
  }

  ensureContext() {
    if (!this.context) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.context = new AC();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.gain = this.context.createGain();
      this.analyser.connect(this.gain);
      this.gain.connect(this.context.destination);
      this.samples = new Float32Array(512);
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  /**
   * Fetches and decodes a piece's file, for its real waveform and length (when its album is first shown, or when it is played; not
   * all at once on arrival). A piece already playing on its stand-in sound when its file arrives switches over to it where it was.
   */
  load(tr) {
    if (!tr.src || tr.decoding) return;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return;
    tr.decoding = true;
    fetch(tr.src)
      .then(res => {
        if (!res.ok) throw new Error(res.status);
        return res.arrayBuffer();
      })
      .then(b => new OAC(1, 1, 44100).decodeAudioData(b))
      .then(buf => {
        const c = this.piece,
          was = c && c.tr === tr && !c.paused && c.voice.step ? this.position() : null;
        tr.buf = buf;
        tr.dur = buf.duration;
        tr.env = fileEnvelope(buf);
        if (was != null) this.play(tr, Math.min(was, tr.dur));
      })
      .catch(() => {
        tr.decoding = false;
      });
  }

  loadAlbum(album) {
    album.tracks.forEach(tr => this.load(tr));
  }

  /** Plays a piece from `off` seconds in. */
  play(tr, off = 0) {
    this.load(tr);
    this.silence();
    this.ensureContext();
    this.mediaOn();
    const ac = this.context,
      now = ac.currentTime,
      out = ac.createGain();
    out.gain.value = 0;
    out.connect(this.analyser);
    const voice = { out, ...(tr.buf ? fileVoice(ac, out, tr.buf, now, off) : STAND_IN[tr.kind](ac, out)) };
    this.piece = {
      tr,
      t0: now - off,
      voice,
      nextNote: off,
      nextVowel: off,
      n: Math.floor(off / 0.3125),
      seed: hash(tr.title),
      paused: false,
      off,
    };
    this.onChange();
  }

  /** Stops what is sounding (the piece stays loaded). */
  silence() {
    const c = this.piece;
    if (!c || !c.voice) return;
    c.voice.list.forEach(n => {
      try {
        n.stop();
      } catch (e) {}
    });
    try {
      c.voice.out.disconnect();
    } catch (e) {}
    c.voice = { list: [] };
  }

  /** Stops and unloads the piece. */
  stop() {
    this.silence();
    this.mediaOff();
    this.piece = null;
    this.level = 0;
    this.onChange();
  }

  /** Pauses the piece, or plays it on from where it was paused. */
  toggle() {
    const c = this.piece;
    if (!c) return;
    if (c.paused) this.play(c.tr, c.off);
    else {
      c.off = this.context.currentTime - c.t0;
      this.silence();
      this.mediaOff();
      c.paused = true;
      this.onChange();
    }
  }

  /** A piece picked from the list: plays it, or pauses / resumes it if it is the one loaded. */
  select(tr) {
    if (this.piece && this.piece.tr.id === tr.id) this.toggle();
    else this.play(tr);
  }

  /** Moves to u (0..1) of the way through the piece (a paused piece stays paused there). */
  seek(u) {
    const c = this.piece;
    if (!c) return;
    const off = clamp(u, 0, 1) * c.tr.dur;
    if (c.paused) c.off = off;
    else this.play(c.tr, off);
  }

  /** Where the piece is, in seconds. */
  position() {
    const c = this.piece;
    if (!c) return 0;
    const held = this.heldAt(c.tr.dur);
    if (held != null) return held;
    return c.paused ? c.off : clamp(this.context.currentTime - c.t0, 0, c.tr.dur);
  }

  /** Every frame: moves on to the next piece when this one ends, keeps the stand-in sounds going, and follows the loudness. */
  tick(dt) {
    const c = this.piece;
    if (!c || c.paused) return;
    const ac = this.context,
      now = ac.currentTime,
      pos = now - c.t0,
      tr = c.tr;
    if (pos >= tr.dur) {
      const nx = albums[tr.ai].tracks[tr.ti + 1];
      if (nx) this.play(nx);
      else this.stop();
      return;
    }
    const e = levelAt(tr.env, pos / tr.dur),
      voice = c.voice;
    if (voice.step) voice.step(c, e, pos, now);
    // how loud it is, from what is actually sounding
    let lv = e;
    if (voice.out) {
      this.analyser.getFloatTimeDomainData(this.samples);
      let s = 0;
      for (let i = 0; i < this.samples.length; i++) s += this.samples[i] * this.samples[i];
      lv = clamp(Math.sqrt(s / this.samples.length) * 6, 0, 1);
    }
    this.level += (lv - this.level) * (1 - Math.exp(-(dt || 1 / 60) * 21.4)); // by the clock (.3 a frame at 60fps)
  }

  /** The volume, 0..1: squared, so the fader moves through loudness the way the ear hears it (half way down is half as loud). */
  setVolume(v) {
    if (this.gain) this.gain.gain.setTargetAtTime(Math.pow(v, 2), this.context.currentTime, 0.05);
  }

  /**
   * The spare pad's kick drum: a sine that drops from a punchy click to a low thump. (Straight into the volume, not the analyser, so
   * it doesn't move the piece's wave or the squid's tempo.)
   */
  kick() {
    try {
      this.ensureContext();
      const ac = this.context,
        now = ac.currentTime,
        o = ac.createOscillator(),
        g = ac.createGain(),
        c = ac.createOscillator(),
        cg = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(160, now);
      o.frequency.exponentialRampToValueAtTime(48, now + 0.12);
      o.frequency.exponentialRampToValueAtTime(38, now + 0.45);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.9, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      o.connect(g);
      g.connect(this.gain);
      o.start(now);
      o.stop(now + 0.52);
      c.type = 'triangle';
      c.frequency.setValueAtTime(1800, now);
      c.frequency.exponentialRampToValueAtTime(300, now + 0.02);
      cg.gain.setValueAtTime(0.25, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      c.connect(cg);
      cg.connect(this.gain);
      c.start(now);
      c.stop(now + 0.04);
    } catch (e) {}
  }

  /** A knob clicking onto a number: a short bright tick of noise over a tiny knock. */
  detent() {
    try {
      this.ensureContext();
      const ac = this.context;
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      const now = ac.currentTime,
        n = Math.floor(ac.sampleRate * 0.012),
        b = ac.createBuffer(1, n, ac.sampleRate),
        d = b.getChannelData(0);
      for (let q = 0; q < n; q++) d[q] = (Math.random() * 2 - 1) * Math.exp(-q / (n * 0.16));
      const src = ac.createBufferSource(),
        bp = ac.createBiquadFilter(),
        g = ac.createGain(),
        o = ac.createOscillator(),
        og = ac.createGain();
      src.buffer = b;
      bp.type = 'bandpass';
      bp.frequency.value = 3400;
      bp.Q.value = 1.4;
      g.gain.value = 0.35;
      src.connect(bp);
      bp.connect(g);
      g.connect(this.gain);
      o.frequency.value = 1900;
      og.gain.setValueAtTime(0.06, now);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      o.connect(og);
      og.connect(this.gain);
      src.start(now);
      o.start(now);
      o.stop(now + 0.03);
    } catch (e) {}
  }

  // iPhones mute Web Audio while the ring / silent switch is on (but not media playback), so while a piece plays the page says it is
  // playing media: Safari 17+ takes navigator.audioSession, older ones switch over while an <audio> element plays alongside (a silent
  // loop). Only for pieces, not the knobs' clicks or the kick pad, so those never interrupt music playing in another app; released
  // on pause and stop
  mediaOn() {
    try {
      if (navigator.audioSession) {
        navigator.audioSession.type = 'playback';
        return;
      }
    } catch (e) {}
    if (!/iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) || !('ontouchend' in document)) return;
    try {
      const el = this.silent || (this.silent = new Audio(SILENT_WAV));
      el.loop = true;
      el.setAttribute('playsinline', '');
      // play() is refused outside a tap (a jog drag, the next piece starting by itself); the next play tries again
      if (el.paused) el.play().catch(() => {});
    } catch (e) {}
  }

  mediaOff() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'auto';
    } catch (e) {}
    if (this.silent) this.silent.pause();
  }
}
