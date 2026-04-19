import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { generateSearchKeywords } from '@/lib/searchTokens';
import type {
  CreateListingInput,
  FirestoreListing,
  SearchFilters,
  SortOptions,
  UpdateListingInput,
  PaginatedResult,
} from '@/lib/types/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

export async function getListingAdmin(id: string): Promise<(FirestoreListing & { id: string }) | null> {
  const snap = await getAdminFirestore().collection(COLLECTIONS.LISTINGS).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as FirestoreListing) };
}

export async function createListingAdmin(listingData: CreateListingInput): Promise<string> {
  const searchKeywords = generateSearchKeywords({
    title: listingData.title,
    description: listingData.description,
    brand: listingData.brand,
    model: listingData.model,
    category: listingData.category,
  });

  const ref = getAdminFirestore().collection(COLLECTIONS.LISTINGS).doc();
  await ref.set({
    ...listingData,
    searchKeywords,
    currency: listingData.currency || 'USD',
    isActive: listingData.isActive !== false,
    soldCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateListingAdmin(id: string, updates: UpdateListingInput): Promise<void> {
  const payload: Record<string, unknown> = { ...updates, updatedAt: FieldValue.serverTimestamp() };

  if (
    updates.title ||
    updates.description ||
    updates.brand ||
    updates.model ||
    updates.category
  ) {
    const current = await getListingAdmin(id);
    if (current) {
      payload.searchKeywords = generateSearchKeywords({
        title: updates.title || current.title,
        description: updates.description || current.description,
        brand: (updates.brand ?? current.brand) as string | undefined,
        model: (updates.model ?? current.model) as string | undefined,
        category: updates.category || current.category,
      });
    }
  }

  await getAdminFirestore().collection(COLLECTIONS.LISTINGS).doc(id).update(payload);
}

export async function markAsSoldAdmin(id: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.LISTINGS).doc(id).update({
    sold: true,
    soldAt: FieldValue.serverTimestamp(),
    inventory: 0,
    soldThroughAllVerse: false,
    isActive: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updateInventoryAdmin(id: string, quantitySold: number): Promise<void> {
  const listing = await getListingAdmin(id);
  if (!listing) throw new Error('Listing not found');

  const newInventory = Math.max(0, listing.inventory - quantitySold);
  const newSoldCount = listing.soldCount + quantitySold;

  const updates: Record<string, unknown> = {
    inventory: newInventory,
    soldCount: newSoldCount,
    isActive: newInventory > 0,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (newInventory === 0) {
    updates.sold = true;
    updates.soldAt = FieldValue.serverTimestamp();
    updates.soldThroughAllVerse = true;
    updates.isActive = true;
  }

  await getAdminFirestore().collection(COLLECTIONS.LISTINGS).doc(id).update(updates);
}

export async function searchListingsAdmin(
  filters: SearchFilters,
  sortOptions?: SortOptions,
  maxResults?: number
): Promise<PaginatedResult<FirestoreListing & { id: string }>> {
  let q: FirebaseFirestore.Query = getAdminFirestore().collection(COLLECTIONS.LISTINGS);

  if (filters.isActive !== undefined) {
    q = q.where('isActive', '==', filters.isActive);
  }
  if (filters.category) {
    q = q.where('category', '==', filters.category);
  }
  if (filters.condition) {
    q = q.where('condition', '==', filters.condition);
  }
  if (filters.sellerId) {
    q = q.where('sellerId', '==', filters.sellerId);
  }
  if (filters.minPrice !== undefined) {
    q = q.where('price', '>=', filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    q = q.where('price', '<=', filters.maxPrice);
  }
  if (filters.keyword) {
    const token = filters.keyword.toLowerCase().trim().split(/\s+/)[0];
    if (token && token.length >= 2) {
      q = q.where('searchKeywords', 'array-contains', token);
    }
  }

  const sortField = sortOptions?.field || 'createdAt';
  const sortDirection = sortOptions?.direction || 'desc';
  q = q.orderBy(sortField, sortDirection);

  if (maxResults) {
    q = q.limit(maxResults);
  }

  const snap = await q.get();
  const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FirestoreListing) }));

  return {
    items,
    total: items.length,
    page: 1,
    limit: items.length,
    hasMore: false,
  };
}
