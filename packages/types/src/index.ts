import { z } from "zod";

/** Shared error code enum */
export const ErrorCode = z.enum([
  "BAD_REQUEST",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "RATE_LIMITED",
  "INTERNAL",
  "CONFLICT",
  "UNPROCESSABLE",
  "TOO_LARGE",
  "METHOD_NOT_ALLOWED",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiErrorShape = z.object({
  error: z.object({ code: ErrorCode, message: z.string() }),
});
export type ApiErrorShape = z.infer<typeof ApiErrorShape>;

/** Basic lookups */
export const ListingCategory = z.enum([
  "electronics",
  "fashion",
  "home",
  "books",
  "other",
]);
export type ListingCategory = z.infer<typeof ListingCategory>;

/** USER */
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  createdAt: z.string(), // ISO
});
export type User = z.infer<typeof UserSchema>;

/** PROFILE */
export const ProfileSchema = z.object({
  userId: z.string(),
  bio: z.string().max(280).optional(),
  location: z.string().max(120).optional(),
  rating: z.number().min(0).max(5).optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** LISTING */
export const ListingSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(120),
  description: z.string().max(1000),
  price: z.number().nonnegative(),
  currency: z.literal("USD"),
  category: ListingCategory,
  photos: z.array(z.string().url()).default([]),
  sellerId: z.string(),
  status: z.enum(["active", "sold", "archived"]).default("active"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Listing = z.infer<typeof ListingSchema>;

export const CreateListingInput = ListingSchema.pick({
  title: true,
  description: true,
  price: true,
  currency: true,
  category: true,
  photos: true,
}).extend({ sellerId: z.string().optional() });
export type CreateListingInput = z.infer<typeof CreateListingInput>;

export const UpdateListingInput = ListingSchema.partial().omit({
  id: true,
  sellerId: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateListingInput = z.infer<typeof UpdateListingInput>;

/** CHAT */
export const ChatRoomSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  createdAt: z.string(),
});
export type ChatRoom = z.infer<typeof ChatRoomSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderId: z.string(),
  text: z.string().max(2000).optional(),
  image: z.string().url().optional(),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/** PRICES */
export const PriceSuggestRequest = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  photos: z.array(z.string().url()).optional(),
});
export type PriceSuggestRequest = z.infer<typeof PriceSuggestRequest>;

export const PriceSuggestResponse = z.object({
  price: z.number().nonnegative(),
  rationale: z.string(),
});
export type PriceSuggestResponse = z.infer<typeof PriceSuggestResponse>;

/** Pagination envelope */
export const Paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    hasMore: z.boolean(),
  });

export type PaginatedListing = z.infer<ReturnType<typeof Paginated<typeof ListingSchema>>>;

// Frontend compatibility types
export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  iconImage?: string;
  parentId?: string;
  children?: Category[];
};

export type ListingFilters = {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  sortBy?: 'price' | 'date' | 'relevance';
  sortOrder?: 'asc' | 'desc';
};

export type CreateListingForm = {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  images: File[];
};

export type PriceSuggestion = {
  id: string;
  listingId: string;
  suggestedPrice: number;
  currency: string;
  reason: string;
  suggestedBy: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
};

// Extended Listing type for frontend compatibility
export type ListingWithSeller = Listing & {
  seller?: User;
  images?: string[]; // Alias for photos
  condition?: string;
  location?: string;
  views?: number;
  rating?: number;
};
