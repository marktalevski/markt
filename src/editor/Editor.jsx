// The editor: a private page for changing the site's content (it exists only under `npm run dev`). Three tabs: Freediving's entries,
// Sound's albums and the Library's books. What you change is kept in this browser as you go; "Save to site" writes it into the
// project's files, and pushing those publishes it.
import React from 'react';
import { BASE } from '../lib/base.js';
import { AlbumEditor } from './AlbumEditor.jsx';
import { readAlbums, readSite, takeFile, uploadPhoto, writeSite } from './api.js';
import { BookEditor, KIND_NAME } from './BookEditor.jsx';
import { newId, readDraft, writeDraft } from './draft.js';
import { EntryEditor } from './EntryEditor.jsx';

const TABS = [
  ['entries', 'Freediving'],
  ['albums', 'Sound'],
  ['books', 'Library'],
];
const NOTHING_PICKED = { entry: null, album: null, book: null };
const EMPTY = {
  entries: 'Pick an entry on the left, or add a new one.',
  albums: 'Pick an album on the left, or add a new one.',
  books: "Pick a book on the left to edit what's in it.",
};
const day = iso => {
  if (!iso) return 'no date';
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
/** What the site's content file holds: the profile, the dive log's entries and the Library's books (Sound's albums have their own). */
const siteOf = d => ({
  profile: d.profile,
  entries: (d.entries || []).filter(e => e.line === 'down'),
  books: d.books || [],
});

export default class Editor extends React.Component {
  state = {
    data: null, // the working copy: { profile, entries, books, albums }
    tab: 'entries',
    entry: null, // the id of the entry picked
    album: null, // the place of the album picked
    book: null, // the place of the book picked
    note: '', // what the editor has to say (shown in the header)
    loadFailed: false,
  };

  componentDidMount() {
    Promise.all([readSite(), readAlbums()]).then(([site, albums]) => {
      const draft = readDraft();
      // a working copy from before the Library's books were kept with the site gets the published books
      if (draft && !Array.isArray(draft.books)) draft.books = (site || {}).books || [];
      const data = draft || site;
      // the site's content couldn't be read: nothing is shown and Save to site stays off, so an empty list is never written over it
      if (!data || (!Array.isArray(data.albums) && !albums)) {
        this.setState({
          loadFailed: true,
          note: "Could not read the site's content (src/data/site.json or src/data/sound.json). Fix it, then reload this page.",
        });
        return;
      }
      // a working copy from before Sound's albums could be edited gets the site's albums
      if (!Array.isArray(data.albums)) data.albums = albums;
      // a working copy whose books or albums differ from the site's has either been edited here, or is older than the site (and
      // saving it would undo the newer ones): say so
      const differ = [
        site &&
        Array.isArray(site.books) &&
        site.books.length &&
        JSON.stringify(site.books) !== JSON.stringify(data.books)
          ? 'books'
          : '',
        albums && JSON.stringify(albums) !== JSON.stringify(data.albums) ? 'albums' : '',
      ]
        .filter(Boolean)
        .join(' and ');
      this.setState({
        data,
        note: differ
          ? `The ${differ} here differ from the site's. If you did not change them here, use Reset to published first.`
          : '',
      });
    });
  }

  /** Takes a change to the working copy (and keeps it in this browser). */
  commit(data, alsoSet) {
    let note = '';
    try {
      writeDraft(data);
    } catch (e) {
      note = 'Storage full: use smaller images or image links.';
    }
    this.setState({ data, note, ...alsoSet });
  }

  // ---- entries

  patchEntry(patch) {
    const d = this.state.data;
    this.commit({ ...d, entries: d.entries.map(e => (e.id === this.state.entry ? { ...e, ...patch } : e)) });
  }
  addEntry = () => {
    const d = this.state.data,
      entry = {
        id: newId(),
        line: 'down',
        title: 'New entry',
        date: new Date().toISOString().slice(0, 10),
        short: '',
        body: '',
        tags: '',
        image: '',
        link: '',
      };
    this.commit({ ...d, entries: [...d.entries, entry] }, { entry: entry.id });
  };
  deleteEntry = () => {
    if (!confirm('Delete this entry?')) return;
    const d = this.state.data;
    this.commit({ ...d, entries: d.entries.filter(e => e.id !== this.state.entry) }, { entry: null });
  };
  uploadEntryPhoto = event => {
    const file = takeFile(event);
    if (!file) return;
    this.setState({ note: 'Uploading the photo…' });
    uploadPhoto(file, 'images/entries').then(
      path => this.patchEntry({ image: path }),
      e => this.setState({ note: e.message })
    );
  };

  // ---- albums

  putAlbums(albums, alsoSet) {
    this.commit({ ...this.state.data, albums }, alsoSet);
  }
  moveAlbum = by => {
    const albums = this.state.data.albums.slice(),
      i = this.state.album,
      j = i + by;
    if (j < 0 || j >= albums.length) return;
    [albums[i], albums[j]] = [albums[j], albums[i]];
    this.putAlbums(albums, { album: j });
  };
  deleteAlbum = () => {
    if (confirm('Delete this album and its pieces? (Their files stay in the project.)'))
      this.putAlbums(
        this.state.data.albums.filter((_, i) => i !== this.state.album),
        { album: null }
      );
  };

  // ---- the whole site

  /** Writes the site's files in the project through the editor's helper; pushing then publishes them. */
  saveSite = () => {
    const d = this.state.data;
    if (this.state.loadFailed || !d) {
      this.setState({
        note: "Nothing was saved: the site's content could not be read when this page opened. Reload it first.",
      });
      return;
    }
    writeSite(siteOf(d), d.albums || []).then(
      () => this.setState({ note: "Saved to the site's files. Push them to publish." }),
      e => this.setState({ note: 'Could not save: ' + e.message })
    );
  };
  /** A backup of everything the editor holds (Import brings it back). */
  exportBackup = () => {
    const d = this.state.data,
      blob = new Blob([JSON.stringify({ ...siteOf(d), albums: d.albums || [] }, null, 2)], {
        type: 'application/json',
      }),
      link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'site-backup.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  importBackup = event => {
    const file = takeFile(event);
    if (!file) return;
    file.text().then(text => {
      try {
        const d = JSON.parse(text),
          now = this.state.data;
        if (!Array.isArray(d.entries)) throw 0;
        this.commit(
          {
            profile: d.profile || { name: 'Your Name', intro: '' },
            entries: d.entries,
            books: Array.isArray(d.books) ? d.books : now.books || [],
            albums: Array.isArray(d.albums) ? d.albums : now.albums || [],
          },
          NOTHING_PICKED
        );
      } catch (e) {
        this.setState({ note: 'That file is not a valid export.' });
      }
    });
  };
  resetToPublished = () => {
    if (!confirm('Throw away your changes and go back to the published entries?')) return;
    Promise.all([readSite(), readAlbums()]).then(([site, albums]) => {
      if (!site || !albums) {
        this.setState({ note: 'Could not read the published content, so nothing was reset.' });
        return;
      }
      this.commit({ ...site, albums }, { ...NOTHING_PICKED, note: '' });
    });
  };

  // ---- what shows

  /** The list on the left for the tab showing: each row's small line, its title, whether it is picked, and what picking it does. */
  rows(entries, albums, books) {
    const { tab, entry, album, book } = this.state;
    if (tab === 'albums')
      return albums.map((a, i) => {
        const pieces = (a.tracks || []).length;
        return {
          title: a.title,
          meta: pieces + ' pieces' + (pieces ? '' : ' · not shown until it has one'),
          on: i === album,
          pick: () => this.setState({ album: i }),
        };
      });
    if (tab === 'books')
      return books.map((b, i) => ({
        title: b.title,
        meta: KIND_NAME[b.kind] || b.kind,
        on: i === book,
        pick: () => this.setState({ book: i }),
      }));
    return entries
      .filter(e => e.line === 'down')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map((e, i) => ({
        title: e.title,
        meta: `${String(i + 1).padStart(2, '0')}  ·  ${day(e.date)}`,
        on: e.id === entry,
        pick: () => this.setState({ entry: e.id }),
      }));
  }

  render() {
    const d = this.state.data,
      tab = this.state.tab,
      entries = d ? d.entries : [],
      albums = (d && d.albums) || [],
      books = (d && d.books) || [],
      profile = (d && d.profile) || { name: '', intro: '' },
      count = { entries: entries.filter(e => e.line === 'down').length, albums: albums.length, books: books.length };
    const entry = tab === 'entries' ? entries.find(e => e.id === this.state.entry) : null,
      album = tab === 'albums' && this.state.album != null ? albums[this.state.album] : null,
      book = tab === 'books' && this.state.book != null ? books[this.state.book] : null;
    const setProfile = key => event => this.commit({ ...d, profile: { ...profile, [key]: event.target.value } });
    return (
      <div className="editor">
        <header className="bar">
          <div className="bar__title">Editor</div>
          <a className="bar__site" href={BASE} target="_blank">
            Open site ↗
          </a>
          <div className="bar__gap" />
          {this.state.note ? <span className="bar__note">{this.state.note}</span> : null}
          <div className="buttons">
            <button className="bar__button bar__button--main" onClick={this.saveSite}>
              Save to site
            </button>
            <button className="bar__button" onClick={this.exportBackup}>
              Export backup
            </button>
            <label className="bar__button bar__button--file">
              Import
              <input type="file" accept="application/json,.json" onChange={this.importBackup} />
            </label>
            <button className="bar__button bar__button--quiet" onClick={this.resetToPublished}>
              Reset to published
            </button>
          </div>
        </header>

        <section className="profile">
          <label className="field profile__name">
            <span className="label">Name</span>
            <input className="input input--profile" value={profile.name || ''} onChange={setProfile('name')} />
          </label>
          <label className="field profile__intro">
            <span className="label">Intro line (optional)</span>
            <input
              className="input input--profile"
              value={profile.intro || ''}
              onChange={setProfile('intro')}
              placeholder="Shown under your name on the home screen"
            />
          </label>
        </section>

        <div className="work">
          <aside className="side">
            <div className="tabs">
              {TABS.map(([key, name]) => (
                <button
                  key={key}
                  className={'tab' + (key === tab ? ' is-on' : '')}
                  onClick={() => this.setState({ tab: key, ...NOTHING_PICKED })}
                >
                  <span className="tab__name">{name}</span>
                  <span className="tab__count">{count[key]}</span>
                </button>
              ))}
            </div>
            {tab === 'albums' ? (
              <div className="side__add">
                <button
                  className="add add--wide"
                  onClick={() =>
                    this.putAlbums([...albums, { title: 'New album', img: '', imgX: 1, tracks: [] }], {
                      album: albums.length,
                    })
                  }
                >
                  + New album
                </button>
              </div>
            ) : null}
            {tab === 'entries' ? (
              <div className="side__add">
                <button className="add add--wide" onClick={this.addEntry}>
                  + New entry on Freediving
                </button>
              </div>
            ) : null}
            <div className="list">
              {this.rows(entries, albums, books).map((row, i) => (
                <button key={i} className={'list__row' + (row.on ? ' is-on' : '')} onClick={row.pick}>
                  <span className="list__meta">{row.meta}</span>
                  <span className="list__title">{row.title || 'Untitled'}</span>
                </button>
              ))}
            </div>
          </aside>
          <main className="main">
            {entry ? (
              <EntryEditor
                entry={entry}
                onChange={patch => this.patchEntry(patch)}
                onPhoto={this.uploadEntryPhoto}
                onDelete={this.deleteEntry}
              />
            ) : null}
            {book ? (
              <BookEditor
                key={this.state.book}
                book={book}
                onChange={changed =>
                  this.commit({ ...d, books: books.map((b, i) => (i === this.state.book ? changed : b)) })
                }
              />
            ) : null}
            {album ? (
              <AlbumEditor
                key={this.state.album}
                album={album}
                onChange={changed => this.putAlbums(albums.map((a, i) => (i === this.state.album ? changed : a)))}
                onMove={this.moveAlbum}
                onDelete={this.deleteAlbum}
                first={this.state.album === 0}
                last={this.state.album === albums.length - 1}
              />
            ) : null}
            {!entry && !book && !album ? <div className="main__empty">{EMPTY[tab]}</div> : null}
          </main>
        </div>
      </div>
    );
  }
}
