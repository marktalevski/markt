// The paper every painted page is on.
import { rng } from './math.js';

/**
 * The paper's grain: a small tile of fine speckle, laid over the finished picture (multiplied in). Home and Freediving use the same
 * tile, so the texture doesn't jump when one hands over to the other.
 */
export function paperGrain() {
  const random = rng(5),
    canvas = document.createElement('canvas');
  canvas.width = canvas.height = 220;
  const ctx = canvas.getContext('2d'),
    image = ctx.createImageData(220, 220);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 255 - Math.pow(random(), 3) * 40;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
