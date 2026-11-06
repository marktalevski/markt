// The cover: a picture of the last page, kept up over the next one until it has drawn its own first frame.
//
// Every page is a canvas that draws nothing until its script has started, so between two pages there would be a blank moment. So a
// page leaves through leaveTo(), which keeps a picture of its last frame; the next page shows that picture straight away (the script
// at the top of the body in layouts/Base.astro, which has to run before anything is painted) until it calls pageReady().

const KEY = 'page-cover';

/** The page as it looks now, as a JPEG: its background, its canvases and its menu dots (which are HTML, so they are drawn in). */
function pictureOfPage() {
  const W = innerWidth,
    H = innerHeight,
    picture = document.createElement('canvas'),
    ctx = picture.getContext('2d');
  picture.width = W;
  picture.height = H;
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#f5f3ee';
  ctx.fillRect(0, 0, W, H);

  document.querySelectorAll('canvas:not([data-nocover])').forEach(canvas => {
    const box = canvas.getBoundingClientRect(),
      style = getComputedStyle(canvas);
    if (!box.width || !box.height || style.display === 'none' || style.visibility === 'hidden') return;
    ctx.globalAlpha = +style.opacity;
    if (ctx.globalAlpha > 0)
      try {
        ctx.drawImage(canvas, box.left, box.top, box.width, box.height);
      } catch (e) {}
  });

  ctx.globalAlpha = 1;
  document.querySelectorAll('[data-navdot]').forEach(dot => {
    const box = dot.getBoundingClientRect(),
      style = getComputedStyle(dot);
    if (box.width < 3 || +style.opacity === 0 || style.visibility === 'hidden') return;
    ctx.fillStyle = style.backgroundColor;
    ctx.beginPath();
    ctx.arc(box.left + box.width / 2, box.top + box.height / 2, box.width / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  return picture.toDataURL('image/jpeg', 0.9);
}

/** Goes to another page, leaving this one's picture for it to arrive under. */
export function leaveTo(href) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), src: pictureOfPage() }));
  } catch (e) {}
  location.href = href;
}

/** Says this page has drawn its first frame, so the last page's picture can lift off it. */
export const pageReady = () => window.__ready && window.__ready();
