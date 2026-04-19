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

export async function addToCartAdmin(uid: string, item: AddToCartInput): Promise<void> {
  let cart = await getCartAdmin(uid);
  if (!cart) {
    await ensureCart(uid);
    cart = await getCartAdmin(uid);
  }
  if (!cart) {
    throw new Error('Cart not found');
  }

  const existingItemIndex = cart.items.findIndex((c) => c.listingId === item.listingId);
  let updatedItems;
  if (existingItemIndex >= 0) {
    updatedItems = [...cart.items];
    updatedItems[existingItemIndex] = {
      ...updatedItems[existingItemIndex],
      qty: updatedItems[existingItemIndex].qty + item.qty,
    };
  } else {
    updatedItems = [...cart.items, item];
  }

  await getAdminFirestore().collection(COLLECTIONS.CARTS).doc(uid).update({
    items: updatedItems,
    updatedAt: FieldValue.serverTimestamp(),
  });
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
