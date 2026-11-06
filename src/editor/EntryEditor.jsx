// One dive-log entry's editor (the Freediving tab): its title and date, a short text, a photo, a link, tags and the text itself.
import { assetUrl } from '../lib/base.js';
import { SAVED } from './fields.jsx';

/**
 * entry: the entry; onChange(patch): changes it; onPhoto(event): a photo was picked to upload for it; onDelete().
 */
export function EntryEditor({ entry, onChange, onPhoto, onDelete }) {
  // (an entry made before tags were typed as text may hold them as a list)
  const e = {
    title: '',
    date: '',
    short: '',
    body: '',
    link: '',
    image: '',
    ...entry,
    tags: Array.isArray(entry.tags) ? entry.tags.join(', ') : entry.tags || '',
  };
  const set = key => event => onChange({ [key]: event.target.value });
  // a photo can be an uploaded file (kept by its path), a link, or, from long ago, the image itself held in the entry
  const held = e.image.startsWith('data:');
  return (
    <div className="form">
      <div className="entry-head">
        <label className="field">
          <span className="label">Title</span>
          <input className="input input--title" value={e.title} onChange={set('title')} />
        </label>
        <label className="field">
          <span className="label">Date</span>
          <input className="input input--date" type="date" value={e.date} onChange={set('date')} />
        </label>
      </div>
      <label className="field">
        <span className="label">Short text</span>
        <input className="input" value={e.short} onChange={set('short')} />
      </label>
      <div className="photo">
        <span className="label">Image</span>
        {e.image ? (
          <div
            role="img"
            className="photo__preview photo__preview--wide"
            style={{ backgroundImage: `url("${assetUrl(e.image)}")` }}
          />
        ) : null}
        <div className="photo__actions photo__actions--entry">
          <input
            className="input input--grow"
            value={held ? '' : e.image}
            onChange={set('image')}
            placeholder={
              held ? 'Uploaded image (upload or paste a link to replace)' : 'Upload a photo, or paste an image link'
            }
          />
          <label className="button button--file button--tall">
            Upload
            <input type="file" accept="image/*" onChange={onPhoto} />
          </label>
          {e.image ? (
            <button className="button button--quiet button--tall" onClick={() => onChange({ image: '' })}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <div className="halves">
        <label className="field">
          <span className="label">Link</span>
          <input className="input" value={e.link} onChange={set('link')} placeholder="https://" />
        </label>
        <label className="field">
          <span className="label">Tags, comma separated</span>
          <input className="input" value={e.tags} onChange={set('tags')} />
        </label>
      </div>
      <label className="field">
        <span className="label">Body · empty line starts a new paragraph</span>
        <textarea className="text" value={e.body} onChange={set('body')} rows="12" />
      </label>
      <div className="foot">
        <span className="saved">{SAVED}</span>
        <button className="button button--danger button--delete" onClick={onDelete}>
          Delete entry
        </button>
      </div>
    </div>
  );
}
