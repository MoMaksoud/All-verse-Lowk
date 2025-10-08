import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { notFound } from "@/lib/errors";
import { success } from "@/lib/response";
import { ProfileSchema } from "@marketplace/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (_req: NextRequest, { params }: { params: { userId: string } }) => {
  const userId = params.userId;
  // Mock profile data - replace with actual database call
  const row = null; // await dbProfilesOperations.findByUserId(userId);
  if (!row) throw notFound("Profile not found");
  return success(row);
});

export const PUT = withApi(async (req: NextRequest, { params }: { params: { userId: string } }) => {
  const userId = params.userId;
  const patch = ProfileSchema.partial().parse(await req.json());
  // Mock profile update - replace with actual database call
  const updated = null; // await dbProfilesOperations.update(userId, patch);
  if (!updated) throw notFound("Profile not found");
  return success(updated);
});
