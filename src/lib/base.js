// The site's address under its host, always ending in a slash (it is served from /markt/ on GitHub Pages).
export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/**
 * The address of a file the editor uploaded. It is stored by its path in the site (images/x.jpg, audio/y.mp3); full addresses and
 * data: URIs pass through as they are.
 */
export const assetUrl = p => (!p ? '' : /^(https?:|data:|blob:|\/)/.test(p) ? p : BASE + p);
