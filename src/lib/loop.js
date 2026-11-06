// The frame loop every animated page runs on.

/**
 * Calls frame(dt, now) on every animation frame. dt is the seconds since the last frame, never more than 0.05: after a long pause
 * (a busy moment, a tab left in the background) the animation carries on from where it was instead of jumping ahead.
 */
export function startLoop(frame) {
  let last = 0;
  const tick = now => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    frame(dt, now);
  };
  requestAnimationFrame(tick);
}
