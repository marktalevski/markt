// One book's editor (the Library tab): its title and subtitle, then what is in it, laid out for its kind. A bullet journal has months
// of dated entries; the others have a list of items (passages, quotes, lists or pieces).
import React from 'react';
import { Area, CardList, Choice, Field, PhotoPick, SAVED } from './fields.jsx';

export const KIND_NAME = {
  bujo: 'Bullet journal',
  readings: 'Short readings',
  quotes: 'Quotes',
  pillow: 'Pillow book',
  musings: 'Musings',
};
const ITEMS_NAME = { bujo: 'Months', quotes: 'Quotes', pillow: 'Lists', musings: 'Pieces' };
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((name, i) => [i + 1, name]);
const today = () => new Date().toISOString().slice(0, 10);

// a bullet journal's month is typed as lines: the day, then a symbol if the next word is one (a mark like × ○ – ★ •, not a word),
// then the text
const entriesText = month =>
  (month.entries || []).map(e => [e.d, e.sym, e.text].filter(x => x != null && x !== '').join('  ')).join('\n');
const parseEntries = text =>
  text
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const words = line.trim().split(/\s+/),
        hasSym = words.length > 2 && /^[^\p{L}\p{N}]{1,2}$/u.test(words[1]);
      return { d: words[0] || '', sym: hasSym ? words[1] : '', text: words.slice(hasSym ? 2 : 1).join(' ') };
    });

export class BookEditor extends React.Component {
  // text areas that hold a list (a month's entries, a pillow list) keep what you type as you type it; the book stores it parsed
  state = { raw: {} };

  set(patch) {
    this.props.onChange({ ...this.props.book, ...patch });
  }
  rawOf(key, fallback) {
    return this.state.raw[key] ?? fallback;
  }
  setRaw(key, text, apply) {
    this.setState(s => ({ raw: { ...s.raw, [key]: text } }));
    apply(text);
  }

  /** The book's cards, kept under `key`. */
  list(key, blank, render) {
    return (
      <CardList
        items={this.props.book[key] || []}
        blank={blank}
        render={render}
        onChange={(items, moved) => {
          // moving or removing cards resets the typed-as-you-go text, which is kept by position
          if (moved) this.setState({ raw: {} });
          this.set({ [key]: items });
        }}
      />
    );
  }

  months() {
    return this.list(
      'months',
      () => ({ month: new Date().getMonth() + 1, intention: '', entries: [] }),
      (m, update, i) => (
        <>
          <div className="row">
            <Choice
              label="Month"
              value={m.month}
              onChange={v => update({ month: +v })}
              options={MONTHS}
              grow="0 1 180px"
            />
            <Field label="Intention" value={m.intention} onChange={v => update({ intention: v })} grow="2 1 260px" />
          </div>
          <Area
            label="Entries · one per line: day, symbol, text"
            rows={8}
            placeholder={'03  ○  Dinner with M.\n12  ★  Finish course application'}
            value={this.rawOf('m' + i, entriesText(m))}
            onChange={v => this.setRaw('m' + i, v, text => update({ entries: parseEntries(text) }))}
          />
        </>
      )
    );
  }

  readings() {
    return this.list(
      'items',
      () => ({ title: 'New passage', source: '', text: '' }),
      (x, update) => (
        <>
          <div className="row">
            <Field label="Title" value={x.title} onChange={v => update({ title: v })} />
            <Field label="Source · book, author" value={x.source} onChange={v => update({ source: v })} />
          </div>
          <PhotoPick
            label="Photo (optional)"
            dir="images/library"
            value={x.image}
            onChange={v => update({ image: v })}
          />
          <Area
            label="Passage · empty line starts a new paragraph"
            rows={8}
            value={x.text}
            onChange={v => update({ text: v })}
          />
        </>
      )
    );
  }

  quotes() {
    return this.list(
      'items',
      () => ({ text: '', who: '' }),
      (x, update) => (
        <>
          <Area label="Quote" rows={3} value={x.text} onChange={v => update({ text: v })} />
          <Field label="Who said it" value={x.who} onChange={v => update({ who: v })} />
        </>
      )
    );
  }

  pillow() {
    return this.list(
      'items',
      () => ({ title: 'New list', items: [] }),
      (x, update, i) => (
        <>
          <Field label="Title" value={x.title} onChange={v => update({ title: v })} />
          <Area
            label="One thing per line"
            rows={6}
            value={this.rawOf('p' + i, (x.items || []).join('\n'))}
            onChange={v =>
              this.setRaw('p' + i, v, text =>
                update({
                  items: text
                    .split('\n')
                    .map(line => line.trim())
                    .filter(Boolean),
                })
              )
            }
          />
        </>
      )
    );
  }

  musings() {
    return this.list(
      'items',
      () => ({ title: 'New piece', date: today(), text: '' }),
      (x, update) => (
        <>
          <div className="row">
            <Field label="Title" value={x.title} onChange={v => update({ title: v })} grow="2 1 260px" />
            <Field label="Date" type="date" value={x.date} onChange={v => update({ date: v })} grow="0 1 170px" />
          </div>
          <PhotoPick
            label="Photo (optional)"
            dir="images/library"
            value={x.image}
            onChange={v => update({ image: v })}
          />
          <Area
            label="Text · empty line starts a new paragraph"
            rows={14}
            value={x.text}
            onChange={v => update({ text: v })}
          />
        </>
      )
    );
  }

  render() {
    const book = this.props.book,
      kind = book.kind;
    return (
      <div className="form">
        <div className="label">{KIND_NAME[kind] || kind}</div>
        <div className="row">
          <Field
            label="Title (on the spine)"
            value={book.title}
            onChange={v => this.set({ title: v })}
            grow="2 1 260px"
          />
          {kind === 'bujo' ? (
            <Field
              label="Year"
              type="number"
              value={book.year}
              onChange={v => {
                const year = parseInt(v, 10);
                this.set({ year: isNaN(year) ? '' : year });
              }}
              grow="0 1 120px"
            />
          ) : null}
        </div>
        <Field label="Subtitle" value={book.subtitle} onChange={v => this.set({ subtitle: v })} grow="0 0 auto" />
        <div className="label label--section">{ITEMS_NAME[kind] || 'Passages'}</div>
        {kind === 'bujo' ? this.months() : null}
        {kind === 'readings' ? this.readings() : null}
        {kind === 'quotes' ? this.quotes() : null}
        {kind === 'pillow' ? this.pillow() : null}
        {kind === 'musings' ? this.musings() : null}
        <div className="saved saved--foot">{SAVED}</div>
      </div>
    );
  }
}
