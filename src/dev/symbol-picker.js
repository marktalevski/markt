// The symbol picker: a tool for designing Home's symbols, on your own computer only. Home loads it under `npm run dev` (see
// src/home/main.js); the published site never has it, and there the black dot keeps picking at random.
//
// It is a column of the symbols' names down the left of Home: click one to brush it in, or press ← / → to step through them. The tab
// at its top (or the H key) hides it, to keep it out of the animations' way; it remembers that between reloads.
import { SHAPES } from '../home/symbols/index.js';
import { h } from '../lib/dom.js';
import './symbol-picker.css';

const REMEMBERED = 'symbol-picker-open';

/** Adds the picker to the page. home: the Home page (shapeName is the symbol showing; shuffle(name) paints another). */
export function symbolPicker(home) {
  // alphabetical here (← / → follow this order too); Home's own list stays as it is
  const names = [...SHAPES].sort();
  let wanted = null, // the symbol asked for, until Home takes it
    asking = 0,
    open = true;
  try {
    open = localStorage.getItem(REMEMBERED) !== '0';
  } catch (e) {}

  const buttons = names.map(name =>
    h('button', { class: 'symbol-picker__name', onclick: () => show(name) }, name[0].toUpperCase() + name.slice(1))
  );
  const tab = h('button', { class: 'symbol-picker__tab', onclick: () => setOpen(!open) }),
    list = h('div', { class: 'symbol-picker__list' }, buttons);
  document.body.append(h('div', { class: 'symbol-picker' }, tab, list));

  function setOpen(to) {
    open = to;
    list.hidden = !open;
    tab.textContent = open ? 'Hide ◂' : 'Symbols ▸';
    try {
      localStorage.setItem(REMEMBERED, open ? '1' : '0');
    } catch (e) {}
  }

  /** Marks the symbol that is showing (or the one asked for, until it is). */
  function mark() {
    const current = wanted || home.shapeName;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', names[i] === current));
  }

  /**
   * Paints a symbol. Home won't take another while one is still being drawn, so this keeps asking (for six seconds) until it does.
   */
  function show(name) {
    let asks = 0;
    const ask = () => {
      if (home.shuffle(name) || ++asks > 60) {
        wanted = null;
        clearInterval(asking);
      }
      mark();
    };
    wanted = name;
    clearInterval(asking);
    asking = setInterval(ask, 100);
    ask();
  }

  addEventListener('keydown', e => {
    if (e.key === 'h' || e.key === 'H') setOpen(!open);
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (step) show(names[(names.indexOf(wanted || home.shapeName) + step + names.length) % names.length]);
  });

  setOpen(open);
  // the black dot's own shuffle still works: keep the mark in step with it
  setInterval(mark, 500);
  mark();
}
