// Where the Freediving rope (and its buoy) hangs: this far in from the left edge, on narrow screens and wide. Home draws the buoy and the
// surface in the same place when it hands over to Freediving, so both pages take it from here. It leaves room on the rope's left for the squid
export const ropeX = W => W < 720 ? 52 : 84;
// the water's surface: how far down the page it sits on a screen H tall, and the height of wave k (0 the dark top line, then the two blues)
// at x along it and t seconds in; Home draws it handing over to Freediving, so they share it
export const surfaceY = H => Math.max(H * .26, 190);
export const waveY = (x, k, t) => k * 16 + Math.sin(x * .011 + t * .6 + k * 1.3) * 7 * (1 - k * .25) + Math.sin(x * .029 - t * .9 + k * 2) * 3;
// the point u (0..1) along the cubic Bézier curve from A to D, pulled by B and C; the routes the lines and dots fly along are built from it
export const cubicAt = (A, B, C, D, u) => { const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; return [a * A[0] + b * B[0] + c * C[0] + d * D[0], a * A[1] + b * B[1] + c * C[1] + d * D[1]]; };
