// The editor's working copy: everything it edits, kept in this browser as you type, until "Save to site" writes it into the project.

const KEY = 'tl-site-v1';

/** The working copy, or null if there is none yet (or it can't be read). */
export function readDraft() {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

/** Keeps the working copy. (Throws if the browser's storage is full.) */
export function writeDraft(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

let made = 0;
/** A new entry's id. */
export const newId = () =>
  'e' + Date.now().toString(36) + (made++).toString(36) + Math.random().toString(36).slice(2, 5);
