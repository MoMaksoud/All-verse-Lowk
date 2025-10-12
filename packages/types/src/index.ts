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

export const makeError = (code: string, message: string) => ({
  error: { code, message }
});

/** Basic lookups */
export const ListingCategory = z.enum([
  "electronics",
  "fashion",
  "home",
  "books",
  "sports",
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
  username: z.string().min(3).max(30),
  bio: z.string().max(280).optional(),
  createdAt: z.string(), // ISO timestamp
  gender: GenderSchema.optional(),
  age: z.number().min(13).max(120).optional(),
  location: z.string().max(120).optional(),
  profilePicture: z.string().optional(),
  phoneNumber: z.string().optional(),
  rating: z.number().min(0).max(5).default(0),
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

export const UpdateProfileInput = ProfileSchema.partial().omit({
  userId: true,
  createdAt: true,
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;

/** LISTING */
export const ListingCondition = z.enum(['New', 'Like New', 'Good', 'Fair']);
export type ListingCondition = z.infer<typeof ListingCondition>;

export const ListingSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(120),
  description: z.string().max(1000),
  price: z.number().nonnegative(),
  currency: z.literal("USD"),
  category: ListingCategory,
  condition: ListingCondition,
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
  condition: true,
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

export const SearchQuery = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(24),
  sort: z.enum(['recent','priceAsc','priceDesc']).default('recent').optional(),
});
export type SearchQuery = z.infer<typeof SearchQuery>;

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
  children?: Category[];
};

export type ListingFilters = {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  maxDistance?: number; // in miles
  userCoordinates?: {
    lat: number;
    lng: number;
  };
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

// Simple MVP types for immediate functionality
export type SimpleListing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  photos: string[]; // data URLs or remote URLs
  createdAt: string; // ISO
  updatedAt: string; // ISO
  location?: {
    city: string;
    state: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
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

export type SimpleListingUpdate = Partial<SimpleListingCreate>;

// ============================================================================
// FIRESTORE TYPES (New Database Schema)
// ============================================================================

/** User Role */
export const UserRole = z.enum(['buyer', 'seller', 'admin']);
export type UserRole = z.infer<typeof UserRole>;

/** Firestore User */
export const FirestoreUserSchema = z.object({
  displayName: z.string(),
  photoURL: z.string().optional(),
  phone: z.string().optional(),
  role: UserRole,
  createdAt: z.any(), // Timestamp
  updatedAt: z.any(), // Timestamp
});
export type FirestoreUser = z.infer<typeof FirestoreUserSchema>;

/** Firestore Listing */
export const FirestoreListingSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string(),
  images: z.array(z.string()),
  category: z.string(),
  condition: z.enum(['new', 'like-new', 'good', 'fair']),
  sellerId: z.string(),
  inventory: z.number(),
  isActive: z.boolean(),
  createdAt: z.any(), // Timestamp
  updatedAt: z.any(), // Timestamp
  soldCount: z.number(),
});
export type FirestoreListing = z.infer<typeof FirestoreListingSchema>;

/** Cart Item */
export const CartItemSchema = z.object({
  listingId: z.string(),
  sellerId: z.string(),
  qty: z.number(),
  priceAtAdd: z.number(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

/** Firestore Cart */
export const FirestoreCartSchema = z.object({
  items: z.array(CartItemSchema),
  updatedAt: z.any(), // Timestamp
});
export type FirestoreCart = z.infer<typeof FirestoreCartSchema>;

/** Order Item */
export const OrderItemSchema = z.object({
  listingId: z.string(),
  title: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  sellerId: z.string(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

/** Shipping Address */
export const ShippingAddressSchema = z.object({
  name: z.string(),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(),
});
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

/** Order Status */
export const OrderStatus = z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof OrderStatus>;

/** Firestore Order */
export const FirestoreOrderSchema = z.object({
  buyerId: z.string(),
  items: z.array(OrderItemSchema),
  subtotal: z.number(),
  fees: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string(),
  status: OrderStatus,
  paymentIntentId: z.string(),
  createdAt: z.any(), // Timestamp
  updatedAt: z.any(), // Timestamp
  shippingAddress: ShippingAddressSchema,
});
export type FirestoreOrder = z.infer<typeof FirestoreOrderSchema>;

/** Payment Status */
export const PaymentStatus = z.enum(['pending', 'succeeded', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

/** Firestore Payment */
export const FirestorePaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number(),
  currency: z.string(),
  stripeEventId: z.string(),
  status: PaymentStatus,
  createdAt: z.any(), // Timestamp
});
export type FirestorePayment = z.infer<typeof FirestorePaymentSchema>;

/** Firestore Message */
export const FirestoreMessageSchema = z.object({
  senderId: z.string(),
  recipientId: z.string(),
  text: z.string(),
  attachments: z.array(z.string()),
  createdAt: z.any(), // Timestamp
  readAt: z.any().nullable(), // Timestamp or null
});
export type FirestoreMessage = z.infer<typeof FirestoreMessageSchema>;

/** Firestore Conversation */
export const FirestoreConversationSchema = z.object({
  participants: z.array(z.string()),
  lastMessage: FirestoreMessageSchema.optional(),
  lastMessageAt: z.any(), // Timestamp
  createdAt: z.any(), // Timestamp
  updatedAt: z.any(), // Timestamp
});
export type FirestoreConversation = z.infer<typeof FirestoreConversationSchema>;