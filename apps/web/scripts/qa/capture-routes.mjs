// QA screenshot capture for the web app.
//
// Usage (from apps/web, with the dev server running on :3000):
//   node scripts/qa/capture-routes.mjs login
//       Opens a visible browser at /signin. Sign in with a test account, then
//       press Enter in this terminal. Saves the session to ~/.allverse-qa/auth.json
//       (outside the repo).
//   node scripts/qa/capture-routes.mjs capture <label>
//       Visits every route with the saved session and writes screenshots to
//       ~/.allverse-qa/shots/<label>/ plus an index.json of final URLs and status.
//
// Optional env for dynamic routes: LISTING_ID, USER_ID, ORDER_ID, CHAT_ID.
// Routes whose id is unset are skipped and listed in the index.

import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const QA_DIR = path.join(os.homedir(), '.allverse-qa');
const AUTH_FILE = path.join(QA_DIR, 'auth.json');

const ROUTES = [
  // Public / marketing
  ['about', '/about'], ['contact', '/contact'], ['faq', '/faq'], ['help', '/help'],
  ['pricing', '/pricing'], ['team', '/team'], ['terms', '/terms'], ['privacy', '/privacy'],
  // Discovery
  ['home', '/'], ['listings', '/listings'], ['search', '/search'], ['discover', '/discover'],
  ['ai', '/ai'], ['ai-assistant', '/ai-assistant'],
  // Auth
  ['signin', '/signin'], ['signup', '/signup'], ['verify', '/verify'],
  // Signed-in
  ['sell', '/sell'], ['cart', '/cart'], ['messages', '/messages'], ['favorites', '/favorites'],
  ['my-listings', '/my-listings'], ['orders', '/orders'], ['offers', '/offers'], ['sales', '/sales'],
  ['seller-orders', '/seller/orders'], ['settings', '/settings'], ['profile', '/profile'],
  ['success', '/success'],
  // Dynamic (need env ids)
  ['listing-detail', '/listings/{LISTING_ID}', 'LISTING_ID'],
  ['listing-legacy', '/listing/{LISTING_ID}', 'LISTING_ID'],
  ['listing-edit', '/listings/{LISTING_ID}/edit', 'LISTING_ID'],
  ['profile-user', '/profile/{USER_ID}', 'USER_ID'],
  ['chat', '/chat?chatId={CHAT_ID}', 'CHAT_ID'],
];

const [mode, label] = process.argv.slice(2);
fs.mkdirSync(QA_DIR, { recursive: true });

async function login() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/signin`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('Sign in in the browser window, then press Enter here... ');
  rl.close();
  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  console.log(`Saved session to ${AUTH_FILE}`);
}

async function capture(name) {
  if (!name) throw new Error('Give a label, e.g. capture before');
  if (!fs.existsSync(AUTH_FILE)) throw new Error('No session. Run "login" first.');

  const outDir = path.join(QA_DIR, 'shots', name);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const index = [];

  for (const [slug, template, needs] of ROUTES) {
    let url = template;
    if (needs) {
      const id = process.env[needs];
      if (!id) {
        index.push({ slug, skipped: `${needs} not set` });
        continue;
      }
      url = template.replace(`{${needs}}`, id);
    }
    try {
      const response = await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, `${slug}.png`), fullPage: true });
      index.push({
        slug,
        requested: url,
        finalPath: new URL(page.url()).pathname + new URL(page.url()).search,
        status: response?.status() ?? null,
      });
    } catch (err) {
      index.push({ slug, requested: url, error: String(err.message || err).split('\n')[0] });
    }
  }

  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
  await browser.close();
  console.log(`Wrote ${index.length} entries to ${outDir}`);
}

if (mode === 'login') await login();
else if (mode === 'capture') await capture(label);
else console.log('Usage: node scripts/qa/capture-routes.mjs login | capture <label>');
