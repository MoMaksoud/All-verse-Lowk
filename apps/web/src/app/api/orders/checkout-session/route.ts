import { withApi } from "@/lib/withApi";
import { success } from "@/lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async () => {
  return success({ checkoutUrl: "https://example.com/checkout/session/demo" }, { status: 200 });
});
