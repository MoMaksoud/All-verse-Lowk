import { createPartFromUri, createUserContent, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { GEMINI_MODELS } from "@/lib/ai/models";
import {
  formatMarketPricingForPrompt,
  getMarketPricing,
  type MarketPricingResult,
} from "@/lib/marketPricing";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not configured for AI Analysis");
}

const genAi = apiKey ? new GoogleGenAI({ apiKey }) : null;

const CATEGORY_VALUES = [
  "electronics",
  "fashion",
  "home",
  "sports",
  "automotive",
  "toys",
  "beauty",
  "appliances",
  "books",
  "tools",
  "other",
] as const;

const CONDITION_VALUES = ["new", "like-new", "good", "fair", "poor"] as const;

export type ListingCategory = (typeof CATEGORY_VALUES)[number];
export type ListingCondition = (typeof CONDITION_VALUES)[number];

export type ListingQuestion = {
  field: string;
  question: string;
  placeholder?: string;
  type: "text" | "select" | "number";
  options?: string[];
};

export type ProductEvidence = {
  brand: string | null;
  product_type: string | null;
  model_exact: string | null;
  model_range: string | null;
  variant_or_colorway: string | null;
  visible_features: string[];
  ocr_text: string[];
  regulatory_marks: string[];
  decisive_cues: string[];
  confidence: number;
  gtin?: string | null;
};

export interface ProductMarketResearch {
  averagePrice: number;
  priceRange: { min: number; max: number };
  marketDemand: "high" | "medium" | "low";
  competitorCount: number;
  priceConfidence?: number;
  comparableCount?: number;
  notes?: string;
}

export interface ProductAnalysis {
  title: string;
  description: string;
  category: ListingCategory;
  condition: ListingCondition | "";
  suggestedPrice: number;
  confidence: number;
  features: string[];
  brand: string;
  model: string;
  missingInfo?: string[];
  questions?: ListingQuestion[];
  _evidence?: ProductEvidence;
  marketResearch: ProductMarketResearch;
}

type UserAnswerValue = string | { question?: string; answer?: string };
type NormalizedAnswer = { field: string; question?: string; answer: string };

const nullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const ListingQuestionSchema = z.object({
  field: z.string().min(1),
  question: z.string().min(1),
  placeholder: z.string().optional(),
  type: z.enum(["text", "select", "number"]).default("text"),
  options: z.array(z.string()).optional(),
});

const EvidenceSchema = z
  .object({
    brand: nullableString,
    product_type: nullableString,
    model_exact: nullableString,
    model_range: nullableString,
    variant_or_colorway: nullableString,
    visible_features: z.array(z.string()).default([]),
    ocr_text: z.array(z.string()).default([]),
    regulatory_marks: z.array(z.string()).default([]),
    decisive_cues: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1).default(0.5),
    gtin: nullableString,
  })
  .passthrough();

const PhaseOneSchema = z
  .object({
    evidence: EvidenceSchema,
    listing_ready: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        condition: z.string().nullable().optional(),
        suggested_price: z.number().nullable().optional(),
        placeholders_needed: z.array(z.string()).default([]),
        contextual_questions: z
          .array(z.union([z.string(), ListingQuestionSchema]))
          .default([]),
      })
      .passthrough(),
  })
  .passthrough();

const FinalSchema = z
  .object({
    listing_ready: z.object({
      title: z.string().min(3),
      description: z.string().min(20),
      category: z.string().optional(),
      condition: z.string().nullable().optional(),
      suggested_price: z.number().nullable().optional(),
    }),
    market_analysis: z
      .object({
        suggestedPrice: z.number().nullable().optional(),
        priceRange: z
          .object({
            min: z.number(),
            max: z.number(),
          })
          .nullable()
          .optional(),
        confidence: z.number().min(0).max(1).optional(),
        marketDemand: z.enum(["high", "medium", "low"]).optional(),
      })
      .optional(),
  })
  .passthrough();

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeCategory(raw?: string | null, productType?: string | null): ListingCategory {
  const value = `${raw || ""} ${productType || ""}`.toLowerCase();

  if (/phone|laptop|tablet|computer|camera|headphone|speaker|remote|controller|console|electronic/.test(value)) {
    return "electronics";
  }
  if (/shoe|sneaker|shirt|pants|jacket|clothing|fashion|dress|watch|bag|purse/.test(value)) {
    return "fashion";
  }
  if (/sofa|chair|table|furniture|decor|kitchen|home|lamp|rug/.test(value)) {
    return "home";
  }
  if (/sport|bike|bicycle|fitness|golf|basketball|football|baseball/.test(value)) {
    return "sports";
  }
  if (/car|truck|auto|automotive|vehicle|tire|wheel|engine/.test(value)) {
    return "automotive";
  }
  if (/toy|game|lego|doll|puzzle/.test(value)) return "toys";
  if (/beauty|makeup|skincare|hair/.test(value)) return "beauty";
  if (/appliance|microwave|washer|dryer|fridge|refrigerator|oven/.test(value)) return "appliances";
  if (/book|textbook|novel/.test(value)) return "books";
  if (/tool|drill|saw|wrench|hammer/.test(value)) return "tools";

  return CATEGORY_VALUES.includes(raw as ListingCategory) ? (raw as ListingCategory) : "other";
}

function normalizeCondition(raw?: string | null): ListingCondition | "" {
  if (!raw) return "";
  const value = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (value === "brand-new" || value === "new-in-box" || value === "new") return "new";
  if (value === "like-new" || value === "likenew" || value === "excellent") return "like-new";
  if (value === "good" || value === "used-good") return "good";
  if (value === "fair" || value === "acceptable") return "fair";
  if (value === "poor" || value === "damaged" || value === "for-parts") return "poor";
  return "";
}

function normalizeFieldName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function inferQuestionFromText(question: string, index: number): ListingQuestion | null {
  const lower = question.toLowerCase();
  if (lower.includes("owner") || lower.includes("receipt") || lower.includes("purchase year")) return null;

  if (lower.includes("condition")) {
    return {
      field: "condition",
      question,
      type: "select",
      options: ["New", "Like New", "Good", "Fair", "Poor"],
    };
  }
  if (lower.includes("price") || lower.includes("asking")) {
    return {
      field: "price",
      question,
      type: "number",
      placeholder: "e.g., 45",
    };
  }
  if (lower.includes("brand") || lower.includes("model") || lower.includes("device") || lower.includes("work with")) {
    return {
      field: "identity_details",
      question,
      type: "text",
      placeholder: "e.g., Roku Voice Remote Pro, Samsung TV remote, Sony RMF-TX500U",
    };
  }
  if (lower.includes("storage") || lower.includes("capacity")) {
    return { field: "storage", question, type: "text", placeholder: "e.g., 128GB" };
  }
  if (lower.includes("battery")) {
    return { field: "battery", question, type: "text", placeholder: "e.g., 85%" };
  }
  if (lower.includes("carrier") || lower.includes("locked") || lower.includes("unlocked")) {
    return {
      field: "carrier",
      question,
      type: "select",
      options: ["Unlocked", "Verizon", "AT&T", "T-Mobile", "Other", "Not sure"],
    };
  }
  if (lower.includes("size")) {
    return { field: "size", question, type: "text", placeholder: "e.g., Men's 10, Medium, 32x34" };
  }
  if (lower.includes("color") || lower.includes("colour")) {
    return { field: "color", question, type: "text", placeholder: "e.g., black, white, navy" };
  }
  if (lower.includes("box") || lower.includes("packaging")) {
    return {
      field: "original_packaging",
      question,
      type: "select",
      options: ["Yes", "No", "Not sure"],
    };
  }
  if (lower.includes("accessories") || lower.includes("included")) {
    return { field: "accessories", question, type: "text", placeholder: "e.g., charger, case, box" };
  }
  if (lower.includes("scratch") || lower.includes("damage")) {
    return { field: "damage", question, type: "text", placeholder: "e.g., no damage, minor scratches" };
  }

  return {
    field: `detail_${index + 1}`,
    question,
    type: "text",
    placeholder: "Add details",
  };
}

function normalizeQuestions(rawQuestions: unknown[]): ListingQuestion[] {
  const questions: ListingQuestion[] = [];
  const seen = new Set<string>();

  const add = (question: ListingQuestion | null) => {
    if (!question?.question?.trim()) return;
    const field = normalizeFieldName(question.field || question.question);
    if (!field || seen.has(field)) return;
    seen.add(field);
    questions.push({
      ...question,
      field,
      question: question.question.trim(),
      placeholder: question.placeholder?.trim() || undefined,
      options: question.options?.filter(Boolean),
    });
  };

  rawQuestions.forEach((raw, index) => {
    if (typeof raw === "string") {
      add(inferQuestionFromText(raw, index));
      return;
    }

    const parsed = ListingQuestionSchema.safeParse(raw);
    if (parsed.success) {
      add({
        field: parsed.data.field,
        question: parsed.data.question,
        type: parsed.data.type || "text",
        placeholder: parsed.data.placeholder,
        options: parsed.data.options,
      });
    }
  });

  return questions.slice(0, 6);
}

function addQuestion(questions: ListingQuestion[], question: ListingQuestion) {
  if (questions.some((item) => item.field === question.field)) return;
  questions.push(question);
}

function isGenericTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return true;
  return (
    /^(product item|item|unknown item|misc item|electronic device|electronics item)$/i.test(normalized) ||
    /^(black|white|gray|grey|silver|red|blue|green)?\s*(remote control|controller|device|shirt|shoes|sneakers|bag)$/i.test(normalized)
  );
}

function needsIdentityQuestion(evidence: ProductEvidence, title?: string) {
  const hasSpecificIdentity = Boolean(evidence.brand || evidence.model_exact || evidence.model_range);
  const productType = evidence.product_type?.toLowerCase() || "";
  const exactIdentityMatters = /remote|controller|adapter|charger|part|accessory|phone|laptop|tablet|camera|watch|shoe|sneaker/.test(
    productType
  );

  return !hasSpecificIdentity && (exactIdentityMatters || evidence.confidence < 0.78 || isGenericTitle(title || ""));
}

function parseJsonResponse(text: string): unknown {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  if (!cleaned) throw new Error("AI service returned empty JSON.");
  return JSON.parse(cleaned);
}

function getResponseText(response: unknown): string {
  const text = (response as { text?: unknown })?.text;
  if (typeof text === "function") return String(text.call(response) || "");
  return typeof text === "string" ? text : "";
}

async function uploadImagesToGemini(imageUrls: string[]) {
  if (!genAi) throw new Error("AI service is not configured.");

  const parts = [];
  for (const imageUrl of imageUrls.slice(0, 6)) {
    const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const mimeType = imageResponse.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    const imageBuffer = await imageResponse.arrayBuffer();
    if (imageBuffer.byteLength === 0) throw new Error("Image buffer is empty.");

    const imageBlob = new Blob([imageBuffer], { type: mimeType });
    const uploaded = await genAi.files.upload({
      file: imageBlob,
      config: { mimeType },
    });

    if (uploaded.uri && uploaded.mimeType) {
      parts.push(createPartFromUri(uploaded.uri, uploaded.mimeType));
    }
  }

  if (parts.length === 0) throw new Error("No images could be prepared for AI analysis.");
  return parts;
}

function marketResearchFromPricing(market: MarketPricingResult): ProductMarketResearch {
  const suggested = market.suggestedPrice ?? 0;
  return {
    averagePrice: suggested,
    priceRange: market.priceRange ?? { min: suggested, max: suggested },
    marketDemand: market.marketDemand,
    competitorCount: market.competitorCount,
    priceConfidence: market.confidence,
    comparableCount: market.comparables.length,
    notes: market.notes,
  };
}

function normalizeUserAnswers(userAnswers: Record<string, UserAnswerValue> = {}): NormalizedAnswer[] {
  return Object.entries(userAnswers)
    .map(([field, value]) => {
      if (typeof value === "string") return { field, answer: value.trim() };
      return {
        field,
        question: typeof value?.question === "string" ? value.question.trim() : undefined,
        answer: typeof value?.answer === "string" ? value.answer.trim() : "",
      };
    })
    .filter((entry) => entry.answer.length > 0);
}

function findAnswer(answers: NormalizedAnswer[], fields: string[]): string {
  const targets = fields.map(normalizeFieldName);
  return answers.find((entry) => targets.includes(normalizeFieldName(entry.field)))?.answer || "";
}

function parseSellerPrice(answers: NormalizedAnswer[]): number | null {
  const raw = findAnswer(answers, ["price", "asking_price", "target_price"]);
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function answerAsObject(answers: NormalizedAnswer[]) {
  return answers.reduce<Record<string, { question?: string; answer: string }>>((acc, entry) => {
    acc[entry.field] = {
      ...(entry.question ? { question: entry.question } : {}),
      answer: entry.answer,
    };
    return acc;
  }, {});
}

function buildIdentityQuery(evidence: ProductEvidence, answers: NormalizedAnswer[], fallbackTitle?: string) {
  const identity = findAnswer(answers, ["identity_details", "brand_model", "product_identity"]);
  const brand = evidence.brand || "";
  const model = evidence.model_exact || evidence.model_range || "";
  return [identity, brand, model, fallbackTitle, evidence.product_type]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFinalTitle(title: string, evidence: ProductEvidence, answers: NormalizedAnswer[]): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (!isGenericTitle(trimmed)) return trimmed.slice(0, 90);

  const identity = findAnswer(answers, ["identity_details", "brand_model", "product_identity"]);
  if (identity && !isGenericTitle(identity)) return identity.slice(0, 90);

  const known = [evidence.brand, evidence.model_exact || evidence.model_range, evidence.product_type]
    .filter(Boolean)
    .join(" ")
    .trim();
  return known && !isGenericTitle(known) ? known.slice(0, 90) : trimmed.slice(0, 90);
}

function buildPhaseOnePrompt() {
  return `
You are a visual product identification assistant for AllVerse marketplace sellers.

Analyze ALL uploaded photos before answering. Extract only visible evidence and ask targeted follow-up questions for details that are not visible but required for a specific listing.

Return ONLY valid JSON:
{
  "evidence": {
    "brand": "string or null",
    "product_type": "specific product type or null",
    "model_exact": "exact visible model or null",
    "model_range": "narrow likely family or null",
    "variant_or_colorway": "string or null",
    "visible_features": ["specific visible feature"],
    "ocr_text": ["exact readable text"],
    "regulatory_marks": ["exact marks"],
    "decisive_cues": ["why this identity/category was chosen"],
    "confidence": 0.0,
    "gtin": "visible barcode/GTIN or null"
  },
  "listing_ready": {
    "title": "specific provisional title or empty string",
    "description": "short evidence summary, not a final sales description",
    "category": "electronics|fashion|home|sports|automotive|toys|beauty|appliances|books|tools|other",
    "condition": "new|like-new|good|fair|poor|unknown|null",
    "suggested_price": null,
    "placeholders_needed": ["missing exact attribute"],
    "contextual_questions": [
      {"field":"condition","question":"What condition is this item in?","type":"select","options":["New","Like New","Good","Fair","Poor"]},
      {"field":"identity_details","question":"What brand/model is this, or what device does it work with?","type":"text"}
    ]
  }
}

Rules:
- Do not finalize a generic identity such as "Black Remote Control" when brand, compatible device, or model is unclear; ask a targeted identity question.
- Carefully distinguish full-size vehicles from die-cast cars, scale models, RC cars, and toys. A real vehicle should use product_type "car", "truck", "SUV", "motorcycle", or another specific vehicle type and category "automotive".
- Treat a pictured car as a real, full-size vehicle when scene-scale evidence supports it, including roads, parking spaces, license plates, a drivable interior, full-size wheels, buildings, or people. Do not call it a scale model merely because the photo is close-cropped, polished, or lacks people.
- Classify a vehicle as a scale model, die-cast item, RC car, or toy only when there is positive evidence such as packaging, a printed scale ratio (for example 1:18 or 1:64), a display base, handheld/tabletop scale, toy-like wheels or controls, or explicit text identifying it as a model or toy.
- For a real vehicle, extract the visible make/model and ask for missing year, trim, mileage, title status, drivetrain, and mechanical condition when those details are needed. Never estimate a full-size vehicle's price using toy or scale-model comparables.
- Never invent brand, model, condition, storage, size, carrier, accessories, warranty, or price.
- Use all photos. Later photos may contain model labels, tags, ports, or package text.
- Ask no more than 6 questions. Prefer questions that materially improve title, description, condition, and price.
- Do not ask for owner history, receipt, or purchase year.
`;
}

function buildFinalPrompt(args: {
  evidence: ProductEvidence;
  answers: NormalizedAnswer[];
  market: MarketPricingResult;
  sellerPrice: number | null;
}) {
  return `
You are a professional marketplace listing writer for AllVerse.

Create the FINAL seller-ready listing using:
1. Visible image evidence.
2. Seller answers.
3. Market pricing context.

Visible evidence:
${JSON.stringify(args.evidence, null, 2)}

Seller answers:
${JSON.stringify(answerAsObject(args.answers), null, 2)}

Market pricing context:
${formatMarketPricingForPrompt(args.market)}

Return ONLY valid JSON:
{
  "listing_ready": {
    "title": "specific title with brand/model/variant when known; no condition words; no price",
    "description": "3-5 natural sentences using visible facts and seller answers. Be honest about condition and included items.",
    "category": "electronics|fashion|home|sports|automotive|toys|beauty|appliances|books|tools|other",
    "condition": "new|like-new|good|fair|poor|null",
    "suggested_price": 0
  },
  "market_analysis": {
    "suggestedPrice": 0,
    "priceRange": {"min": 0, "max": 0},
    "confidence": 0.0,
    "marketDemand": "high|medium|low"
  }
}

Rules:
- Specificity is mandatory. Avoid titles like "Black Remote Control", "Product Item", "Electronic Device", or "Shoes".
- Preserve the established real-vehicle versus scale-model identity. If the images show a full-size vehicle, write and price it as an automotive vehicle; never reinterpret it as a die-cast, RC, toy, or scale model without explicit contrary evidence in the images or seller answers.
- For a full-size vehicle, use vehicle-market comparables matching make, model, year, trim, mileage, title status, and condition when available. Exclude toy, collectible, scale-model, parts-only, and RC listings from pricing.
- If the seller provided exact identity details, use those details in the title.
- Do not claim an exact model unless it is visible or provided by the seller.
- Use the seller's exact condition answer when provided. If condition is still unknown, return null for condition.
- ${
    args.sellerPrice
      ? `The seller provided a target price of $${args.sellerPrice}. Use that exact value for suggested_price unless market context clearly proves it is impossible.`
      : "If market confidence is below 0.40 or no comparable prices are available, return null for suggested_price instead of guessing."
  }
- If market confidence is 0.40 or higher, use the market suggested price and range unless the seller provided a target price.
- No emojis, no hype, no warranty claims unless visible/provided.
`;
}

export class AIAnalysisService {
  static isConfigured(): boolean {
    return Boolean(apiKey && genAi);
  }

  static async analyzeProductPhotos(imageUrls: string[]): Promise<ProductAnalysis> {
    if (!apiKey || !genAi) {
      throw new Error("AI service is not configured. Please configure GEMINI_API_KEY.");
    }

    const imageParts = await uploadImagesToGemini(imageUrls);
    const response = await genAi.models.generateContent({
      model: GEMINI_MODELS.FAST,
      contents: createUserContent([...imageParts, buildPhaseOnePrompt()]),
      config: {
        responseMimeType: "application/json",
        temperature: 0.15,
      },
    });

    const parsed = PhaseOneSchema.parse(parseJsonResponse(getResponseText(response)));
    const evidence = parsed.evidence as ProductEvidence;
    const listing = parsed.listing_ready;
    const category = normalizeCategory(listing.category, evidence.product_type);
    const condition = normalizeCondition(listing.condition);
    const provisionalTitle = listing.title?.trim() || evidence.product_type || "";

    const market = await getMarketPricing({
      title: provisionalTitle,
      category,
      condition,
      brand: evidence.brand || undefined,
      model: evidence.model_exact || evidence.model_range || undefined,
      productType: evidence.product_type || undefined,
      limit: 10,
    });

    const questions = normalizeQuestions([
      ...(listing.contextual_questions || []),
      ...(listing.placeholders_needed || []),
    ]);

    if (needsIdentityQuestion(evidence, provisionalTitle)) {
      addQuestion(questions, {
        field: "identity_details",
        question: /remote|controller/i.test(evidence.product_type || provisionalTitle)
          ? "What brand/model is this remote, or what device does it control?"
          : "What brand/model is this item, if you know it?",
        type: "text",
        placeholder: "Add the exact brand/model or compatibility details",
      });
    }

    if (!condition) {
      addQuestion(questions, {
        field: "condition",
        question: "What condition is this item in?",
        type: "select",
        options: ["New", "Like New", "Good", "Fair", "Poor"],
      });
    }

    if (!market.suggestedPrice || market.confidence < 0.4) {
      addQuestion(questions, {
        field: "price",
        question: "What price would you like to ask for this item?",
        type: "number",
        placeholder: "e.g., 45",
      });
    }

    return {
      title: provisionalTitle,
      description: listing.description?.trim() || "",
      category,
      condition,
      suggestedPrice: market.confidence >= 0.4 ? market.suggestedPrice ?? 0 : 0,
      confidence: clamp01(evidence.confidence),
      features: evidence.visible_features || [],
      brand: evidence.brand || "",
      model: evidence.model_exact || evidence.model_range || "",
      missingInfo: questions.map((question) => question.question),
      questions,
      _evidence: evidence,
      marketResearch: marketResearchFromPricing(market),
    };
  }

  static async generateFinalListing(
    imageUrls: string[],
    userAnswers: Record<string, UserAnswerValue>,
    initialEvidence: ProductEvidence
  ): Promise<ProductAnalysis> {
    if (!apiKey || !genAi) {
      throw new Error("AI service is not configured. Please configure GEMINI_API_KEY.");
    }

    const evidence = EvidenceSchema.parse(initialEvidence) as ProductEvidence;
    const answers = normalizeUserAnswers(userAnswers);
    const sellerPrice = parseSellerPrice(answers);
    const identityQuery = buildIdentityQuery(evidence, answers);
    const conditionAnswer = normalizeCondition(findAnswer(answers, ["condition"]));

    const market = await getMarketPricing({
      title: identityQuery,
      category: normalizeCategory(undefined, evidence.product_type),
      condition: conditionAnswer,
      brand: evidence.brand || undefined,
      model: evidence.model_exact || evidence.model_range || undefined,
      productType: evidence.product_type || undefined,
      limit: 12,
    });

    const imageParts = await uploadImagesToGemini(imageUrls);
    const response = await genAi.models.generateContent({
      model: GEMINI_MODELS.SMART,
      contents: createUserContent([
        ...imageParts,
        buildFinalPrompt({ evidence, answers, market, sellerPrice }),
      ]),
      config: {
        responseMimeType: "application/json",
        temperature: 0.25,
      },
    });

    const parsed = FinalSchema.parse(parseJsonResponse(getResponseText(response)));
    const listing = parsed.listing_ready;
    const marketAnalysis = parsed.market_analysis;
    const condition = normalizeCondition(listing.condition) || conditionAnswer;
    const suggestedPrice =
      sellerPrice ||
      (market.confidence >= 0.4 ? market.suggestedPrice : null) ||
      (marketAnalysis?.confidence && marketAnalysis.confidence >= 0.4
        ? marketAnalysis.suggestedPrice || listing.suggested_price || null
        : null) ||
      0;

    const aiPriceRange =
      typeof marketAnalysis?.priceRange?.min === "number" &&
      typeof marketAnalysis?.priceRange?.max === "number"
        ? { min: marketAnalysis.priceRange.min, max: marketAnalysis.priceRange.max }
        : null;

    const marketResearch = marketResearchFromPricing({
      ...market,
      suggestedPrice: suggestedPrice > 0 ? suggestedPrice : market.suggestedPrice,
      priceRange:
        sellerPrice && sellerPrice > 0
          ? { min: sellerPrice, max: sellerPrice }
          : market.priceRange || aiPriceRange,
      confidence: sellerPrice ? Math.max(market.confidence, 0.35) : market.confidence,
      marketDemand: marketAnalysis?.marketDemand || market.marketDemand,
    });

    return {
      title: sanitizeFinalTitle(listing.title, evidence, answers),
      description: listing.description.trim(),
      category: normalizeCategory(listing.category, evidence.product_type),
      condition,
      suggestedPrice,
      confidence: Math.max(clamp01(evidence.confidence), clamp01(market.confidence)),
      features: evidence.visible_features || [],
      brand: evidence.brand || "",
      model: evidence.model_exact || evidence.model_range || "",
      missingInfo: condition ? [] : ["What condition is this item in?"],
      questions: condition
        ? []
        : [
            {
              field: "condition",
              question: "What condition is this item in?",
              type: "select",
              options: ["New", "Like New", "Good", "Fair", "Poor"],
            },
          ],
      _evidence: evidence,
      marketResearch,
    };
  }
}
