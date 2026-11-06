// The Library's books. They are published with the rest of the site's content in site.json (under "books") and edited in the editor's
// Library tab. Each book has a slug, a title, a subtitle, a kind (which sets its spine and how its content is laid out) and its content:
//   bujo:     year, months: [{ month (1-12), intention, entries: [{ d (day), sym, text }] }]
//   readings: items: [{ title, source, text, image? }]      quotes:  items: [{ text, who }]
//   pillow:   items: [{ title, items: [line, ...] }]        musings: items: [{ title, date, text, image? }]
// (in a text, an empty line starts a new paragraph)
//
// This file: what each kind looks like and which menu dot it is. (A spine's pattern is in library.css, by kind.)

/** The kinds of book the Library knows how to dress; any other kind gets a plain grey spine. */
export const KINDS = ['bujo', 'readings', 'quotes', 'pillow', 'musings'];

/** Each kind's cover colour: the line beside the text takes it while that book is open. */
export const COVER = { bujo: '#3f5fae', readings: '#d4573f', quotes: '#7f63ad', pillow: '#e39440', musings: '#5d9a63' };

/** How tall each kind's spine is, against the stack's base height. */
export const SPINE_HEIGHT = { bujo: 1.08, readings: 0.94, quotes: 0.86, pillow: 1, musings: 1.14 };

/** Each book is one of the menu's dots: it arrives as that dot and opens out into the book, and leaves by folding back into it. */
export const BOOK_DOT = { bujo: 'freediving', readings: 'sound', quotes: 'c6', pillow: 'c4', musings: 'c5' };
