import { getAdminFirestore } from '@/lib/firebase-admin';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushNotification(message: PushMessage): Promise<void> {
  if (!message.to.startsWith('ExponentPushToken[')) return;
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...message, sound: message.sound ?? 'default' }),
  });
}

export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  const valid = messages.filter(m => m.to.startsWith('ExponentPushToken['));
  if (valid.length === 0) return;

  // Expo allows up to 100 per request — chunk if needed
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk.map(m => ({ ...m, sound: m.sound ?? 'default' }))),
    });
  }
}

/**
 * Find all users interested in a category (via their profile's interestCategories),
 * then send them a push notification. Excludes `excludeUserId` (the seller).
 * Capped at 500 recipients to avoid runaway fan-out.
 */
export async function notifyUsersInterestedInCategory(params: {
  category: string;
  excludeUserId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('profiles')
      .where('interestCategories', 'array-contains', params.category)
      .select('expoPushToken', 'userId')
      .limit(500)
      .get();

    const messages: PushMessage[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      const token = data.expoPushToken;
      // Skip sender and non-token profiles
      if (!token || !token.startsWith('ExponentPushToken[')) continue;
      if (doc.id === params.excludeUserId) continue;
      messages.push({ to: token, title: params.title, body: params.body, data: params.data });
    }

    await sendPushNotifications(messages);
  } catch {
    // Fire-and-forget — never throw
  }
}
