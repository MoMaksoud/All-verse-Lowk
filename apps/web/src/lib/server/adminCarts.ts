import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type {
  AddToCartInput,
  FirestoreCart,
  UpdateCartItemInput,
} from '@/lib/types/firestore';
import { COLLECTIONS } from '@/lib/types/firestore';

export type CartDoc = FirestoreCart & { id: string };

async function ensureCart(uid: string): Promise<void> {
  const ref = getAdminFirestore().collection(COLLECTIONS.CARTS).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      items: [],
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function getCartAdmin(uid: string): Promise<CartDoc | null> {
  const ref = getAdminFirestore().collection(COLLECTIONS.CARTS).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as FirestoreCart) };
}

/**
 * Adds an item to the cart. Returns `true` if the item was newly added, or
 * `false` if it was already in the cart (each listing is a unique 1-unit item,
 * so re-adding is a no-op).
 */
export async function addToCartAdmin(uid: string, item: AddToCartInput): Promise<boolean> {
  let cart = await getCartAdmin(uid);
  if (!cart) {
    await ensureCart(uid);
    cart = await getCartAdmin(uid);
  }
  if (!cart) {
    throw new Error('Cart not found');
  }

  // Each listing is a unique 1-unit item — adding the same listing twice is a no-op.
  if (cart.items.some((c) => c.listingId === item.listingId)) return false;
  const updatedItems = [...cart.items, { ...item, qty: 1 }];

  await getAdminFirestore().collection(COLLECTIONS.CARTS).doc(uid).update({
    items: updatedItems,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

export async function updateCartItemAdmin(uid: string, update: UpdateCartItemInput): Promise<void> {
  const cart = await getCartAdmin(uid);
  if (!cart) throw new Error('Cart not found');

  const updatedItems = cart.items
    .map((cartItem) =>
      cartItem.listingId === update.listingId ? { ...cartItem, qty: update.qty } : cartItem
    )
    .filter((cartItem) => cartItem.qty > 0);

  await getAdminFirestore().collection(COLLECTIONS.CARTS).doc(uid).update({
    items: updatedItems,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function removeFromCartAdmin(uid: string, listingId: string): Promise<void> {
  const cart = await getCartAdmin(uid);
  if (!cart) throw new Error('Cart not found');

  const updatedItems = cart.items.filter((item) => item.listingId !== listingId);

  await getAdminFirestore().collection(COLLECTIONS.CARTS).doc(uid).update({
    items: updatedItems,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function clearCartAdmin(uid: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.CARTS).doc(uid).update({
    items: [],
    updatedAt: FieldValue.serverTimestamp(),
  });
}
