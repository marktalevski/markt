// The Journal's books and what is in them: a bullet journal, short readings, quotes, a pillow book and musings. seed() is the content the
// site ships with; load() gives this browser's working copy (localStorage, under KEY) if there is one, otherwise the seed. Each book has a
// slug, title, kind (one of KINDS, which sets how it is drawn and laid out), a subtitle, and its content: months of entries for the bullet
// journal, items for the rest.
export const KEY = 'tl-journal-v1';
export const KINDS = ['bujo', 'readings', 'quotes', 'pillow', 'musings'];

export function seed() {
  return { books: [
    { slug: 'bujo-2026', title: 'BuJo 2026', kind: 'bujo', subtitle: 'Bullet journal', color: '#a8d8c8', w: 50, h: 200, year: 2026, months: [
      { month: 9, intention: 'Sleep earlier. Read every night.', entries: [
        { d: '01', sym: '×', text: 'Renew passport photos' },
        { d: '03', sym: '○', text: 'Dinner with M.' },
        { d: '08', sym: '–', text: 'Pool static, 3:20. Calm.' },
        { d: '12', sym: '★', text: 'Finish course application' },
        { d: '15', sym: '×', text: 'Laundry, groceries, call home' },
        { d: '21', sym: '•', text: 'Fix bike brakes' },
        { d: '27', sym: '○', text: 'Market, buy a film camera?' },
      ] },
      { month: 10, intention: 'Fewer screens after ten.', entries: [
        { d: '02', sym: '×', text: 'Book flights' },
        { d: '05', sym: '–', text: 'First cold morning.' },
        { d: '09', sym: '○', text: 'Gallery night' },
        { d: '14', sym: '•', text: 'Write two pages for Musings' },
        { d: '18', sym: '★', text: 'Pack the dive bag' },
      ] },
    ] },
    { slug: 'short-readings', title: 'Short Readings', kind: 'readings', subtitle: 'Parts from books and short stories I like', color: '#f7a8b8', w: 44, h: 186, items: [
      { title: 'Placeholder passage', source: 'Book title, Author', text: 'Paste a passage from a book you love here.\n\nParagraphs are separated by an empty line.' },
      { title: 'Another passage', source: 'Short story, Author', text: 'A second excerpt goes here.' },
    ] },
    { slug: 'quotes', title: 'Quotes', kind: 'quotes', subtitle: 'Lines worth keeping', color: '#8fc1e8', w: 36, h: 176, items: [
      { text: 'We suffer more often in imagination than in reality.', who: 'Seneca' },
      { text: 'The happiness of your life depends upon the quality of your thoughts.', who: 'Marcus Aurelius' },
      { text: 'A journey of a thousand miles begins with a single step.', who: 'Lao Tzu' },
      { text: 'No man ever steps in the same river twice.', who: 'Heraclitus' },
    ] },
    { slug: 'pillow-book', title: 'Pillow Book', kind: 'pillow', subtitle: 'Things about life', color: '#b9a6f0', w: 42, h: 192, items: [
      { title: 'Dislikeable things', items: ['A mosquito flying by my ear just as I fall asleep.', 'A pen that runs dry halfway through a sentence.', 'Wet socks.'] },
      { title: 'Things that make the heart beat faster', items: ['Looking down the line before a deep dive.', 'An unopened letter.'] },
      { title: 'Pleasing things', items: ['Fresh sheets.', 'The first coffee of the morning, before anyone else is awake.'] },
    ] },
    { slug: 'musings', title: 'Musings', kind: 'musings', subtitle: 'Things I have written', color: '#ffd88a', w: 46, h: 198, items: [
      { title: 'On the line', date: '2026-10-02', text: 'Sample text to test the reading width. The morning was flat and grey, the kind of calm that makes the water look like poured metal, and I sat on the edge of the boat for a long time before getting in. There is a moment before every dive where the body argues with the plan, and I have learned to let it talk without answering.\n\nThe rope hangs straight down into blue that gets darker without ever becoming black. You follow it with your hands, not your eyes. Somewhere around ten metres the sound changes; the boat engine and the voices above fall away and what is left is the click of your own ears equalizing and a pressure that feels less like weight and more like being held.\n\nI used to think the hard part was going down. It turns out the hard part is staying still while everything in you wants to hurry. Hurrying costs oxygen. Thinking costs oxygen. Even wanting costs oxygen. So you practise wanting less, at least for forty seconds at a time.\n\nOn the way back up the light comes first as a rumour and then all at once. You break the surface and the air is loud and bright and ordinary, and for a few minutes everything on land seems slightly too fast. I write this down so I remember that the slowness was real, that it was there under the water the whole time, and that I can go back to it.\n\nLater, drying off on the deck, someone asked what I think about down there. Nothing, I said, which was almost true. Mostly I count. Mostly I listen. Mostly I wait for the rope to tell me it is time to turn around.' },
      { title: 'Second piece', date: '2026-10-11', text: 'Another placeholder piece.' },
    ] },
  ] };
}

export function load() {
  try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {}
  return seed();
}

export function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
