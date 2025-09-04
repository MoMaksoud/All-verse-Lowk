import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { dbChat } from "@/lib/mockDb";
import { success } from "@/lib/response";
import { badRequest } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId");
  if (!roomId) throw badRequest("roomId is required");
  const cursor = url.searchParams.get("cursor"); // message id
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const all = dbChat.messages(roomId);
  let start = 0;
  if (cursor) {
    const idx = all.findIndex(m => m.id === cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const items = all.slice(start, start + limit);
  const nextCursor = items.length && all[start + limit] ? all[start + limit].id : null;
  return success({ items, nextCursor });
});

export const POST = withApi(async (req: NextRequest) => {
  const body = await req.json();
  const roomId: string | undefined = body.roomId;
  const uid = req.headers.get("x-user-id") ?? "u2";
  if (!roomId) throw badRequest("roomId is required");
  const msg = dbChat.addMessage(roomId, uid, { text: body.text, image: body.image });
  return success(msg, { status: 201 });
});
