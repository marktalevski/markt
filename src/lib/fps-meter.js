// A frame meter, for checking on a real phone or computer that the animations keep up. Open any page with ?fps at the end of its
// address: it then stays on from page to page (?fps=0 turns it off). layouts/Base.astro loads this file only while it is on.
//
// It sits bottom left. Each bar is one frame, its height how long the frame took; red ones took more than 1.5 frames (a stutter you
// could see). The line under the bars: the screen's rate, the stutters on this page (counted once the meter has been up a second,
// after the page's arrival has settled behind the cover), and the slowest of the frames shown. If the page has settled at an easier
// pace for this device (see loop.js), the top right corner says which: "1/2" is a frame for every second one of the screen's, and
// "x0.7" is canvases drawn with 0.7 of the pixels each way.

const WIDTH = 196,
  HEIGHT = 52; // the meter's size, in CSS pixels
const SHOWN = 120; // how many frames it shows
const PAD = 6,
  BARS_HEIGHT = 28,
  BARS_BOTTOM = PAD + BARS_HEIGHT;

export function startFpsMeter() {
  const dpr = Math.min(2, devicePixelRatio || 1),
    canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d');
  canvas.width = WIDTH * dpr;
  canvas.height = HEIGHT * dpr;
  canvas.setAttribute('data-nocover', ''); // (left out of the picture a page leaves behind: see cover.js)
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:fixed;left:8px;bottom:8px;width:${WIDTH}px;height:${HEIGHT}px;z-index:2147483600;pointer-events:none;border-radius:6px`;
  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);

  const frames = [], // how long each of the last frames took, in milliseconds
    startedAt = performance.now();
  let last = 0,
    stutters = 0;

  const tick = now => {
    requestAnimationFrame(tick);
    if (last) {
      frames.push(now - last);
      if (frames.length > SHOWN) frames.shift();
    }
    last = now;

    // the screen's own frame time is taken to be the middle one of the frames shown
    const sorted = frames.slice().sort((a, b) => a - b),
      usual = sorted[sorted.length >> 1] || 1000 / 60,
      slow = usual * 1.5,
      latest = frames[frames.length - 1] || 0;
    if (frames.length > 10 && now - startedAt > 1000 && latest > slow) stutters++;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'rgba(12,12,12,.78)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // the bars, with a faint line at the height of a slow frame
    const scale = BARS_HEIGHT / (usual * 3),
      step = (WIDTH - 2 * PAD) / SHOWN;
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(PAD, BARS_BOTTOM - slow * scale, WIDTH - 2 * PAD, 1);
    frames.forEach((ms, i) => {
      const height = Math.min(BARS_HEIGHT, ms * scale);
      ctx.fillStyle = ms > slow ? '#ff5a4f' : '#5fd38a';
      ctx.fillRect(PAD + i * step, BARS_BOTTOM - height, Math.max(1, step - 0.3), height);
    });

    ctx.fillStyle = '#f2f2f0';
    ctx.font = '10px ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'alphabetic';
    const rate = Math.round(1000 / usual),
      slowest = Math.round(sorted[sorted.length - 1] || 0);
    ctx.fillText(`${rate} Hz  ${stutters} stutters  max ${slowest} ms`, PAD, HEIGHT - 7);
    const pace = window.__pace && window.__pace();
    if (pace && (pace.every > 1 || pace.pixels < 1)) {
      const note = [pace.every > 1 ? '1/' + pace.every : '', pace.pixels < 1 ? 'x' + pace.pixels : '']
        .filter(Boolean)
        .join(' ');
      ctx.textAlign = 'right';
      ctx.fillText(note, WIDTH - PAD, PAD + 9);
      ctx.textAlign = 'left';
    }
  };
  requestAnimationFrame(tick);
}
