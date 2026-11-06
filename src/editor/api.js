// What the editor asks of its helper on the dev server (src/dev/editor-api.mjs): the site's content as it is in the project, saving
// it back, and uploading photos and sound files into public/.
import { BASE } from '../lib/base.js';

const api = BASE + '__editor/';
const read = path =>
  fetch(api + path, { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null);

/** The site's content as published (the profile, Freediving's entries and the Library's books), or null if it can't be read. */
export const readSite = () => read('site/');

/**
 * Sound's albums as published, or null if they can't be read (never an empty list in their place, which saving would write back).
 */
export const readAlbums = () => read('sound/').then(d => (d && Array.isArray(d.albums) ? d.albums : null));

/** Writes the site's content into the project's files. Throws with the reason if it couldn't. */
export async function writeSite(site, albums) {
  const r = await fetch(api + 'save/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site, sound: { albums } }),
  });
  const answer = await r.json();
  if (!r.ok) throw new Error(answer.error || 'Save failed');
}

/** Uploads a file into public/<dir>/ and gives its path in the site. */
export async function upload(blob, dir, name) {
  const r = await fetch(api + 'upload/?dir=' + encodeURIComponent(dir) + '&name=' + encodeURIComponent(name), {
    method: 'POST',
    body: blob,
  });
  const answer = await r.json().catch(() => ({}));
  if (!r.ok || !answer.path) throw new Error(answer.error || 'Upload failed');
  return answer.path;
}

/** A photo scaled down to 1600px on its long side, as a JPEG, so the site stays quick. */
const shrink = file =>
  new Promise((resolve, reject) => {
    const img = new Image(),
      url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height)),
        canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not read that image'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });

/** Uploads a photo (scaled down first) into public/<dir>/ and gives its path in the site. */
export const uploadPhoto = async (file, dir) =>
  upload(await shrink(file), dir, file.name.replace(/\.[^.]+$/, '') + '.jpg');

/** A sound file's length in seconds (0 if the browser can't read it). */
export const audioLength = file =>
  new Promise(resolve => {
    const audio = new Audio(),
      url = URL.createObjectURL(file),
      done = seconds => {
        URL.revokeObjectURL(url);
        resolve(Math.round(seconds) || 0);
      };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => done(0);
    audio.src = url;
  });

/** The file just picked in a file input, which is cleared so that picking the same file again still counts. */
export const takeFile = event => {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  return file;
};
