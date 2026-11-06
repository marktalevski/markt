// The squid's dance, while a piece plays: it listens for the beat, and strings moves together to it.
import { clamp } from '../lib/math.js';
import { SQUID_FAST, SQUID_MOVES, SQUID_SLOW } from './squid.js';

/**
 * The music's tempo, in beats a minute: listens for beats in the bass (an onset is the low end jumping well above its recent level),
 * takes the median gap between the last dozen, folds it into 70..150, and eases toward it. Quiet or beatless music (no onsets for a
 * few seconds) settles slowly toward 72, so she sways gently.
 */
function followTempo(s, dt) {
  const an = s.player.analyser,
    c = s.player.piece;
  if (!an || !c || c.paused) return s.tempo;
  if (!s.bassBins || s.bassBins.length !== an.frequencyBinCount) s.bassBins = new Uint8Array(an.frequencyBinCount);
  an.getByteFrequencyData(s.bassBins);
  let e = 0;
  for (let q = 1; q <= 5; q++) e += s.bassBins[q];
  e /= 5 * 255;
  const now = s.time;
  s.bassMean = s.bassMean == null ? e : s.bassMean + (e - s.bassMean) * Math.min(1, dt * 1.5);
  if (e > 0.08 && e > s.bassMean * 1.3 && e - s.bassLast > 0.02 && now - s.beatAt > 0.28) {
    if (s.beatAt) {
      const g = now - s.beatAt;
      if (g < 2) {
        s.beatGaps = s.beatGaps.concat(g).slice(-12);
      }
    }
    s.beatAt = now;
  }
  s.bassLast = e;
  let tgt = s.tempo;
  if (s.beatGaps.length >= 4) {
    const sg = [...s.beatGaps].sort((a, b) => a - b),
      g = sg[sg.length >> 1];
    let b = 60 / g;
    while (b < 70) b *= 2;
    while (b > 150) b /= 2;
    tgt = b;
  }
  if (now - s.beatAt > 3) {
    tgt = 72;
    if (now - s.beatAt > 6) s.beatGaps = [];
  }
  s.tempo += (tgt - s.tempo) * Math.min(1, dt * 0.8);
  return s.tempo;
}

/**
 * The dance, this frame: a run of moves picked at random (never one twice running), each a few beats long, and every so often she
 * strikes a pose. Gives the move and how many beats into it she is.
 */
export function danceStep(s, dt) {
  const bpm = followTempo(s, dt);
  s.danceBeat += (dt * bpm) / 60;
  if (!s.danceMove || s.danceBeat >= SQUID_MOVES[s.danceMove]) {
    s.danceBeat = 0;
    s.danceCount = s.danceCount + 1;
    const pool = Object.keys(SQUID_MOVES).filter(m => m !== s.danceMove && m !== 'pose');
    // slow music: more of the slow moves (and fewer fast ones); fast music the other way round
    const slow = clamp((105 - bpm) / 30, 0, 1),
      fast = clamp((bpm - 115) / 25, 0, 1);
    [...pool].forEach(m => {
      const w = SQUID_SLOW.includes(m) ? 1 + 3 * slow : SQUID_FAST.includes(m) ? 1 + 2 * fast - 0.8 * slow : 1;
      for (let q = 1; q < Math.round(w); q++) pool.push(m);
      if (w < 0.5) pool.splice(pool.indexOf(m), 1);
    });
    s.danceMove = s.danceCount % 7 === 0 ? 'pose' : pool[Math.floor(Math.random() * pool.length)];
  }
  return { move: s.danceMove, mp: s.danceBeat };
}
