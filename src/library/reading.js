// A book as a run of text blocks in the reading column: its title and subtitle, then headings, meta lines, paragraphs, list lines and
// quotes, as its kind lays them out. (How each block looks is in library.css, by its class.)
import { assetUrl } from '../lib/base.js';
import { h } from '../lib/dom.js';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const paragraphs = text =>
  (text || '')
    .split(/\n\s*\n/)
    .map(x => x.trim())
    .filter(Boolean);

/**
 * The blocks of a book, in reading order: { type, text } or { type: 'photo', src, alt }.
 * Types: title, heading (a section: it gets a ring on the line beside the text), meta, para, para-italic, line, quote, photo.
 */
export function blocksOf(book) {
  const blocks = [];
  const add = (type, text) => blocks.push({ type, text });
  add('title', book.title);
  if (book.subtitle) add('para-italic', book.subtitle);
  const items = book.items || [];
  if (book.kind === 'bujo') {
    for (const m of book.months || []) {
      add('heading', (MONTHS[m.month - 1] + ' ' + (book.year || '')).trim());
      if (m.intention) add('para-italic', m.intention);
      for (const e of m.entries || []) add('line', e.d + '   ' + e.sym + '   ' + e.text);
    }
  } else if (book.kind === 'quotes') {
    for (const q of items) {
      add('quote', '“' + q.text + '”');
      add('meta', q.who || '');
    }
  } else if (book.kind === 'pillow') {
    for (const list of items) {
      add('heading', list.title);
      for (const x of (list.items || []).filter(Boolean)) add('line', '—  ' + x);
    }
  } else {
    // readings and musings: a passage or piece may have a photo, between its heading and its text
    for (const x of items) {
      add('heading', x.title);
      add('meta', book.kind === 'musings' ? x.date || '' : x.source || '');
      if (x.image) blocks.push({ type: 'photo', src: assetUrl(x.image), alt: x.title || '' });
      for (const p of paragraphs(x.text)) add('para', p);
    }
  }
  return blocks;
}

/** The blocks as elements. onPhotoLoad runs when a photo has loaded (it moves the headings below it). */
export function renderBlocks(blocks, onPhotoLoad) {
  return blocks.map(b =>
    b.type === 'photo'
      ? h('img', { class: 'block block--photo', alt: b.alt, loading: 'lazy', onload: onPhotoLoad, src: b.src })
      : // data-h marks the blocks that get a ring on the line: the title and each heading
        h(
          'p',
          { class: 'block block--' + b.type, 'data-h': b.type === 'title' || b.type === 'heading' ? '1' : '0' },
          b.text
        )
  );
}
