import { Timestamp } from 'firebase/firestore';

// ============================================================================
// USERS COLLECTION
// ============================================================================
export interface FirestoreUser {
  displayName: string;
  photoURL?: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateUserInput {
  displayName: string;
  photoURL?: string;
  phone?: string;
  role?: 'buyer' | 'seller' | 'admin';
}

export interface UpdateUserInput {
  displayName?: string;
  photoURL?: string;
  phone?: string;
  role?: 'buyer' | 'seller' | 'admin';
}

// ============================================================================
// LISTINGS COLLECTION
// ============================================================================
export interface FirestoreListing {
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  sellerId: string;
  inventory: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  soldCount: number;
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  currency?: string;
  images: string[];
  category: string;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  sellerId: string;
  inventory: number;
  isActive?: boolean;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  images?: string[];
  category?: string;
  condition?: 'new' | 'like-new' | 'good' | 'fair';
  inventory?: number;
  isActive?: boolean;
}

// ============================================================================
// CARTS COLLECTION
// ============================================================================
export interface CartItem {
  listingId: string;
  sellerId: string;
  qty: number;
  priceAtAdd: number;
}

export interface FirestoreCart {
  items: CartItem[];
  updatedAt: Timestamp;
}

export interface AddToCartInput {
  listingId: string;
  sellerId: string;
  qty: number;
  priceAtAdd: number;
}

export interface UpdateCartItemInput {
  listingId: string;
  qty: number;
}

// ============================================================================
// ORDERS COLLECTION
// ============================================================================
export interface OrderItem {
  listingId: string;
  title: string;
  qty: number;
  unitPrice: number;
  sellerId: string;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface FirestoreOrder {
  buyerId: string;
  items: OrderItem[];
  subtotal: number;
  fees: number;
  tax: number;
  total: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  paymentIntentId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  shippingAddress: ShippingAddress;
}

export interface CreateOrderInput {
  buyerId: string;
  items: OrderItem[];
  subtotal: number;
  fees: number;
  tax: number;
  total: number;
  currency: string;
  paymentIntentId: string;
  shippingAddress: ShippingAddress;
}

export interface UpdateOrderInput {
  status?: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  paymentIntentId?: string;
}

// ============================================================================
// PAYMENTS COLLECTION
// ============================================================================
export interface FirestorePayment {
  orderId: string;
  amount: number;
  currency: string;
  stripeEventId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  createdAt: Timestamp;
}

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  stripeEventId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
}

export interface UpdatePaymentInput {
  status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
}

// ============================================================================
// MESSAGES COLLECTION
// ============================================================================
export interface FirestoreMessage {
  senderId: string;
  recipientId: string;
  text: string;
  attachments: string[];
  createdAt: Timestamp;
  readAt: Timestamp | null;
}

export interface CreateMessageInput {
  senderId: string;
  recipientId: string;
  text: string;
  attachments?: string[];
}

export interface UpdateMessageInput {
  readAt?: Timestamp | null;
}

// ============================================================================
// CONVERSATION COLLECTION (for organizing messages)
// ============================================================================
export interface FirestoreConversation {
  participants: string[];
  lastMessage?: FirestoreMessage;
  lastMessageAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateConversationInput {
  participants: string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchFilters {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sellerId?: string;
  isActive?: boolean;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// COLLECTION NAMES
// ============================================================================
export const COLLECTIONS = {
  USERS: 'users',
  LISTINGS: 'listings',
  CARTS: 'carts',
  ORDERS: 'orders',
  PAYMENTS: 'payments',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
