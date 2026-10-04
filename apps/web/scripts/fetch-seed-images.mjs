// One-time helper: downloads a photo per seed listing from Wikimedia Commons into scripts/seed-images/<id>.jpg
// and records attribution in seed-images/CREDITS.json (most Commons images are CC BY / CC BY-SA).
// The images are committed, so only rerun this to add or replace photos.
// Usage (from apps/web): node scripts/fetch-seed-images.mjs [--force]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { LISTINGS } from './seed-data.mjs';

const DIR = new URL('./seed-images/', import.meta.url);
const CREDITS = new URL('CREDITS.json', DIR);
const HEADERS = { 'User-Agent': 'AllVerseSeed/1.0 (local dev seed data; https://github.com/MoMaksoud/All-verse-Lowk)' };
const force = process.argv.includes('--force');

mkdirSync(DIR, { recursive: true });
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, 'utf8')) : {};
const strip = (html = '') => html.replace(/<[^>]+>/g, '').trim();

async function findImage(query) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '5',
    gsrsearch: `${query} filetype:bitmap`, prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '800',
  }).forEach(([k, v]) => api.searchParams.set(k, v));
  const data = await (await fetch(api, { headers: HEADERS })).json();
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  return pages.map((p) => ({ title: p.title, ...p.imageinfo?.[0] })).find((i) => /jpeg|png/.test(i.mime ?? ''));
}

for (const l of LISTINGS) {
  const file = new URL(`${l.id}.jpg`, DIR);
  if (existsSync(file) && !force) continue;
  const img = await findImage(l.photo);
  if (!img) { console.error(`✗ ${l.id}: no result for "${l.photo}"`); continue; }
  const res = await fetch(img.thumburl, { headers: HEADERS });
  if (!res.ok) { console.error(`✗ ${l.id}: HTTP ${res.status}`); continue; }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  const m = img.extmetadata ?? {};
  credits[l.id] = {
    file: img.title,
    author: strip(m.Artist?.value),
    license: m.LicenseShortName?.value ?? 'unknown',
    source: img.descriptionurl,
  };
  console.log(`✓ ${l.id} ← ${img.title} (${credits[l.id].license})`);
  await new Promise((r) => setTimeout(r, 300)); // be polite to the Commons API
}

writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + '\n');
