"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellerNudge = exports.buyerNudge = exports.cartReminder = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
async function sendPushNotifications(messages) {
    const valid = messages.filter(m => m.to.startsWith('ExponentPushToken['));
    if (valid.length === 0)
        return;
    for (let i = 0; i < valid.length; i += 100) {
        const chunk = valid.slice(i, i + 100);
        await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(chunk.map(m => { var _a; return (Object.assign(Object.assign({}, m), { sound: (_a = m.sound) !== null && _a !== void 0 ? _a : 'default' })); })),
        });
    }
}
// ─── Cart abandonment reminder ────────────────────────────────────────────────
// Daily at noon UTC.
// Catches carts with items added 1–24 hours ago — each cart gets one reminder
// per session since the daily window prevents re-notifying the same stale cart.
exports.cartReminder = (0, scheduler_1.onSchedule)('0 12 * * *', async () => {
    var _a, _b;
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
    if (cartsWithItems.length === 0)
        return;
    const profileRefs = cartsWithItems.map(d => db.collection('profiles').doc(d.id));
    const profileDocs = await db.getAll(...profileRefs);
    const messages = [];
    for (let i = 0; i < cartsWithItems.length; i++) {
        const profileDoc = profileDocs[i];
        if (!(profileDoc === null || profileDoc === void 0 ? void 0 : profileDoc.exists))
            continue;
        const token = (_a = profileDoc.data()) === null || _a === void 0 ? void 0 : _a.expoPushToken;
        if (!(token === null || token === void 0 ? void 0 : token.startsWith('ExponentPushToken[')))
            continue;
        const items = (_b = cartsWithItems[i].data().items) !== null && _b !== void 0 ? _b : [];
        const count = items.length;
        messages.push({
            to: token,
            title: 'Still thinking it over?',
            body: count === 1
                ? 'You left something in your cart. It might not last long.'
                : `You have ${count} items sitting in your cart.`,
            data: { type: 'cart_reminder' },
        });
    }
    if (messages.length > 0)
        await sendPushNotifications(messages);
    console.log(`cartReminder: sent ${messages.length} notifications`);
});
// ─── Buyer nudge ──────────────────────────────────────────────────────────────
// Every Monday at 2pm UTC. Personalized to interest categories.
// Max 1 per user per week by virtue of the cron schedule.
exports.buyerNudge = (0, scheduler_1.onSchedule)('0 14 * * 1', async () => {
    var _a;
    const snap = await db.collection('profiles')
        .where('expoPushToken', '!=', null)
        .limit(1000)
        .get();
    const messages = [];
    for (const doc of snap.docs) {
        const data = doc.data();
        const token = data.expoPushToken;
        if (!(token === null || token === void 0 ? void 0 : token.startsWith('ExponentPushToken[')))
            continue;
        const categories = (_a = data.interestCategories) !== null && _a !== void 0 ? _a : [];
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
    if (messages.length > 0)
        await sendPushNotifications(messages);
    console.log(`buyerNudge: sent ${messages.length} notifications`);
});
// ─── Seller nudge ─────────────────────────────────────────────────────────────
// Every Thursday at 2pm UTC. Encourages users to list — everyone is a potential
// seller. Copy rotates so it doesn't feel like the same message every week.
exports.sellerNudge = (0, scheduler_1.onSchedule)('0 14 * * 4', async () => {
    var _a;
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
    const messages = [];
    for (const doc of snap.docs) {
        const token = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.expoPushToken;
        if (!(token === null || token === void 0 ? void 0 : token.startsWith('ExponentPushToken[')))
            continue;
        const copy = COPY[Math.floor(Math.random() * COPY.length)];
        messages.push(Object.assign(Object.assign({ to: token }, copy), { data: { type: 'seller_nudge' } }));
    }
    if (messages.length > 0)
        await sendPushNotifications(messages);
    console.log(`sellerNudge: sent ${messages.length} notifications`);
});
//# sourceMappingURL=index.js.map