import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { success } from "@/lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  const url = new URL(req.url);
  const uid = req.headers.get("x-user-id") ?? "u2";
  const listingId = url.searchParams.get("listingId");
  
  if (listingId) {
    // Get conversations for this listing and user
    // Mock conversations data - replace with actual database call
    const conversations = { items: [], total: 0, hasMore: false }; // await dbChat.getConversations(uid, 1, 50);
    const listingConversations = conversations.items.filter(conv => conv.listingId === listingId);
    return success({ items: listingConversations, total: listingConversations.length, page: 1, limit: 50, hasMore: false });
  }
  
  // Get all conversations for the user
  // Mock conversations data - replace with actual database call
  const conversations = { items: [], total: 0, hasMore: false }; // await dbChat.getConversations(uid, 1, 50);
  return success({ items: conversations.items, total: conversations.total, page: 1, limit: 50, hasMore: conversations.hasMore });
});
