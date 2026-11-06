// The editor's building blocks: a labelled input, a labelled text area, a labelled choice, a photo field, and a list of cards.
import React from 'react';
import { assetUrl } from '../lib/base.js';
import { takeFile, uploadPhoto } from './api.js';

/** A labelled input. grow: how it shares its row (a CSS flex value). */
export const Field = ({ label, value, onChange, type, placeholder, grow }) => (
  <label className="field" style={{ flex: grow || '1 1 200px' }}>
    <span className="label">{label}</span>
    <input
      className="input"
      type={type || 'text'}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  </label>
);

/** A labelled text area. */
export const Area = ({ label, value, onChange, rows, placeholder }) => (
  <label className="field">
    <span className="label">{label}</span>
    <textarea
      className="text"
      value={value ?? ''}
      rows={rows || 6}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  </label>
);

/** A labelled choice from a list. options: [value, name] pairs. */
export const Choice = ({ label, value, onChange, options, grow }) => (
  <label className="field" style={{ flex: grow }}>
    <span className="label">{label}</span>
    <select className="input" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(([v, name]) => (
        <option key={v} value={v}>
          {name}
        </option>
      ))}
    </select>
  </label>
);

/** A photo field: a preview, Upload (into public/<dir>/) and Remove. The photo is kept by its path in the site. */
export class PhotoPick extends React.Component {
  state = { busy: false, err: '' };

  pick = event => {
    const file = takeFile(event);
    if (!file) return;
    this.setState({ busy: true, err: '' });
    uploadPhoto(file, this.props.dir).then(
      path => {
        this.setState({ busy: false });
        this.props.onChange(path);
      },
      e => this.setState({ busy: false, err: e.message })
    );
  };

  render() {
    const { value, label, onChange } = this.props;
    return (
      <div className="photo">
        <span className="label">{label || 'Photo'}</span>
        {value ? (
          <div role="img" className="photo__preview" style={{ backgroundImage: `url("${assetUrl(value)}")` }} />
        ) : null}
        <div className="photo__actions">
          <label className="button button--file">
            {this.state.busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
            <input type="file" accept="image/*" onChange={this.pick} />
          </label>
          {value ? (
            <button className="button button--quiet" onClick={() => onChange('')}>
              Remove
            </button>
          ) : null}
          {this.state.err ? <span className="error error--small">{this.state.err}</span> : null}
        </div>
      </div>
    );
  }
}

/**
 * A list of cards (pieces, passages, months...) that can each be moved up or down, removed, or added to.
 * render(item, update, index) gives a card's fields; update(patch) changes that item.
 * onChange(items, moved): moved is true when cards were added, removed or reordered (not for an edit inside one).
 */
export const CardList = ({ items, onChange, blank, render, addLabel }) => {
  const swap = (i, j) =>
    onChange(
      items.map((x, k) => (k === i ? items[j] : k === j ? items[i] : x)),
      true
    );
  return (
    <div className="cards">
      {items.map((item, i) => (
        <div key={i} className="card">
          {render(
            item,
            patch =>
              onChange(
                items.map((x, k) => (k === i ? { ...x, ...patch } : x)),
                false
              ),
            i
          )}
          <div className="card__actions">
            <button className="button" disabled={i === 0} onClick={() => swap(i, i - 1)}>
              ↑
            </button>
            <button className="button" disabled={i === items.length - 1} onClick={() => swap(i, i + 1)}>
              ↓
            </button>
            <button
              className="button button--danger"
              onClick={() => {
                if (confirm('Remove this?'))
                  onChange(
                    items.filter((_, k) => k !== i),
                    true
                  );
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button className="add" onClick={() => onChange([...items, blank()], true)}>
        {addLabel || '+ Add'}
      </button>
    </div>
  );
};

/** What every editor says at its foot. */
export const SAVED = 'Saved automatically in this browser. Save to site, then push, to publish.';
