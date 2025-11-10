import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from './firebase-admin';

const DEFAULT_DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_AI_DAILY_TOKENS || 5000);
const COLLECTION_NAME = 'ai_usage';

// Track if Firestore is available - start as true, will be set to false on first failure
let firestoreAvailable = true;

interface UsageRecord {
  userId: string;
  date: string; // YYYY-MM-DD format
  tokensUsed: number;
  requests: number;
  lastUpdated: any;
}

/**
 * Check if Firestore is available (doesn't throw, just returns boolean)
 */
function isFirestoreAvailable(): boolean {
  if (!firestoreAvailable) {
    return false;
  }
  try {
    getAdminFirestore();
    return true;
  } catch {
    firestoreAvailable = false;
    return false;
  }
}

/**
 * Get the document key for a user's daily usage
 */
function getUsageKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${userId}_${day}`;
}

/**
 * Get or create usage record for a user for today
 */
async function getUsageRecord(userId: string): Promise<UsageRecord> {
  // Skip if Firestore is not available
  if (!isFirestoreAvailable()) {
    return {
      userId,
      date: new Date().toISOString().slice(0, 10),
      tokensUsed: 0,
      requests: 0,
      lastUpdated: new Date(),
    };
  }

  try {
    const db = getAdminFirestore();
    const date = new Date().toISOString().slice(0, 10);
    const docId = getUsageKey(userId);
    const docRef = db.collection(COLLECTION_NAME).doc(docId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return docSnap.data() as UsageRecord;
    }

    // Create new record if it doesn't exist
    const newRecord: UsageRecord = {
      userId,
      date,
      tokensUsed: 0,
      requests: 0,
      lastUpdated: FieldValue.serverTimestamp() as any,
    };

    await docRef.set(newRecord);
    return newRecord;
  } catch (error: any) {
    // Mark Firestore as unavailable and return default
    firestoreAvailable = false;
    console.error('❌ Firestore unavailable, disabling token tracking:', error?.message || error);
    return {
      userId,
      date: new Date().toISOString().slice(0, 10),
      tokensUsed: 0,
      requests: 0,
      lastUpdated: new Date(),
    };
  }
}

/**
 * Assert that user has enough token budget for the request
 * Throws error if limit would be exceeded
 * Returns silently if Firestore is unavailable (allows request to proceed)
 */
export async function assertTokenBudget(userId: string, precharge: number, dailyLimit = DEFAULT_DAILY_LIMIT): Promise<void> {
  // Skip token tracking if Firestore is not available
  if (!isFirestoreAvailable()) {
    console.log('⚠️ Firestore unavailable, skipping token budget check');
    return;
  }

  try {
    const usage = await getUsageRecord(userId);
    
    if (usage.tokensUsed + precharge > dailyLimit) {
      throw new Error('TOKEN_LIMIT_EXCEEDED');
    }

    // Update usage with precharge
    const db = getAdminFirestore();
    const docId = getUsageKey(userId);
    const docRef = db.collection(COLLECTION_NAME).doc(docId);
    
    await docRef.update({
      tokensUsed: FieldValue.increment(precharge),
      requests: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    // If it's a limit exceeded error, re-throw it
    if (error?.message === 'TOKEN_LIMIT_EXCEEDED') {
      throw error;
    }
    // For Firestore errors, mark as unavailable and allow request to proceed
    firestoreAvailable = false;
    console.error('❌ Firestore error, disabling token tracking (allowing request to proceed):', error?.message || error);
    // Don't throw - allow the request to proceed even if tracking fails
  }
}

/**
 * Add actual token usage and reconcile with precharge
 */
export async function addUsage(userId: string, actualTotalTokens: number, precharged: number): Promise<void> {
  // Skip if Firestore is not available
  if (!isFirestoreAvailable()) {
    return;
  }

  try {
    const delta = Math.max(0, actualTotalTokens - precharged);
    
    // If actual usage is less than or equal to precharge, no adjustment needed
    if (delta === 0) return;

    // Update with the difference
    const db = getAdminFirestore();
    const docId = getUsageKey(userId);
    const docRef = db.collection(COLLECTION_NAME).doc(docId);
    
    await docRef.update({
      tokensUsed: FieldValue.increment(delta),
      lastUpdated: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Mark Firestore as unavailable and silently fail
    firestoreAvailable = false;
    console.error('Error updating usage (non-blocking):', error);
  }
}


