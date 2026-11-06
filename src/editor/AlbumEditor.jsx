// One album's editor (the Sound tab): its title and photo, how the photo lies on the page, and its pieces, each with a title, a date,
// a kind and a sound file.
import React from 'react';
import { assetUrl } from '../lib/base.js';
import { audioLength, takeFile, upload } from './api.js';
import { CardList, Choice, Field, PhotoPick, SAVED } from './fields.jsx';

const KINDS = [
  ['music', 'Music'],
  ['voice', 'Voice'],
  ['field', 'Field recording'],
];
const today = () => new Date().toISOString().slice(0, 10);
const minSec = s => (s ? Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0') : '');

export class AlbumEditor extends React.Component {
  state = { busy: null, err: '' }; // busy: the piece whose sound file is uploading

  set(patch) {
    this.props.onChange({ ...this.props.album, ...patch });
  }

  /** Uploads a piece's sound file, and takes the piece's length from it. */
  pickAudio(i, event) {
    const file = takeFile(event);
    if (!file) return;
    this.setState({ busy: i, err: '' });
    Promise.all([upload(file, 'audio', file.name), audioLength(file)]).then(
      ([src, dur]) => {
        this.setState({ busy: null });
        const tracks = this.props.album.tracks || [];
        this.set({ tracks: tracks.map((t, j) => (j === i ? { ...t, src, dur: dur || t.dur } : t)) });
      },
      e => this.setState({ busy: null, err: e.message })
    );
  }

  render() {
    const { album, first, last, onMove, onDelete } = this.props,
      tracks = album.tracks || [];
    return (
      <div className="form">
        <Field label="Album title" value={album.title} onChange={v => this.set({ title: v })} grow="0 0 auto" />
        <PhotoPick
          label="Album photo (shown in black and white)"
          dir="images/sound"
          value={album.img}
          onChange={v => this.set({ img: v })}
        />
        <div className="checks">
          <label className="check">
            <input
              type="checkbox"
              checked={!!album.imgMirror}
              onChange={e => this.set({ imgMirror: e.target.checked })}
            />
            Mirror the photo
          </label>
          <label className="check">
            <input type="checkbox" checked={!!album.imgFlip} onChange={e => this.set({ imgFlip: e.target.checked })} />
            Turn it upside down
          </label>
        </div>
        <div className="label label--section">Pieces</div>
        <CardList
          items={tracks}
          addLabel="+ Add a piece"
          onChange={t => this.set({ tracks: t })}
          blank={() => ({ title: 'New piece', kind: 'music', date: today(), dur: 60, src: '' })}
          render={(t, update, i) => (
            <>
              <div className="row">
                <Field label="Title" value={t.title} onChange={v => update({ title: v })} grow="2 1 240px" />
                <Field label="Date" type="date" value={t.date} onChange={v => update({ date: v })} grow="0 1 170px" />
                <Choice
                  label="Kind"
                  value={t.kind || 'music'}
                  onChange={v => update({ kind: v })}
                  options={KINDS}
                  grow="0 1 170px"
                />
              </div>
              <div className="sound-file">
                <span className="label">Sound file</span>
                <span className="sound-file__name">
                  {t.src
                    ? t.src.replace(/^audio\//, '') + (t.dur ? '  ·  ' + minSec(t.dur) : '')
                    : 'none yet (plays a stand-in)'}
                </span>
                <label className="button button--file">
                  {this.state.busy === i ? 'Uploading…' : t.src ? 'Replace' : 'Upload'}
                  <input type="file" accept="audio/*" onChange={event => this.pickAudio(i, event)} />
                </label>
                {t.src ? <audio controls preload="none" src={assetUrl(t.src)} /> : null}
                {t.src ? (
                  <button className="button button--quiet" onClick={() => update({ src: '' })}>
                    Remove
                  </button>
                ) : null}
              </div>
            </>
          )}
        />
        {this.state.err ? <div className="error">{this.state.err}</div> : null}
        <div className="foot foot--wrap">
          <span className="saved">{SAVED}</span>
          <div className="buttons">
            <button className="button" disabled={first} onClick={() => onMove(-1)}>
              Move earlier
            </button>
            <button className="button" disabled={last} onClick={() => onMove(1)}>
              Move later
            </button>
            <button className="button button--danger" onClick={onDelete}>
              Delete album
            </button>
          </div>
        </div>
      </div>
    );
  }
}
