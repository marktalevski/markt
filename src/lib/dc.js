// The design prototypes were written as a logic class plus a template. This keeps
// that shape so the drawing code carries over unchanged: Logic holds state and
// lifecycle, View(vals) is the template as JSX, and page() joins them into a
// React component.
import React from 'react';

export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
// a file the editor uploaded is stored by its path in the site (images/x.jpg, audio/y.mp3); full addresses and data: URIs pass through as they are
export const assetUrl = p => !p ? '' : /^(https?:|data:|blob:|\/)/.test(p) ? p : BASE + p;

export class DCLogic {
  state = {};
  constructor(props) { this.props = props || {}; }
  setState(update, cb) { this.__host && this.__host.__setLogicState(update, cb); }
  forceUpdate() { this.__host && this.__host.forceUpdate(); }
  componentDidMount() {}
  componentDidUpdate() {}
  componentWillUnmount() {}
  renderVals() { return {}; }
}

// inline style strings → React style objects (cached, the templates re-render often)
const cache = new Map();
export function sty(s) {
  let o = cache.get(s);
  if (o) return o;
  o = {};
  let depth = 0, start = 0, decls = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) { decls.push(s.slice(start, i)); start = i + 1; }
  }
  decls.push(s.slice(start));
  for (const d of decls) {
    const k = d.indexOf(':');
    if (k < 0) continue;
    const prop = d.slice(0, k).trim(), val = d.slice(k + 1).trim();
    if (!prop) continue;
    const key = prop.startsWith('--') ? prop
      : prop.replace(/^-(webkit|moz|ms)-/, (_, v) => v === 'ms' ? 'ms-' : v[0].toUpperCase() + v.slice(1) + '-')
        .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    o[key] = val;
  }
  if (cache.size > 5000) cache.clear();
  cache.set(s, o);
  return o;
}

export function page(Logic, View, defaults = {}) {
  return class Page extends React.Component {
    constructor(props) {
      super(props);
      this.state = { v: 0 };
      this.logic = new Logic({ ...defaults, ...props });
      this.logic.__host = this;
    }
    __setLogicState(update, cb) {
      const prev = this.logic.state;
      const patch = typeof update === 'function' ? update(prev) : update;
      this.logic.state = { ...prev, ...patch };
      this.setState(s => ({ v: s.v + 1 }), cb);
    }
    componentDidMount() { this.logic.componentDidMount(); }
    // the logic compares against props as it sees them, defaults included (Sound restarts when prev.style differs)
    componentDidUpdate(prev) { this.logic.componentDidUpdate({ ...defaults, ...prev }); }
    componentWillUnmount() { this.logic.componentWillUnmount(); }
    render() { return View({ ...this.logic.props, ...(this.logic.renderVals() || {}) }); }
  };
}
