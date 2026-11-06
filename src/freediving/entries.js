// The dive log's entries, down the rope: each a dot on the rope with its title beside it. Clicking one opens its card (a photo, a
// summary, the text, tags and a link, whichever it has).
import { assetUrl } from '../lib/base.js';
import { h } from '../lib/dom.js';
import { METRES_PER_ENTRY } from './layout.js';

const formatDate = iso => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** The dive log from the site's entries: oldest first, so the first dive is the shallowest. */
export const diveLog = entries =>
  (entries || []).filter(e => e.line === 'down').sort((a, b) => (a.date || '').localeCompare(b.date || ''));

/**
 * Builds the entries into `world`. Gives a record of each, which layout.js moves about every frame:
 * { root, block, label, dot, conn (the line to its card, when open), scroll (its card, when open), id, data }.
 */
export function buildEntries(world, list, onPick) {
  const records = list.map((e, i) => {
    const dot = h('div', { 'data-dotc': '1', class: 'entry__dot' });
    const label = h(
      'div',
      { 'data-label': '1', class: 'entry__label', onclick: () => onPick(i) },
      h('div', { class: 'entry__title' }, e.title || 'Untitled'),
      h('div', { class: 'entry__meta' }, `${(i + 1) * METRES_PER_ENTRY} m  ·  ${formatDate(e.date)}`)
    );
    const block = h('div', { 'data-block': '1', class: 'entry__block' }, label);
    const root = h(
      'div',
      { 'data-entry': '1', 'data-i': String(i), 'data-id': e.id, class: 'entry' },
      h('div', { 'data-dot': '1', class: 'entry__hit', onclick: () => onPick(i) }, dot),
      block
    );
    return { root, block, label, dot, conn: null, scroll: null, id: e.id, data: e };
  });
  world.replaceChildren(...records.map(r => r.root));
  return records;
}

/** An entry's card. */
function card(e) {
  const tags = (Array.isArray(e.tags) ? e.tags : String(e.tags || '').split(',')).map(s => s.trim()).filter(Boolean);
  const paragraphs = String(e.body || '')
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
  // a link shows as its site's name
  let linkLabel = e.link || '';
  try {
    if (e.link) linkLabel = new URL(e.link).hostname.replace(/^www\./, '');
  } catch (x) {}
  const photo = e.image && `url("${String(assetUrl(e.image)).replace(/["\\\n\r]/g, c => encodeURIComponent(c))}")`;
  return h(
    'div',
    { 'data-scroll': '1', class: 'card' },
    photo &&
      h('div', {
        role: 'img',
        'aria-label': e.title || 'Untitled',
        class: 'card__photo',
        style: { 'background-image': photo },
      }),
    e.short && h('p', { class: 'card__short' }, e.short),
    paragraphs.map(p => h('p', { class: 'card__para' }, p)),
    tags.length > 0 &&
      h(
        'div',
        { class: 'card__tags' },
        tags.map(tag => h('span', null, tag))
      ),
    e.link && h('a', { href: e.link, target: '_blank', rel: 'noopener', class: 'card__link' }, linkLabel, ' ↗')
  );
}

/** Opens an entry's card beside its title (under it on a narrow screen), joined to it by a thin line. */
export function openCard(record) {
  record.conn = h('div', { 'data-conn': '1', class: 'entry__conn' });
  record.scroll = card(record.data);
  record.block.append(record.conn, record.scroll);
}

export function closeCard(record) {
  if (record.conn) record.conn.remove();
  if (record.scroll) record.scroll.remove();
  record.conn = record.scroll = null;
}
