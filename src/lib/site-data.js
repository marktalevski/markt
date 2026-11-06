// The site's content: the dive log's entries and the Library's books. The published copy lives in public/data/site.json and every visitor sees those; they are
// fetched when a page needs them, so entry images never weigh down the page code. The Editor keeps a
// working copy in this browser (localStorage) until it is exported and saved over public/data/site.json.
import { BASE } from './dc.js';

export const KEY = 'tl-site-v1';

let n = 0;
export const newId = () => 'e' + Date.now().toString(36) + (n++).toString(36) + Math.random().toString(36).slice(2, 5);

// the published copy, or null if it couldn't be fetched
export async function fetchSite() {
  try {
    const r = await fetch(BASE + 'data/site.json', { cache: 'no-cache' });
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}
// what the site shows (nothing yet, if it couldn't be fetched)
export async function load() {
  return (await fetchSite()) || { profile: { name: '', intro: '' }, entries: [], books: [] };
}

// the Editor's working copy, or the published entries if there is none yet (pub: the published copy, if it is already being fetched; null
// if that failed, and with no working copy then there is nothing to edit)
export async function loadDraft(pub = fetchSite()) {
  let draft = null;
  try {
    const r = localStorage.getItem(KEY);
    if (r) draft = JSON.parse(r);
  } catch (e) {}
  if (!draft) return pub;
  // a working copy from before the Library's books were in site.json gets the published books
  if (!Array.isArray(draft.books)) draft.books = ((await pub) || {}).books || [];
  return draft;
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
