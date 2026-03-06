import { InternalResult } from "../types";
import { getAdminDb } from "./firestoreAdmin";

function tokenize(q: string) {
    return q
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
}

function scoreText(tokens: string[], text: string) {
    // simple count of token hits
    const t = text.toLowerCase();
    let score = 0;
    for (const tok of tokens) if (t.includes(tok)) score += 1;
    return score;
}

export async function simpleInternalSearch(args: {
    query: string;
    limit: number;
    debug?: boolean;
}): Promise<{ results: InternalResult[]; fetched: number; sample?: any }> {
    const db = getAdminDb();

    const snap = await db
        .collection("listings")
        .where("isActive", "==", true)
        .limit(200)
        .get();

    if (snap.empty) return { results: [], fetched: 0 };

    const sampleDoc = snap.docs[0];
    const sampleData = sampleDoc?.data();

    const tokens = tokenize(args.query);

    const all: InternalResult[] = snap.docs.map((doc) => {
        const d: any = doc.data();
        return {
            id: doc.id,
            title: d.title ?? "",
            price: Number(d.price) || 0,
            description: d.description ?? "",
            photos: d.images ?? [],
            category: d.category ?? "",
            condition: d.condition ?? "",
            sellerId: d.sellerId ?? "",
            brand: d.brand ?? undefined,
            model: d.model ?? undefined,
        };
    });

    // filter by token hits in title/description/category/brand/model
    const filtered = all
        .map((r) => {
            const text = `${r.title} ${r.description} ${r.category} ${r.brand ?? ""} ${r.model ?? ""}`;
            const score = scoreText(tokens, text);
            return { r, score };
        })
        .filter((x) => x.score > 0 || tokens.length === 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, args.limit)
        .map((x) => x.r);

    return {
        results: filtered,
        fetched: snap.size,
        sample: args.debug ? { id: sampleDoc.id, keys: Object.keys(sampleData ?? {}) } : undefined,
    };
}