import { requireWeb, sandboxEnvironment } from './sandbox-env.mjs';
const env = sandboxEnvironment();
Object.assign(process.env, env);
for (const name of ['FIREBASE_SERVICE_ACCOUNT_KEY', 'GOOGLE_APPLICATION_CREDENTIALS']) delete process.env[name];
const { initializeApp } = requireWeb('firebase-admin/app');
const { getAuth } = requireWeb('firebase-admin/auth');
const { getFirestore, FieldValue } = requireWeb('firebase-admin/firestore');
const app = initializeApp({ projectId: 'demo-allverse-sandbox' });
const auth = getAuth(app), db = getFirestore(app);
for (const role of ['buyer', 'seller']) {
  const uid = `sandbox-${role}`;
  const data = { email: `${role}@allverse.example`, password: 'AllVerseSandbox123!', emailVerified: true, displayName: `Sandbox ${role}` };
  try { await auth.getUser(uid); } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    await auth.createUser({ uid, ...data });
  }
  await db.collection('profiles').doc(uid).set({ userId: uid, username: uid, displayName: data.displayName,
    interestCategories: [], userActivity: 'both-buy-sell', itemConditionPreference: 'both',
    shippingAddress: { street: '1 Test Street', city: 'New York', state: 'NY', zip: '10001', country: 'US' },
    createdAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection('users').doc(uid).set({ displayName: data.displayName, email: data.email, role });
  await db.collection('usernames').doc(uid).set({ userId: uid });
}
await db.collection('listings').doc('sandbox-listing').set({ sellerId: 'sandbox-seller', title: 'Sandbox test item',
  description: 'Synthetic item for payment testing. No physical goods are sold.', price: 10, currency: 'USD',
  images: [], category: 'electronics', condition: 'good', inventory: 10, soldCount: 0, isActive: true,
  searchKeywords: ['sandbox', 'test', 'item'], shipping: { weight: 2, length: 12, width: 8, height: 6 },
  createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
console.log('Seeded demo emulators only. Login: buyer@allverse.example or seller@allverse.example; password: AllVerseSandbox123!');
await app.delete();
