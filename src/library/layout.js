// The Library's sizes, worked out from the window.
import { clamp } from '../lib/math.js';
import { SPINE_HEIGHT } from './books.js';

/** On a narrow screen the books stand on a shelf this tall along the bottom. */
export const SHELF_H = 152;

/**
 * Everything that depends on the window's size (vw x vh) and how many books there are.
 * On a wide screen the books lie in a stack in the bottom-right corner; on a narrow one they stand upright on a shelf along the bottom,
 * one row that scrolls sideways, so it takes the same room however many books there are.
 */
export function layoutFor(vw, vh, bookCount) {
  const narrow = vw < 760;
  const barH = narrow ? 30 : Math.round(clamp(vh * 0.045, 30, 38)); // a lying book's base thickness
  const stackW = narrow ? vw : Math.round(clamp(vw * 0.18, 196, 240));
  const stackH = narrow ? SHELF_H : bookCount * (barH + 3) + 34;
  // the reading column: as wide as the room left of the stack allows, up to 860
  const colL = narrow ? 14 : Math.round(clamp(vw * 0.02, 16, 32));
  const room = narrow ? vw - 36 : vw - stackW - Math.round(clamp(vw * 0.05, 40, 80)) - colL;
  const colW = Math.round(Math.min(860, room));
  const fontSize = Math.round(clamp(colW / 40, 16, 20));
  return {
    narrow,
    barH,
    stackW,
    colL,
    colW,
    fontSize,
    spineFontSize: narrow ? 11 : Math.round(clamp(barH * 0.36, 12, 13)),
    railH: Math.max(120, vh - 56),
    mugRight: Math.round(stackW * 0.14),
    padTop: narrow ? 96 : 34,
    padBottom: narrow ? stackH + 28 : 120,
    // the text fades out at the top and bottom of the column, over this many pixels
    fadeTop: narrow ? 80 : 14,
    fadeBottom: narrow ? stackH + 6 : 60,
  };
}

/** A spine's length and thickness. On the shelf it is the same spine turned upright, so its length is its height on screen. */
export function spineSize(L, kind) {
  const m = SPINE_HEIGHT[kind] || 1;
  return L.narrow
    ? { length: Math.round(122 * (0.88 + 0.12 * m)), thickness: Math.round(32 * m) }
    : { length: Math.round(L.stackW - 14), thickness: Math.round(L.barH * m) };
}

/** The text sizes that follow the column's base size. */
export function textSizes(fontSize) {
  return {
    base: fontSize,
    title: Math.round(fontSize * 3.2),
    heading: Math.round(fontSize * 1.3),
    quote: Math.round(fontSize * 1.55),
    meta: Math.max(11, Math.round(fontSize * 0.6)),
  };
}
