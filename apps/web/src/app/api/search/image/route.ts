import { NextRequest, NextResponse } from "next/server";
import { GEMINI_MODELS } from "@/lib/ai/models";

export const dynamic = "force-dynamic";

type ImageSearchExtractResponse = {
    traceId: string;
    extractedQuery: string;
    brand?: string;
    model?: string;
    category?: "electronics" | "fashion" | "home" | "sports" | "other";
};

function isTruthy(v: string | null | undefined) {
    return v === "1" || v === "true" || v === "yes";
}

function debugLog(
    enabled: boolean,
    traceId: string,
    phase: string,
    details?: Record<string, unknown>
) {
    if (!enabled) return;
    if (details) {
        console.info(`[search:image][${traceId}] ${phase}`, details);
        return;
    }
    console.info(`[search:image][${traceId}] ${phase}`);
}

function safeParseGeminiJson(text: string): {
    query: string;
    brand: string | null;
    model: string | null;
    category: "electronics" | "fashion" | "home" | "sports" | "other" | null;
} | null {
    try {
        const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const query =
            typeof parsed?.query === "string" && parsed.query.trim().length > 0
                ? parsed.query.trim()
                : "product";

        const brand =
            typeof parsed?.brand === "string" && parsed.brand.trim().length > 0
                ? parsed.brand.trim()
                : null;

        const model =
            typeof parsed?.model === "string" && parsed.model.trim().length > 0
                ? parsed.model.trim()
                : null;

        const rawCategory =
            typeof parsed?.category === "string" ? parsed.category.trim().toLowerCase() : null;

        const category =
            rawCategory === "electronics" ||
                rawCategory === "fashion" ||
                rawCategory === "home" ||
                rawCategory === "sports" ||
                rawCategory === "other"
                ? rawCategory
                : null;

        return { query, brand, model, category };
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const traceId =
        req.headers.get("x-search-trace-id")?.trim() || crypto.randomUUID();

    const debug =
        isTruthy(req.nextUrl.searchParams.get("debug")) ||
        isTruthy(req.nextUrl.searchParams.get("debugSearch")) ||
        isTruthy(req.headers.get("x-search-debug")) ||
        isTruthy(process.env.DEBUG_SEARCH);

    try {
        debugLog(debug, traceId, "request.received");

        const formData = await req.formData();
        const imageFile = formData.get("image");

        if (!imageFile || !(imageFile instanceof Blob) || imageFile.size === 0) {
            return NextResponse.json(
                {
                    error: 'Image file is required. Send multipart/form-data with field "image".',
                    traceId,
                },
                { status: 400, headers: { "x-search-trace-id": traceId } }
            );
        }

        debugLog(debug, traceId, "request.image_found", {
            size: imageFile.size,
            type: (imageFile as File).type || "unknown",
            name: imageFile instanceof File ? imageFile.name : "blob",
        });

        const geminiApiKey =
            process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!geminiApiKey) {
            return NextResponse.json(
                {
                    error: "Image search is not configured. Missing GEMINI_API_KEY.",
                    traceId,
                },
                { status: 503, headers: { "x-search-trace-id": traceId } }
            );
        }

        const arrayBuffer = await imageFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = (imageFile as File).type || "image/jpeg";

        const prompt = `Look at this product image. Identify what the product is and extract structured data for marketplace search.

Reply with ONLY a JSON object (no markdown, no code block), exactly this structure:
{"query":"short search query 2-6 words","brand":"BrandName or null","model":"model or product line or null","category":"electronics|fashion|home|sports|other or null"}

Rules:
- Use null when a field is not visible or uncertain.
- Keep "query" short and practical for search.
- Category must be one of: electronics, fashion, home, sports, other.
- Do not include any explanation outside the JSON object.`;

        debugLog(debug, traceId, "gemini.request.start", {
            mimeType,
            promptLength: prompt.length,
        });

        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODELS.FAST });

        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        { inlineData: { mimeType, data: base64 } },
                        { text: prompt },
                    ],
                },
            ],
        });

        const rawText = (result.response.text() || "").trim().replace(/^["']|["']$/g, "");

        debugLog(debug, traceId, "gemini.response.raw", {
            preview: rawText.slice(0, 300),
        });

        const parsed = safeParseGeminiJson(rawText);

        let response: ImageSearchExtractResponse;

        if (parsed) {
            response = {
                traceId,
                extractedQuery: parsed.query || "product",
                ...(parsed.brand ? { brand: parsed.brand } : {}),
                ...(parsed.model ? { model: parsed.model } : {}),
                ...(parsed.category ? { category: parsed.category } : {}),
            };

            debugLog(debug, traceId, "gemini.response.parsed", response);
        } else {
            const fallbackQuery = rawText.trim() || "product";

            response = {
                traceId,
                extractedQuery: fallbackQuery,
            };

            debugLog(debug, traceId, "gemini.response.fallback_text", {
                extractedQuery: fallbackQuery,
            });
        }

        return NextResponse.json(response, {
            headers: { "x-search-trace-id": traceId },
        });
    } catch (e: any) {
        console.error(`[search:image][${traceId}] error`, e);

        return NextResponse.json(
            {
                error: e?.message ?? "Failed to analyze image.",
                traceId,
            },
            {
                status: 500,
                headers: { "x-search-trace-id": traceId },
            }
        );
    }
}