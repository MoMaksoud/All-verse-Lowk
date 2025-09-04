import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { dbUsers } from "@/lib/mockDb";
import { notFound } from "@/lib/errors";
import { success } from "@/lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const id = params.id;
  const row = dbUsers.get(id);
  if (!row) throw notFound("User not found");
  return success(row);
});

export const PATCH = withApi(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const id = params.id;
  const patch = await req.json();
  const updated = dbUsers.update(id, patch);
  return success(updated);
});
