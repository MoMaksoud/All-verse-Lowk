import { NextRequest, NextResponse } from "next/server";
import { parseSearchRequest } from "@/lib/search/pipeline/parseSearchRequest";
import { runPipeline } from "@/lib/search/pipeline/runPipeline";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const parsed = parseSearchRequest(req);

    if (parsed.ok === false) {
        return NextResponse.json(
            { error: parsed.error, traceId: parsed.traceId },
            { status: 400, headers: { "x-search-trace-id": parsed.traceId } }
        );
    }

    try {
        const result = await runPipeline(parsed.value);
        return NextResponse.json(result, {
            headers: { "x-search-trace-id": parsed.value.traceId },
        });
    } catch (e: any) {
        console.error(`[search][${parsed.value.traceId}] error`, e);
        return NextResponse.json(
            { error: e?.message ?? "Internal server error", traceId: parsed.value.traceId },
            { status: 500, headers: { "x-search-trace-id": parsed.value.traceId } }
        );
    }
}
