import { withApi } from "@/lib/withApi";
import { success } from "@/lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApi(async (req: Request) => {
  const payload = await req.text(); // raw text okay for demo
  console.log("[stripe webhook]", payload);
  return success({ received: true });
});
