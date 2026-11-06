// The books themselves: each a painted spine you can click, lying in a stack (wide screens) or standing on a shelf (narrow ones),
// with a mug on the top book.
import { h } from '../lib/dom.js';
import { KINDS } from './books.js';
import { spineSize } from './layout.js';

// what is painted on each kind's spine, in order from the bottom layer up; 'label' carries the book's title
const SPINE_PARTS = {
  bujo: ['dots', 'band-left', 'band-right', 'label'],
  readings: ['hatch', 'plate', 'label', 'ring'],
  quotes: ['stripes', 'label', 'bar', 'bar spine__bar--faint'],
  pillow: ['scales', 'label', 'triangle'],
  musings: ['wash', 'corner', 'label'],
  other: ['label'],
};

/** A spine's painting: soft brush streaks, then its kind's own pattern and label. */
function spineArt(kind, title) {
  const label = kind === 'quotes' ? '“' + title + '”' : title;
  return h(
    'span',
    { 'aria-hidden': 'true', class: 'spine spine--' + kind },
    h('span', { class: 'spine__streaks' }),
    SPINE_PARTS[kind].map(part => h('span', { class: 'spine__' + part }, part === 'label' ? label : null))
  );
}

const mug = () => document.getElementById('mug').content.firstElementChild.cloneNode(true);

/**
 * Fills `box` with the books for layout L (from layoutFor), top book first. Each book is a button carrying data-book, data-kind and
 * data-slug; onPick(slug) runs when one is clicked.
 */
export function buildShelf(box, books, L, onPick) {
  const buttons = books.map(book => {
    const kind = KINDS.includes(book.kind) ? book.kind : 'other';
    return h(
      'button',
      {
        class: 'book' + (L.narrow ? ' book--upright' : ''),
        'data-book': '1',
        'data-upright': L.narrow ? '1' : null,
        'data-kind': kind,
        'data-slug': book.slug,
        'aria-label': 'Read ' + book.title,
        onclick: () => onPick(book.slug),
      },
      spineArt(kind, book.title)
    );
  });
  box.className = L.narrow ? 'shelf' : 'stack';
  if (L.narrow) {
    // upright spines in a row that scrolls sideways, each in a slot as wide as the book is thick, and a small mug at the end
    box.setAttribute('data-shelf', '1');
    box.replaceChildren(
      ...buttons.map(b => h('div', { class: 'shelf__slot' }, b)),
      h('div', { class: 'shelf__mug' }, h('span', null, h('span', null, mug())))
    );
  } else {
    box.removeAttribute('data-shelf');
    if (buttons[0]) buttons[0].append(mug());
    box.replaceChildren(...buttons);
  }
  sizeShelf(box, books, L);
}

/** Sets each book's size for layout L (the shelf's slots follow their book). */
export function sizeShelf(box, books, L) {
  box.querySelectorAll('[data-book]').forEach((button, i) => {
    const { length, thickness } = spineSize(L, books[i].kind);
    button.style.setProperty('--len', length + 'px');
    button.style.setProperty('--thick', thickness + 'px');
    if (L.narrow) {
      button.parentElement.style.width = thickness + 'px';
      button.parentElement.style.height = length + 'px';
    }
  });
}

/** Slides the open book out of the stack (out to the left; on the shelf, up out of the row) and the rest back in. */
export function markOpen(box, slug, narrow) {
  box.querySelectorAll('[data-book]').forEach(button => {
    const open = button.dataset.slug === slug;
    button.classList.toggle('is-open', open);
    button.style.setProperty('--tx', (open ? (narrow ? 14 : -40) : 0) + 'px');
  });
}
