import {
  User,
  Profile,
  Listing,
  Message,
  Conversation,
  PriceSuggestion,
  Category,
  ListingFilters,
  PaginatedResponse,
  ApiResponse,
  CreateListingForm,
} from '@marketplace/types';
import { generateId } from './utils';

// Keep these aligned with @marketplace/types Listing['condition']
export const CONDITIONS = ['new', 'like-new', 'good', 'fair', 'poor'] as const;
type Condition = (typeof CONDITIONS)[number]; // 'new' | 'like-new' | 'good' | 'fair' | 'poor'

export function normalizeCondition(input?: string | Condition): Condition {
  if (!input) return 'good';
  const v = String(input).toLowerCase().trim().replace(/\s+/g, '-');
  if ((CONDITIONS as readonly string[]).includes(v)) {
    return v as Condition;
  }
  // simple/common aliases
  if (['used', 'ok', 'average'].includes(v)) return 'good';
  if (['mint', 'brand-new'].includes(v)) return 'new';
  return 'good';
}

// Mock data
const mockUsers: User[] = [
  {
    id: 'user1',
    email: 'john@example.com',
    displayName: 'John Doe',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user2',
    email: 'jane@example.com',
    displayName: 'Jane Smith',
    avatar:
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'user3',
    email: 'mike@example.com',
    displayName: 'Mike Johnson',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const mockProfiles: Profile[] = [
  {
    id: 'profile1',
    userId: 'user1',
    bio: 'Tech enthusiast and gadget collector',
    location: 'San Francisco, CA',
    phone: '+1-555-0123',
    rating: 4.8,
    reviewCount: 127,
    isVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'profile2',
    userId: 'user2',
    bio: 'Fashion designer and vintage collector',
    location: 'New York, NY',
    phone: '+1-555-0456',
    rating: 4.9,
    reviewCount: 89,
    isVerified: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'profile3',
    userId: 'user3',
    bio: 'Sports equipment specialist',
    location: 'Los Angeles, CA',
    phone: '+1-555-0789',
    rating: 4.7,
    reviewCount: 203,
    isVerified: true,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const mockCategories: Category[] = [
  { id: 'cat1', name: 'Electronics', slug: 'electronics', icon: '📱', children: [] },
  { id: 'cat2', name: 'Fashion', slug: 'fashion', icon: '👕', children: [] },
  { id: 'cat3', name: 'Sports', slug: 'sports', icon: '⚽', children: [] },
  { id: 'cat4', name: 'Home & Garden', slug: 'home-garden', icon: '🏠', children: [] },
  { id: 'cat5', name: 'Books', slug: 'books', icon: '📚', children: [] },
  { id: 'cat6', name: 'Automotive', slug: 'automotive', icon: '🚗', children: [] },
];

const mockListings: Listing[] = [
  {
    id: 'listing1',
    title: 'iPhone 14 Pro - Excellent Condition',
    description:
      'Selling my iPhone 14 Pro in excellent condition. Comes with original box and accessories. No scratches or dents.',
    price: 899,
    currency: 'USD',
    category: 'Electronics',
    condition: 'like-new',
    images: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop',
    ],
    location: 'San Francisco, CA',
    sellerId: 'user1',
    seller: mockUsers[0],
    status: 'active',
    views: 156,
    favorites: 23,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'listing2',
    title: 'Vintage Denim Jacket - Rare Find',
    description:
      'Authentic vintage denim jacket from the 80s. Perfect condition, rare find for collectors.',
    price: 245,
    currency: 'USD',
    category: 'Fashion',
    condition: 'good',
    images: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    ],
    location: 'New York, NY',
    sellerId: 'user2',
    seller: mockUsers[1],
    status: 'active',
    views: 89,
    favorites: 12,
    createdAt: '2024-01-14T15:45:00Z',
    updatedAt: '2024-01-14T15:45:00Z',
  },
  {
    id: 'listing3',
    title: 'Nike Air Jordan Retro - Size 10',
    description:
      'Classic Nike Air Jordan Retro in perfect condition. Worn only a few times, comes with original box.',
    price: 180,
    currency: 'USD',
    category: 'Sports',
    condition: 'good',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
    ],
    location: 'Los Angeles, CA',
    sellerId: 'user3',
    seller: mockUsers[2],
    status: 'active',
    views: 234,
    favorites: 45,
    createdAt: '2024-01-13T09:20:00Z',
    updatedAt: '2024-01-13T09:20:00Z',
  },
  {
    id: 'listing4',
    title: 'MacBook Pro M2 - 16GB RAM',
    description:
      'MacBook Pro with M2 chip, 16GB RAM, 512GB SSD. Perfect for development and creative work.',
    price: 1499,
    currency: 'USD',
    category: 'Electronics',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
    ],
    location: 'San Francisco, CA',
    sellerId: 'user1',
    seller: mockUsers[0],
    status: 'active',
    views: 312,
    favorites: 67,
    createdAt: '2024-01-12T14:15:00Z',
    updatedAt: '2024-01-12T14:15:00Z',
  },
  {
    id: 'listing5',
    title: 'Antique Wooden Chair - Handcrafted',
    description:
      'Beautiful handcrafted wooden chair from the early 1900s. Excellent condition, perfect for collectors.',
    price: 450,
    currency: 'USD',
    category: 'Home & Garden',
    condition: 'good',
    images: [
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=300&fit=crop',
    ],
    location: 'New York, NY',
    sellerId: 'user2',
    seller: mockUsers[1],
    status: 'active',
    views: 78,
    favorites: 15,
    createdAt: '2024-01-11T11:30:00Z',
    updatedAt: '2024-01-11T11:30:00Z',
  },
];

const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    participants: ['user1', 'user2'],
    listingId: 'listing1',
    lastMessage: {
      id: 'msg1',
      conversationId: 'conv1',
      senderId: 'user2',
      content: 'Is the iPhone still available?',
      type: 'text',
      isRead: true,
      createdAt: '2024-01-16T10:30:00Z',
    },
    unreadCount: 0,
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-01-16T10:30:00Z',
  },
  {
    id: 'conv2',
    participants: ['user1', 'user3'],
    listingId: 'listing4',
    lastMessage: {
      id: 'msg2',
      conversationId: 'conv2',
      senderId: 'user3',
      content: 'Can you ship to LA?',
      type: 'text',
      isRead: false,
      createdAt: '2024-01-16T11:45:00Z',
    },
    unreadCount: 1,
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T11:45:00Z',
  },
];

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API functions
export const mockApi = {
  // User APIs
  async getCurrentUser(): Promise<ApiResponse<User>> {
    await delay(300);
    return {
      success: true,
      data: mockUsers[0],
      message: 'User retrieved successfully',
    };
  },

  async updateProfile(profileData: Partial<Profile>): Promise<ApiResponse<Profile>> {
    await delay(500);
    const updatedProfile = {
      ...mockProfiles[0],
      ...profileData,
      updatedAt: new Date().toISOString(),
    };
    return {
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
    };
  },

  // Listing APIs
  async getListings(
    filters: ListingFilters = {},
    page = 1,
    limit = 12
  ): Promise<PaginatedResponse<Listing>> {
    await delay(400);

    let filteredListings = [...mockListings];

    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      filteredListings = filteredListings.filter(
        listing =>
          listing.title.toLowerCase().includes(kw) ||
          listing.description.toLowerCase().includes(kw)
      );
    }

    if (filters.category) {
      filteredListings = filteredListings.filter(
        listing => listing.category === filters.category
      );
    }

    if (filters.minPrice != null) {
      filteredListings = filteredListings.filter(listing => listing.price >= filters.minPrice!);
    }

    if (filters.maxPrice != null) {
      filteredListings = filteredListings.filter(listing => listing.price <= filters.maxPrice!);
    }

    if (filters.condition) {
      filteredListings = filteredListings.filter(
        listing => listing.condition === filters.condition
      );
    }

    // Sort
    if (filters.sortBy) {
      filteredListings.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price':
            return filters.sortOrder === 'desc' ? b.price - a.price : a.price - b.price;
          case 'date':
            return filters.sortOrder === 'desc'
              ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          default:
            return 0;
        }
      });
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedListings = filteredListings.slice(startIndex, endIndex);

    return {
      data: paginatedListings,
      pagination: {
        page,
        limit,
        total: filteredListings.length,
        totalPages: Math.ceil(filteredListings.length / limit),
      },
    };
  },

  async getListing(id: string): Promise<ApiResponse<Listing>> {
    await delay(300);
    const listing = mockListings.find(l => l.id === id);

    if (!listing) {
      throw new Error('Listing not found');
    }

    return {
      success: true,
      data: listing,
      message: 'Listing retrieved successfully',
    };
  },

  async createListing(listingData: CreateListingForm): Promise<ApiResponse<Listing>> {
    await delay(800);

    const newListing: Listing = {
      id: generateId(),
      ...listingData,
      // ensure union-typed condition
      condition: normalizeCondition((listingData as any).condition),
      currency: 'USD',
      images: listingData.images.map(
        () =>
          'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
      ),
      sellerId: 'user1',
      seller: mockUsers[0],
      status: 'active',
      views: 0,
      favorites: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockListings.unshift(newListing);
    return { success: true, data: newListing, message: 'Listing created successfully' };
  },

  async updateListing(
    id: string,
    listingData: Partial<CreateListingForm>
  ): Promise<ApiResponse<Listing>> {
    await delay(600);
    const idx = mockListings.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('Listing not found');

    const current = mockListings[idx];

    mockListings[idx] = {
      ...current,
      ...listingData,
      // if provided, coerce to union; else keep existing
      condition:
        'condition' in listingData
          ? normalizeCondition((listingData as any).condition)
          : current.condition,
      images:
        'images' in listingData && listingData.images
          ? listingData.images.map(
              () => 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
            )
          : current.images,
      updatedAt: new Date().toISOString(),
    };

    return { success: true, data: mockListings[idx], message: 'Listing updated successfully' };
  },

  async deleteListing(id: string): Promise<ApiResponse<void>> {
    await delay(400);
    const listingIndex = mockListings.findIndex(l => l.id === id);

    if (listingIndex === -1) {
      throw new Error('Listing not found');
    }

    mockListings.splice(listingIndex, 1);

    return {
      success: true,
      data: undefined,
      message: 'Listing deleted successfully',
    };
  },

  // Category APIs
  async getCategories(): Promise<ApiResponse<Category[]>> {
    await delay(200);
    return {
      success: true,
      data: mockCategories,
      message: 'Categories retrieved successfully',
    };
  },

  // Conversation APIs
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    await delay(300);
    return {
      success: true,
      data: mockConversations,
      message: 'Conversations retrieved successfully',
    };
  },

  async getConversation(id: string): Promise<ApiResponse<Conversation>> {
    await delay(200);
    const conversation = mockConversations.find(c => c.id === id);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return {
      success: true,
      data: conversation,
      message: 'Conversation retrieved successfully',
    };
  },

  async sendMessage(conversationId: string, content: string): Promise<ApiResponse<Message>> {
    await delay(300);

    const newMessage: Message = {
      id: generateId(),
      conversationId,
      senderId: 'user1',
      content,
      type: 'text',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const conversation = mockConversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.lastMessage = newMessage;
      conversation.updatedAt = new Date().toISOString();
    }

    return {
      success: true,
      data: newMessage,
      message: 'Message sent successfully',
    };
  },

  // Price suggestion APIs
  async getPriceSuggestions(listingId: string): Promise<ApiResponse<PriceSuggestion[]>> {
    await delay(400);

    const suggestions: PriceSuggestion[] = [
      {
        id: generateId(),
        listingId,
        suggestedPrice: 850,
        currency: 'USD',
        reason: 'Similar items in this condition are selling for around $850',
        suggestedBy: 'user2',
        status: 'pending',
        createdAt: '2024-01-16T09:30:00Z',
      },
      {
        id: generateId(),
        listingId,
        suggestedPrice: 920,
        currency: 'USD',
        reason:
          'Your price is competitive, but you could get $920 based on market trends',
        suggestedBy: 'user3',
        status: 'accepted',
        createdAt: '2024-01-15T14:20:00Z',
      },
    ];

    return {
      success: true,
      data: suggestions,
      message: 'Price suggestions retrieved successfully',
    };
  },

  async createPriceSuggestion(
    listingId: string,
    suggestedPrice: number,
    reason: string
  ): Promise<ApiResponse<PriceSuggestion>> {
    await delay(500);

    const newSuggestion: PriceSuggestion = {
      id: generateId(),
      listingId,
      suggestedPrice,
      currency: 'USD',
      reason,
      suggestedBy: 'user1',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: newSuggestion,
      message: 'Price suggestion created successfully',
    };
  },

  // Search APIs
  async searchListings(query: string): Promise<ApiResponse<Listing[]>> {
    await delay(300);

    const q = query.toLowerCase();
    const results = mockListings.filter(
      listing =>
        listing.title.toLowerCase().includes(q) ||
        listing.description.toLowerCase().includes(q) ||
        listing.category.toLowerCase().includes(q)
    );

    return {
      success: true,
      data: results,
      message: `Found ${results.length} listings`,
    };
  },
};
