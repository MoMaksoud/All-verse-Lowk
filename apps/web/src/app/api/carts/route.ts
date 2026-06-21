import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApi } from "@/lib/withApi";
import {
  addToCartAdmin,
  clearCartAdmin,
  getCartAdmin,
  removeFromCartAdmin,
} from "@/lib/server/adminCarts";
import { success, error } from "@/lib/response";
import { badRequest } from "@marketplace/shared-logic";
import type { AddToCartInput } from "@/lib/types/firestore";

const addToCartSchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
  sellerId: z.string().min(1, 'sellerId is required'),
  priceAtAdd: z.number().positive('priceAtAdd must be positive'),
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

    // You can't buy your own listing.
    if (parsed.data.sellerId === req.userId) {
      return error(badRequest("You can't add your own listing to your cart"));
    }

    // qty is always 1 — each listing is a unique single-unit item.
    const input: AddToCartInput = { listingId: parsed.data.listingId as string, sellerId: parsed.data.sellerId as string, priceAtAdd: parsed.data.priceAtAdd as number, qty: 1 };
    const added = await addToCartAdmin(req.userId, input);
    const updatedCart = await getCartAdmin(req.userId);

    // `alreadyInCart` lets the client distinguish a real add from a no-op re-add.
    return success(
      { ...(updatedCart ?? { items: [] }), alreadyInCart: !added },
      { status: added ? 201 : 200 }
    );
  } catch (err) {
    console.error('Error adding to cart:', err);
    return error(badRequest("Failed to add item to cart"));
  }
});

// PUT is intentionally not supported — qty is always 1 per listing.
export const PUT = withApi(async (_req: NextRequest & { userId: string }) => {
  return NextResponse.json({ error: 'Quantity updates are not supported' }, { status: 405 });
});

export const DELETE = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get('listingId');

    if (listingId) {
      await removeFromCartAdmin(req.userId, listingId);
    } else {
      await clearCartAdmin(req.userId);
    }

    const updatedCart = await getCartAdmin(req.userId);
    return success(updatedCart);
  } catch (err) {
    console.error('Error clearing cart:', err);
    return error(badRequest("Failed to clear cart"));
  }
});
