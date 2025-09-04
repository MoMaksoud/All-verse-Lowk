import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { dbProfiles } from "@/lib/mockDb";
import { notFound } from "@/lib/errors";
import { success } from "@/lib/response";
import { ProfileSchema } from "@marketplace/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (_req: NextRequest, { params }: { params: { userId: string } }) => {
  const userId = params.userId;
  const row = dbProfiles.get(userId);
  if (!row) throw notFound("Profile not found");
  return success(row);
});

export const PUT = withApi(async (req: NextRequest, { params }: { params: { userId: string } }) => {
  const userId = params.userId;
  const patch = ProfileSchema.partial().parse(await req.json());
  const updated = dbProfiles.upsert(userId, patch);
  return success(updated);
});
