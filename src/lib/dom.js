// A small helper for building elements.

/**
 * h('button', { class: 'book', 'data-kind': 'bujo', style: { '--w': '120px' }, onclick: fn }, child, 'text', ...)
 * Attributes are set as attributes; `style` takes an object (custom properties included); `on...` keys add listeners.
 * Children that are null, false or empty are left out, so `cond && h(...)` works.
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'style') for (const [prop, v] of Object.entries(value)) el.style.setProperty(prop, v);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat().filter(c => c != null && c !== false && c !== ''));
  return el;
}

/**
 * Follows a press that has just begun: `move(event)` on every move of the pointer, then `end()` when it lifts (or the browser takes
 * the pointer away).
 */
export function followDrag(move, end) {
  const stop = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', stop);
    removeEventListener('pointercancel', stop);
    end();
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', stop);
  addEventListener('pointercancel', stop);
}
