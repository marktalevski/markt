// The Library's books: a bullet journal, short readings, quotes, a pillow book and musings. They are published with the rest of the site's
// content in public/data/site.json (under "books") and edited in the Editor's Library tab; the build serves them on their own as
// data/books.json (src/pages/data/books.json.js), which is what the Library fetches. Each book has a slug, title, kind (which sets its
// spine and how its content is laid out), a subtitle, and its content:
//   bujo: year, months: [{ month (1-12), intention, entries: [{ d (day), sym, text }] }]
//   readings: items: [{ title, source, text }]        quotes: items: [{ text, who }]
//   pillow: items: [{ title, items: [line, ...] }]     musings: items: [{ title, date, text }]
// (text: an empty line starts a new paragraph)
import { BASE } from './dc.js';

// the books, or null if they couldn't be loaded (it tries twice)
export async function loadBooks() {
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(BASE + 'data/books.json', { cache: 'no-cache' }); if (r.ok) { const d = await r.json(); if (Array.isArray(d.books)) return d.books; } } catch (e) {}
    if (!i) await new Promise(res => setTimeout(res, 600));
  }
  return null;
}
