import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { PriceSuggestRequest } from "@marketplace/types";
import { success } from "@/lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async (req: NextRequest) => {
  const input = PriceSuggestRequest.parse(await req.json());
  // Deterministic demo logic: base price by length, plus photo count factor
  const base = Math.min(999, Math.round(5 + input.title.length * 2 + input.description.length * 0.3));
  const photoFactor = (input.photos?.length ?? 0) * 3;
  const price = Math.max(5, base + photoFactor);
  const rationale = `Demo model: title/desc length and photos influenced price. (title=${input.title.length}, desc=${input.description.length}, photos=${input.photos?.length ?? 0})`;
  return success({ price, rationale }, { status: 200 });
});
