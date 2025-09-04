import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { success } from "@/lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  return success({ message: "API is working!", timestamp: new Date().toISOString() });
});
