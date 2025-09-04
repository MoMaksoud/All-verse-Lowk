import {
  User,
  Profile,
  Listing,
  PriceSuggestion,
  Category,
  ListingFilters,
  CreateListingForm,
  ListingWithSeller,
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
    name: 'John Doe',
    email: 'john@example.com',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar:
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'user3',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-03T00:00:00Z',
  },
];

const mockProfiles: Profile[] = [
  {
    userId: 'user1',
    bio: 'Tech enthusiast and gadget collector',
    location: 'San Francisco, CA',
    rating: 4.8,
  },
  {
    userId: 'user2',
    bio: 'Fashion designer and vintage collector',
    location: 'New York, NY',
    rating: 4.9,
  },
  {
    userId: 'user3',
    bio: 'Sports equipment specialist',
    location: 'Los Angeles, CA',
    rating: 4.7,
  },
];

const mockCategories: Category[] = [
  { 
    id: 'cat1', 
    name: 'Electronics', 
    slug: 'electronics', 
    icon: '📱',
    iconImage: '/icons/electronics.svg',
    children: [] 
  },
  { 
    id: 'cat2', 
    name: 'Fashion', 
    slug: 'fashion', 
    icon: '👕',
    iconImage: '/icons/fashion.svg',
    children: [] 
  },
  { 
    id: 'cat3', 
    name: 'Sports', 
    slug: 'sports', 
    icon: '⚽',
    iconImage: '/icons/sports.svg',
    children: [] 
  },
  { 
    id: 'cat4', 
    name: 'Home', 
    slug: 'home-garden', 
    icon: '🏠',
    iconImage: '/icons/home.svg',
    children: [] 
  },
  { 
    id: 'cat6', 
    name: 'Automotive', 
    slug: 'automotive', 
    icon: '🚗',
    iconImage: '/icons/automotive.svg',
    children: [] 
  },
];

const mockListings: Listing[] = [
  {
    id: 'listing1',
    title: 'iPhone 14 Pro - Excellent Condition',
    description:
      'Selling my iPhone 14 Pro in excellent condition. Comes with original box and accessories. No scratches or dents.',
    price: 899,
    currency: 'USD',
    category: 'electronics',
    photos: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop',
    ],
    sellerId: 'user1',
    status: 'active',
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
    category: 'fashion',
    photos: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    ],
    sellerId: 'user2',
    status: 'active',
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
    category: 'other',
    photos: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
    ],
    sellerId: 'user3',
    status: 'active',
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
    category: 'electronics',
    photos: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop',
    ],
    sellerId: 'user1',
    status: 'active',
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
    category: 'home',
    photos: [
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=300&fit=crop',
    ],
    sellerId: 'user2',
    status: 'active',
    createdAt: '2024-01-11T11:30:00Z',
    updatedAt: '2024-01-11T11:30:00Z',
  },
];

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API functions
export const mockApi = {
  // User APIs
  async getCurrentUser() {
    await delay(300);
    return {
      success: true,
      data: mockUsers[0],
      message: 'User retrieved successfully',
    };
  },

  async updateProfile(profileData: Partial<Profile>) {
    await delay(500);
    const updatedProfile = {
      ...mockProfiles[0],
      ...profileData,
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
  ) {
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
      success: true,
      data: {
        items: paginatedListings,
        total: filteredListings.length,
        page,
        limit,
        hasMore: endIndex < filteredListings.length,
      },
      message: 'Listings retrieved successfully',
    };
  },

  async getListing(id: string) {
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

  async createListing(listingData: CreateListingForm) {
    await delay(600);
    const newListing: Listing = {
      id: generateId(),
      title: listingData.title,
      description: listingData.description,
      price: listingData.price,
      currency: 'USD',
      category: listingData.category as any,
      photos: [],
      sellerId: 'user1', // Mock current user
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockListings.push(newListing);
    
    return {
      success: true,
      data: newListing,
      message: 'Listing created successfully',
    };
  },

  // Category APIs
  async getCategories() {
    await delay(200);
    return {
      success: true,
      data: mockCategories,
      message: 'Categories retrieved successfully',
    };
  },

  // Price suggestion API
  async getPriceSuggestion(data: { title: string; description: string; photos?: string[] }) {
    await delay(800);
    // Simple mock algorithm
    const basePrice = Math.min(999, Math.round(5 + data.title.length * 2 + data.description.length * 0.3));
    const photoFactor = (data.photos?.length ?? 0) * 3;
    const suggestedPrice = Math.max(5, basePrice + photoFactor);
    
    return {
      success: true,
      data: {
        price: suggestedPrice,
        rationale: `Demo model: title/desc length and photos influenced price. (title=${data.title.length}, desc=${data.description.length}, photos=${data.photos?.length ?? 0})`,
      },
      message: 'Price suggestion generated successfully',
    };
  },
};
