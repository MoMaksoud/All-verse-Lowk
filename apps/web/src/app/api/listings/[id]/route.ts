import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { dbListings } from "@/lib/mockDb";
import { notFound } from "@/lib/errors";
import { success } from "@/lib/response";
import { UpdateListingInput } from "@marketplace/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const id = params.id;
  const row = dbListings.get(id);
  if (!row) throw notFound("Listing not found");
  return success(row);
});

export const PATCH = withApi(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const id = params.id;
  const patch = UpdateListingInput.parse(await req.json());
  const updated = dbListings.update(id, patch);
  return success(updated);
});

export const DELETE = withApi(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const id = params.id;
  const ok = dbListings.remove(id);
  if (!ok) throw notFound("Listing not found");
  return success({ ok: true });
});
