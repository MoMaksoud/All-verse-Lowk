import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { dbChat } from "@/lib/mockDb";
import { success } from "@/lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  const url = new URL(req.url);
  const uid = req.headers.get("x-user-id") ?? "u2";
  const listingId = url.searchParams.get("listingId");
  if (listingId) {
    // return or create a buyer room for this listing for current user
    const room = dbChat.createRoom(listingId, uid);
    return success({ items: [room], total: 1, page: 1, limit: 50, hasMore: false });
  }
  const items = dbChat.roomsForUser(uid);
  return success({ items, total: items.length, page: 1, limit: 50, hasMore: false });
});
