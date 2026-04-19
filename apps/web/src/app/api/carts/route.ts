import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import {
  addToCartAdmin,
  clearCartAdmin,
  getCartAdmin,
  removeFromCartAdmin,
  updateCartItemAdmin,
} from "@/lib/server/adminCarts";
import { success, error } from "@/lib/response";
import { badRequest, unauthorized } from "@marketplace/shared-logic";
import { AddToCartInput } from "@/lib/types/firestore";

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
    const body = await req.json() as AddToCartInput;
    
    // Validate required fields
    if (!body.listingId || !body.sellerId || !body.qty || !body.priceAtAdd) {
      return error(badRequest("Missing required fields: listingId, sellerId, qty, priceAtAdd"));
    }

    await addToCartAdmin(req.userId, body);
    const updatedCart = await getCartAdmin(req.userId);
    
    return success(updatedCart, { status: 201 });
  } catch (err) {
    console.error('Error adding to cart:', err);
    return error(badRequest("Failed to add item to cart"));
  }
});

export const PUT = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const body = await req.json() as { listingId: string; qty: number };
    
    if (!body.listingId || body.qty === undefined) {
      return error(badRequest("Missing required fields: listingId, qty"));
    }

    await updateCartItemAdmin(req.userId, body);
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
