// The grain every painted page has over it: a small tile of fine speckle, repeated.
import { rng } from './math.js';

/**
 * A 220px tile of grey speckle. `seed` picks the run of random numbers it is made from (so it is the same on every visit), and
 * `shade(r)` gives each speck's grey (0..255) from a random number r in 0..1.
 */
export function grainTile(seed, shade) {
  const random = rng(seed),
    canvas = document.createElement('canvas');
  canvas.width = canvas.height = 220;
  const ctx = canvas.getContext('2d'),
    image = ctx.createImageData(220, 220);
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = image.data[i + 1] = image.data[i + 2] = shade(random());
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * The paper's grain: mostly white with the odd darker speck, multiplied into the finished picture. Home and Freediving use the same
 * tile, so the texture doesn't jump when one hands over to the other.
 */
export const paperGrain = () => grainTile(5, r => 255 - Math.pow(r, 3) * 40);
