/**
 * One-time script to backfill `searchKeywords` on all existing listings.
 *
 * Usage:
 *   npx tsx scripts/backfill-search-keywords.ts
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY env var
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inline the same token generation logic to avoid import path issues
function generateSearchKeywords(fields: {
  title: string;
  description: string;
  brand?: string;
  model?: string;
  category?: string;
}): string[] {
  const parts = [fields.title, fields.description, fields.brand, fields.model, fields.category]
    .filter(Boolean)
    .join(' ');

  const tokens = parts
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2);

  const titleWords = (fields.title || '').toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  for (let i = 0; i < titleWords.length - 1; i++) {
    tokens.push(titleWords[i].replace(/[^a-z0-9]/g, '') + titleWords[i + 1].replace(/[^a-z0-9]/g, ''));
  }

  return [...new Set(tokens)].slice(0, 80);
}

async function main() {
  // Initialize Admin SDK
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      initializeApp(); // Uses default credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS)
    }
  }

  const db = getFirestore();
  const listingsRef = db.collection('listings');
  const snapshot = await listingsRef.get();

  console.log(`Found ${snapshot.size} listings to backfill.`);

  const BATCH_SIZE = 500;
  let batch = db.batch();
  let count = 0;
  let updated = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if already has searchKeywords
    if (data.searchKeywords && Array.isArray(data.searchKeywords) && data.searchKeywords.length > 0) {
      continue;
    }

    const keywords = generateSearchKeywords({
      title: data.title || '',
      description: data.description || '',
      brand: data.brand,
      model: data.model,
      category: data.category,
    });

    batch.update(doc.ref, { searchKeywords: keywords });
    count++;
    updated++;

    if (count >= BATCH_SIZE) {
      await batch.commit();
      console.log(`Committed batch of ${count} updates (${updated} total).`);
      batch = db.batch();
      count = 0;
    }
  }

  // Commit remaining
  if (count > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${count} updates (${updated} total).`);
  }

  console.log(`Done. Updated ${updated} of ${snapshot.size} listings.`);
}

main().catch(console.error);
