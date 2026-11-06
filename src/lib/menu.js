// The page menu's behaviour (the markup is components/PageMenu.astro): a page's name shows while its dot is under the pointer or has
// the keyboard's focus, and a click on a dot goes through the page's own way of leaving.

/**
 * @param {HTMLElement} nav the menu
 * @param {Record<string, (e: Event) => void>} go what a click on each dot does, by dot key
 */
export function bindMenu(nav, go) {
  const items = [...nav.querySelectorAll('.menu__item')];
  // one name at most: showing one hides the others, and leaving or blurring any hides whichever is showing
  const show = item => items.forEach(x => x.classList.toggle('is-on', x === item));
  for (const item of items) {
    item.addEventListener('mouseenter', () => show(item));
    item.addEventListener('focus', () => show(item));
    item.addEventListener('mouseleave', () => show(null));
    item.addEventListener('blur', () => show(null));
    const handler = go[item.dataset.navk];
    if (handler) item.addEventListener('click', handler);
  }
}
