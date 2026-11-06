// The Library's moving parts are plain elements animated by the browser (the Web Animations API): dots that fly between the menu and
// the books, books that open out of their dot and fold back into it.
import { cubicAt } from '../lib/math.js';

/** An animation at a given pace (1: as designed; a page leaving runs faster, delays included). */
export const play = (el, keyframes, options, pace = 1) => {
  const animation = el.animate(keyframes, options);
  animation.playbackRate = pace;
  return animation;
};

export const easeIn = u => u * u * (1.6 - 0.6 * u);
export const easeOut = u => 1 - easeIn(1 - u);

/**
 * A dot's flight from A to B along a curve (pulled by C1 and C2), as keyframes for its `translate` and its colour (cols[0] for the
 * first half, cols[1] after). r is the dot's radius, ease shapes its pace, and `shown` keeps it visible the whole way (and while it
 * waits to set off).
 */
export function flight(A, C1, C2, B, r, ease, cols, shown) {
  const frames = [];
  for (let q = 0; q <= 18; q++) {
    const p = cubicAt(A, C1, C2, B, ease(q / 18));
    frames.push({
      offset: q / 18,
      translate: `${(p[0] - r).toFixed(1)}px ${(p[1] - r).toFixed(1)}px`,
      backgroundColor: q < 9 ? cols[0] : cols[1],
      ...(shown ? { opacity: 1 } : {}),
    });
  }
  return frames;
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
