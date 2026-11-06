// The water's surface, where Freediving's rope hangs from its buoy. Home draws the same surface and buoy in the same place when it
// hands over to Freediving, so both pages take them from here.

/** How far in from the left edge the rope (and its buoy) hangs, on a screen W wide. It leaves room on its left for the squid. */
export const ropeX = W => (W < 720 ? 52 : 84);

/** How far down the page the surface sits, on a screen H tall. */
export const surfaceY = H => Math.max(H * 0.26, 190);

/** The height of surface line k (0 the dark top line, then the two blues) at x along it, t seconds in. */
export const waveY = (x, k, t) =>
  k * 16 + Math.sin(x * 0.011 + t * 0.6 + k * 1.3) * 7 * (1 - k * 0.25) + Math.sin(x * 0.029 - t * 0.9 + k * 2) * 3;
