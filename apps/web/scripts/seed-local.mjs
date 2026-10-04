// Seeds the Firebase emulators with the sample data in seed-data.mjs.
// Run `pnpm emulators` first, then `pnpm seed:local` from apps/web (or just `pnpm sandbox` from the root).
// Always targets localhost emulators; never touches the real project.

import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { USERS, LISTINGS, ORDERS, FAVORITES, CHATS, SHIPPING_ADDRESSES } from './seed-data.mjs';

const PROJECT_ID = 'demo-allverse';
const BUCKET = `${PROJECT_ID}.appspot.com`;
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

const { initializeApp, getApps } = await import('firebase-admin/app');
const { getAuth } = await import('firebase-admin/auth');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
const { getStorage } = await import('firebase-admin/storage');

if (!getApps().length) initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET });
const auth = getAuth();
const db = getFirestore();
const bucket = getStorage().bucket();

const PASSWORD = 'password123';
const IMAGE = '/fallback-product.png';
const IMAGES_DIR = new URL('./seed-images/', import.meta.url);
const DAY = 86_400_000;

const listingDocId = (key) => `seed-listing-${key}`;
const listingByKey = Object.fromEntries(LISTINGS.map((l) => [l.id, l]));
const userByUid = Object.fromEntries(USERS.map((u) => [u.uid, u]));
const soldOrders = Object.fromEntries(ORDERS.map((o) => [o.listing, o]));

// Mirrors generateSearchKeywords in src/lib/searchTokens.ts
function generateSearchKeywords({ title, description, brand, model, category }) {
  const tokens = [title, description, brand, model, category].filter(Boolean).join(' ')
    .toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  const titleWords = (title || '').toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  for (let i = 0; i < titleWords.length - 1; i++) {
    tokens.push(titleWords[i].replace(/[^a-z0-9]/g, '') + titleWords[i + 1].replace(/[^a-z0-9]/g, ''));
  }
  return [...new Set(tokens)].slice(0, 80);
}

async function upsertUser(u) {
  try {
    await auth.getUser(u.uid);
    await auth.updateUser(u.uid, { email: u.email, password: PASSWORD, displayName: u.displayName, emailVerified: true });
  } catch {
    await auth.createUser({ uid: u.uid, email: u.email, password: PASSWORD, displayName: u.displayName, emailVerified: true });
  }
  const joined = Timestamp.fromMillis(Date.now() - 90 * DAY);
  await db.collection('users').doc(u.uid).set({
    displayName: u.displayName,
    username: u.username,
    email: u.email,
    photoURL: '/default-avatar.png',
    role: u.role,
    createdAt: joined,
    updatedAt: Timestamp.now(),
  }, { merge: true });
  await db.collection('usernames').doc(u.username).set({ uid: u.uid }, { merge: true });
  await db.collection('profiles').doc(u.uid).set({
    userId: u.uid,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    interestCategories: ['electronics', 'fashion', 'home'],
    userActivity: u.role === 'seller' ? 'both-buy-sell' : 'buy-only',
    createdAt: joined,
  }, { merge: true });
}

// Uploads seed-images/<id>.jpg to the Storage emulator (same path layout as uploadListingPhotoFile)
// and returns its download URL. Falls back to the placeholder if the photo is missing.
async function uploadListingPhoto(l) {
  const file = new URL(`${l.id}.jpg`, IMAGES_DIR);
  if (!existsSync(file)) return IMAGE;
  const data = readFileSync(file);
  const contentType = data[0] === 0x89 ? 'image/png' : 'image/jpeg'; // a few Commons photos are PNGs
  const path = `listing-photos/${l.sellerId}/${listingDocId(l.id)}/${l.id}.jpg`;
  const token = randomUUID();
  await bucket.file(path).save(data, { metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } } });
  return `http://localhost:9199/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function seedListings() {
  const photos = Object.fromEntries(await Promise.all(LISTINGS.map(async (l) => [l.id, await uploadListingPhoto(l)])));
  const batch = db.batch();
  for (const l of LISTINGS) {
    const created = Timestamp.fromMillis(Date.now() - l.daysAgo * DAY - 3_600_000);
    const order = soldOrders[l.id];
    batch.set(db.collection('listings').doc(listingDocId(l.id)), {
      title: l.title,
      description: l.description,
      price: l.price,
      currency: 'USD',
      images: [photos[l.id]],
      category: l.category,
      condition: l.condition,
      sellerId: l.sellerId,
      inventory: order ? 0 : 1,
      isActive: !order,
      brand: l.brand ?? null,
      model: l.model ?? null,
      searchKeywords: generateSearchKeywords(l),
      sold: !!order,
      soldCount: order ? 1 : 0,
      ...(order && { soldAt: Timestamp.fromMillis(Date.now() - order.daysAgo * DAY), soldThroughAllVerse: true }),
      createdAt: created,
      updatedAt: created,
    });
  }
  await batch.commit();
}

async function seedOrders() {
  const batch = db.batch();
  for (const o of ORDERS) {
    const l = listingByKey[o.listing];
    const created = new Date(Date.now() - o.daysAgo * DAY).toISOString();
    const subtotal = l.price;
    const fees = Math.round(subtotal * 0.05 * 100) / 100;
    batch.set(db.collection('orders').doc(o.id), {
      buyerId: o.buyerId,
      sellerIds: [l.sellerId],
      items: [{ listingId: listingDocId(l.id), title: l.title, qty: 1, unitPrice: l.price, sellerId: l.sellerId }],
      subtotal,
      fees,
      tax: 0,
      total: subtotal + fees,
      currency: 'USD',
      status: o.status,
      paymentIntentId: `seed_pi_${o.id}`,
      createdAt: created,
      updatedAt: created,
      shippingAddress: SHIPPING_ADDRESSES[o.buyerId],
    });
  }
  await batch.commit();
}

async function seedFavorites() {
  const batch = db.batch();
  for (const [uid, keys] of Object.entries(FAVORITES)) {
    batch.set(db.collection('favorites').doc(uid), { listingIds: keys.map(listingDocId), updatedAt: Timestamp.now() }, { merge: true });
  }
  await batch.commit();
}

// Messages live in chats/{id}/messages (matches adminChats.ts).
async function seedChats() {
  for (const c of CHATS) {
    const listing = listingByKey[c.listing];
    const chatRef = db.collection('chats').doc(c.id);
    const last = c.messages[c.messages.length - 1];
    const base = Date.now() - c.messages.length * 600_000;
    const at = (i) => Timestamp.fromMillis(base + i * 600_000);
    const participantProfiles = Object.fromEntries(c.participants.map((uid) => {
      const u = userByUid[uid];
      return [uid, { displayName: u.displayName, username: u.username, photoURL: '/default-avatar.png' }];
    }));
    const recipient = c.participants.find((uid) => uid !== last.from);
    await chatRef.set({
      participants: c.participants,
      participantProfiles,
      lastMessage: { senderId: last.from, text: last.text, timestamp: at(c.messages.length) },
      unreadCount: { [last.from]: 0, [recipient]: 1 },
      listingId: listingDocId(listing.id),
      listingTitle: listing.title,
      createdAt: at(0),
      updatedAt: at(c.messages.length),
    }, { merge: true });

    const batch = db.batch();
    c.messages.forEach((m, i) => {
      batch.set(chatRef.collection('messages').doc(`${c.id}-msg-${i + 1}`), {
        chatId: c.id,
        senderId: m.from,
        text: m.text,
        timestamp: at(i + 1),
        readBy: [m.from],
        listingId: listingDocId(listing.id),
      });
    });
    await batch.commit();
  }
}

for (const u of USERS) await upsertUser(u);
await seedListings();
await seedOrders();
await seedFavorites();
await seedChats();

console.log(`Seeded ${USERS.length} users, ${LISTINGS.length} listings (${ORDERS.length} sold), ${ORDERS.length} orders, ${CHATS.length} chats and favorites. Password for all: ${PASSWORD}`);
console.log(`Sign in as: ${USERS.map((u) => u.email).join(', ')}`);
