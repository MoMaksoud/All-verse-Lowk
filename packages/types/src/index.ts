// User and Profile types
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  bio?: string;
  location?: string;
  phone?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Listing types
export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  images: string[];
  location: string;
  sellerId: string;
  seller: User;
  status: 'active' | 'sold' | 'expired' | 'draft';
  views: number;
  favorites: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListingFilters {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  sortBy?: 'price' | 'date' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

// Order types
export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  currency: string;
  shippingAddress: Address;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Message types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'offer';
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  listingId?: string;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// Price suggestion types
export interface PriceSuggestion {
  id: string;
  listingId: string;
  suggestedPrice: number;
  currency: string;
  reason: string;
  suggestedBy: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId?: string;
  children?: Category[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface CreateListingForm {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  images: File[];
}

export interface UpdateProfileForm {
  displayName: string;
  bio?: string;
  location?: string;
  phone?: string;
  avatar?: File;
}

// UI State types
export interface AppState {
  user: User | null;
  theme: 'light' | 'dark' | 'system';
  isLoading: boolean;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  createdAt: string;
}
