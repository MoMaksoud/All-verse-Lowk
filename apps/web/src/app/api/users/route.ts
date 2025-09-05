import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { dbUsers, dbUsersOperations } from "@/lib/mockDb";
import { success } from "@/lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const items = q ? dbUsers.filter(user => user.name.toLowerCase().includes(q.toLowerCase())) : dbUsers;
  return success({ items, total: items.length, page: 1, limit: 100, hasMore: false });
});

export const POST = withApi(async (req: NextRequest) => {
  const { name, email, avatar } = await req.json();
  const created = await dbUsersOperations.create({ name, email, avatar });
  return success(created, { status: 201 });
});
