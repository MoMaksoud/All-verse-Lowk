import { NextRequest } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/withApi";
import {
  addToCartAdmin,
  clearCartAdmin,
  getCartAdmin,
  removeFromCartAdmin,
  updateCartItemAdmin,
} from "@/lib/server/adminCarts";
import { success, error } from "@/lib/response";
import { badRequest } from "@marketplace/shared-logic";
import type { AddToCartInput, UpdateCartItemInput } from "@/lib/types/firestore";

const MAX_QTY_PER_ITEM = 10;

const addToCartSchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
  sellerId: z.string().min(1, 'sellerId is required'),
  qty: z.number().int().min(1).max(MAX_QTY_PER_ITEM, `qty cannot exceed ${MAX_QTY_PER_ITEM}`),
  priceAtAdd: z.number().positive('priceAtAdd must be positive'),
});

const updateCartSchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
  qty: z.number().int().min(1).max(MAX_QTY_PER_ITEM, `qty cannot exceed ${MAX_QTY_PER_ITEM}`),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const cart = await getCartAdmin(req.userId);
    return success(cart || { items: [], updatedAt: new Date() });
  } catch (err) {
    console.error('Error fetching cart:', err);
    return error(badRequest("Failed to fetch cart"));
  }
});

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const raw = await req.json();
    const parsed = addToCartSchema.safeParse(raw);
    if (!parsed.success) {
      return error(badRequest(parsed.error.errors[0]?.message ?? 'Invalid request'));
    }

    await addToCartAdmin(req.userId, parsed.data as AddToCartInput);
    const updatedCart = await getCartAdmin(req.userId);

    return success(updatedCart, { status: 201 });
  } catch (err) {
    console.error('Error adding to cart:', err);
    return error(badRequest("Failed to add item to cart"));
  }
});

export const PUT = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const raw = await req.json();
    const parsed = updateCartSchema.safeParse(raw);
    if (!parsed.success) {
      return error(badRequest(parsed.error.errors[0]?.message ?? 'Invalid request'));
    }

    await updateCartItemAdmin(req.userId, parsed.data as UpdateCartItemInput);
    const updatedCart = await getCartAdmin(req.userId);

    return success(updatedCart);
  } catch (err) {
    console.error('Error updating cart item:', err);
    return error(badRequest("Failed to update cart item"));
  }
});

export const DELETE = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get('listingId');
    
    if (listingId) {
      // Remove specific item
      await removeFromCartAdmin(req.userId, listingId);
    } else {
      // Clear entire cart
      await clearCartAdmin(req.userId);
    }
    
    const updatedCart = await getCartAdmin(req.userId);
    return success(updatedCart);
  } catch (err) {
    console.error('Error clearing cart:', err);
    return error(badRequest("Failed to clear cart"));
  }
});
