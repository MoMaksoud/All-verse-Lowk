import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
}

async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  const valid = messages.filter(m => m.to.startsWith('ExponentPushToken['));
  if (valid.length === 0) return;
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk.map(m => ({ ...m, sound: m.sound ?? 'default' }))),
    });
  }
}

// ─── Cart abandonment reminder ────────────────────────────────────────────────
// Daily at noon UTC.
// Catches carts with items added 1–24 hours ago — each cart gets one reminder
// per session since the daily window prevents re-notifying the same stale cart.
export const cartReminder = onSchedule('0 12 * * *', async () => {
  const now = Date.now();
  const oneHourAgo = admin.firestore.Timestamp.fromDate(new Date(now - 60 * 60 * 1000));
  const oneDayAgo = admin.firestore.Timestamp.fromDate(new Date(now - 24 * 60 * 60 * 1000));

  const cartsSnap = await db.collection('carts')
    .where('updatedAt', '<=', oneHourAgo)
    .where('updatedAt', '>=', oneDayAgo)
    .limit(500)
    .get();

  const cartsWithItems = cartsSnap.docs.filter(d => {
    const items = d.data().items;
    return Array.isArray(items) && items.length > 0;
  });

  if (cartsWithItems.length === 0) return;

  // Collect all unique listing IDs across all carts, then batch-fetch titles
  const allListingIds = Array.from(new Set(
    cartsWithItems.flatMap(d => (d.data().items as any[]).map((item: any) => item.listingId as string).filter(Boolean))
  ));

  const listingTitleMap = new Map<string, string>();
  if (allListingIds.length > 0) {
    const listingRefs = allListingIds.map(id => db.collection('listings').doc(id));
    const listingDocs = await db.getAll(...listingRefs);
    for (const doc of listingDocs) {
      if (doc.exists) {
        listingTitleMap.set(doc.id, (doc.data() as any)?.title ?? '');
      }
    }
  }

  const profileRefs = cartsWithItems.map(d => db.collection('profiles').doc(d.id));
  const profileDocs = await db.getAll(...profileRefs);

  const messages: PushMessage[] = [];
  for (let i = 0; i < cartsWithItems.length; i++) {
    const profileDoc = profileDocs[i];
    if (!profileDoc?.exists) continue;
    const token = (profileDoc.data() as any)?.expoPushToken as string | undefined;
    if (!token?.startsWith('ExponentPushToken[')) continue;

    const items: any[] = cartsWithItems[i].data().items ?? [];
    const count = items.length;
    const firstTitle = listingTitleMap.get(items[0]?.listingId) ?? '';

    let body: string;
    if (count === 1) {
      body = firstTitle
        ? `You left "${firstTitle}" in your cart. It might not last long.`
        : 'You left something in your cart. It might not last long.';
    } else {
      const others = count - 1;
      body = firstTitle
        ? `You left "${firstTitle}" and ${others} other ${others === 1 ? 'item' : 'items'} in your cart.`
        : `You have ${count} items sitting in your cart.`;
    }

    messages.push({
      to: token,
      title: 'Still thinking it over?',
      body,
      data: { type: 'cart_reminder' },
    });
  }

  if (messages.length > 0) await sendPushNotifications(messages);
  console.log(`cartReminder: sent ${messages.length} notifications`);
});

// ─── Buyer nudge ──────────────────────────────────────────────────────────────
// Every Monday at 2pm UTC. Personalized to interest categories.
// Max 1 per user per week by virtue of the cron schedule.
export const buyerNudge = onSchedule('0 14 * * 1', async () => {
  const snap = await db.collection('profiles')
    .where('expoPushToken', '!=', null)
    .limit(1000)
    .get();

  const messages: PushMessage[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as any;
    const token: string | undefined = data.expoPushToken;
    if (!token?.startsWith('ExponentPushToken[')) continue;

    const categories: string[] = data.interestCategories ?? [];
    const category = categories.length > 0
      ? categories[Math.floor(Math.random() * categories.length)]
      : null;

    messages.push({
      to: token,
      title: 'New drops for you',
      body: category
        ? `Fresh ${category} listings just hit AllVerse. Don't let the good ones slip.`
        : "New listings just dropped on AllVerse. Check out what's new.",
      data: { type: 'buyer_nudge' },
    });
  }

  if (messages.length > 0) await sendPushNotifications(messages);
  console.log(`buyerNudge: sent ${messages.length} notifications`);
});

// ─── Seller nudge ─────────────────────────────────────────────────────────────
// Every Thursday at 2pm UTC. Encourages users to list — everyone is a potential
// seller. Copy rotates so it doesn't feel like the same message every week.
export const sellerNudge = onSchedule('0 14 * * 4', async () => {
  const snap = await db.collection('profiles')
    .where('expoPushToken', '!=', null)
    .limit(1000)
    .get();

  const COPY = [
    {
      title: 'Clean out, cash in',
      body: 'Got stuff sitting around? List it in under 2 minutes and let AllVerse find it a new home.',
    },
    {
      title: 'Your closet called',
      body: 'Turn unused items into money. Snap a photo and our AI handles the rest.',
    },
    {
      title: 'Weekend hustle',
      body: 'List something today and it could sell by the weekend. It only takes a photo.',
    },
  ];

  const messages: PushMessage[] = [];
  for (const doc of snap.docs) {
    const token: string | undefined = (doc.data() as any)?.expoPushToken;
    if (!token?.startsWith('ExponentPushToken[')) continue;
    const copy = COPY[Math.floor(Math.random() * COPY.length)];
    messages.push({ to: token, ...copy, data: { type: 'seller_nudge' } });
  }

  if (messages.length > 0) await sendPushNotifications(messages);
  console.log(`sellerNudge: sent ${messages.length} notifications`);
});
