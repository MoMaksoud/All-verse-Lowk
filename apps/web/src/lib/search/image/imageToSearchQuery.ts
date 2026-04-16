import { GEMINI_MODELS } from "@/lib/ai/models";

export type ImageExtractResult = {
    query: string;
    brand: string | null;
    model: string | null;
    category: "electronics" | "fashion" | "home" | "sports" | "other" | null;
};

export async function imageToSearchQuery(args: {
    image: Blob;
    traceId: string;
}): Promise<ImageExtractResult> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        throw new Error("Missing GEMINI_API_KEY. Image search is not configured.");
    }

    const arrayBuffer = await args.image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = (args.image as any).type || "image/jpeg";

    const prompt = `Look at this product image. Identify what the product is and extract structured data for shopping search.
Reply with ONLY a JSON object (no markdown), exactly:
{"query":"short query 2-6 words","brand":null|"Brand","model":null|"Model","category":null|"electronics"|"fashion"|"home"|"sports"|"other"}
Use null if not visible.`;

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

    const raw = (result.response.text() || "").trim();
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();

    // Safe parsing + fallback
    try {
        const parsed = JSON.parse(cleaned);
        const query = typeof parsed?.query === "string" ? parsed.query.trim() : "product";
        const brand = typeof parsed?.brand === "string" ? parsed.brand.trim() : null;
        const modelStr = typeof parsed?.model === "string" ? parsed.model.trim() : null;
        const category =
            typeof parsed?.category === "string"
                ? (parsed.category.trim().toLowerCase() as ImageExtractResult["category"])
                : null;

        return {
            query: query || "product",
            brand: brand || null,
            model: modelStr || null,
            category:
                category === "electronics" ||
                    category === "fashion" ||
                    category === "home" ||
                    category === "sports" ||
                    category === "other"
                    ? category
                    : null,
        };
    } catch {
        // If Gemini returns non-JSON, treat it as a query string
        const fallback = cleaned.replace(/^["']|["']$/g, "").trim();
        return { query: fallback || "product", brand: null, model: null, category: null };
    }
}