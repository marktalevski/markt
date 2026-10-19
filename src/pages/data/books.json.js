// The Library's books on their own, taken from public/data/site.json when the site is built, so the Library downloads only its books and
// not the dive log (and any photos uploaded in the editor) as well. Publishing is unchanged: site.json is still the one file to update.
import site from '../../../public/data/site.json';

export function GET() {
  return new Response(JSON.stringify({ books: Array.isArray(site.books) ? site.books : [] }), { headers: { 'Content-Type': 'application/json' } });
}
