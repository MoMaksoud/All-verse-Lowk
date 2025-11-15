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

/** PROFILE TYPES */
export const GenderSchema = z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']);
export type Gender = z.infer<typeof GenderSchema>;

export const ShoppingFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'occasionally', 'rarely']);
export type ShoppingFrequency = z.infer<typeof ShoppingFrequencySchema>;

export const UserActivitySchema = z.enum(['browse-only', 'buy-only', 'sell-only', 'both-buy-sell']);
export type UserActivity = z.infer<typeof UserActivitySchema>;

export const ItemConditionPreferenceSchema = z.enum(['new-only', 'second-hand-only', 'both']);
export type ItemConditionPreference = z.infer<typeof ItemConditionPreferenceSchema>;

export const ProfileSchema = z.object({
  userId: z.string(),
  username: z.string().min(3).max(30), // Unique username (like Instagram @username)
  displayName: z.string().min(1).max(100), // Display name (can be reused, like Instagram name)
  bio: z.string().max(280).optional(),
  createdAt: z.string(), // ISO timestamp
  gender: GenderSchema.optional(),
  age: z.number().min(13).max(120).optional(),
  profilePicture: z.string().optional(),
  phoneNumber: z.string().optional(),
  interestCategories: z.array(z.string()).default([]), // ['electronics', 'home', 'clothing', etc.]
  userActivity: UserActivitySchema.default('both-buy-sell'),
  budget: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    currency: z.string().default('USD')
  }).optional(),
  shoppingFrequency: ShoppingFrequencySchema.optional(),
  itemConditionPreference: ItemConditionPreferenceSchema.default('both'),
  updatedAt: z.string().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const CreateProfileInput = ProfileSchema.omit({
  userId: true,
  createdAt: true,
  updatedAt: true,
  rating: true,
});
export type CreateProfileInput = z.infer<typeof CreateProfileInput>;

/** LISTING TYPES */
export type SimpleListing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  photos: string[]; // data URLs or remote URLs
  createdAt: string; // ISO
  updatedAt: string; // ISO
  sellerId?: string;
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
};

export type SimpleListingCreate = {
  title: string;
  description: string;
  price: number;
  category: string;
  photos: string[]; // allow data URLs (dev) or https URLs
};

/** FILTER TYPES */
export type ListingFilters = {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sortBy?: 'price' | 'date' | 'relevance';
  sortOrder?: 'asc' | 'desc';
};

/** CATEGORY TYPES */
export type Category = {
  id: string;
  name: string;
  children?: Category[];
};