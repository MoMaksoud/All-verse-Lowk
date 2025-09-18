import { z } from "zod";

export const AiListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.object({ value: z.number(), currency: z.string().default("USD") }),
  condition: z.enum(["New","Like New","Excellent","Good","Fair"]),
  seller: z.object({ id: z.string(), name: z.string().optional().default("") }),
  imageUrl: z.string().url().optional().or(z.literal("")),
  url: z.string().optional().default("").transform((v, ctx) => v || `/listing/${(ctx as any).parent?.id ?? ""}`),
  category: z.string().optional(),
  badges: z.array(z.string()).optional().default([]),
  location: z.string().optional(),
  createdAt: z.string().optional(),
  score: z.number().optional().default(0),
});

export const AiListingsPayload = z.object({
  items: z.array(AiListingSchema),
  meta: z.object({
    query: z.string(),
    total: z.number(),
    limit: z.number().default(12),
    intent: z.enum(["trending","search","recommended"])
  })
});

export type AiListingsPayloadT = z.infer<typeof AiListingsPayload>;
