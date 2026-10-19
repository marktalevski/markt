// The Library's books: a bullet journal, short readings, quotes, a pillow book and musings. They are published with the rest of the site's
// content in public/data/site.json (under "books") and edited in the Editor's Library tab. Each book has a slug, title, kind (one of KINDS,
// which sets its spine and how its content is laid out), a subtitle, and its content:
//   bujo: year, months: [{ month (1-12), intention, entries: [{ d (day), sym, text }] }]
//   readings: items: [{ title, source, text }]        quotes: items: [{ text, who }]
//   pillow: items: [{ title, items: [line, ...] }]     musings: items: [{ title, date, text }]
// (text: an empty line starts a new paragraph)
import { load as loadSite } from './site-data.js';

export const KINDS = ['bujo', 'readings', 'quotes', 'pillow', 'musings'];

export async function loadBooks() {
  const d = await loadSite();
  return Array.isArray(d.books) ? d.books : [];
}
