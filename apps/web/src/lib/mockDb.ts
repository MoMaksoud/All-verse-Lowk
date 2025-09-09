import { User, Profile, Listing, ListingCategory } from '@marketplace/types';

// Mock Users
export const dbUsers: User[] = [
  {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'user3',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-03T00:00:00Z',
  },
];

// Mock Profiles
export const dbProfiles: Profile[] = [
  {
    userId: 'user1',
    bio: 'Tech enthusiast and gadget collector',
    location: 'San Francisco, CA',
    rating: 4.8,
  },
  {
    userId: 'user2',
    bio: 'Fashion lover and style consultant',
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

// Mock Listings Data
const listingsData: Listing[] = [
  {
    id: 'listing1',
    sellerId: 'user1',
    title: 'iPhone 14 Pro - Excellent Condition',
    description: 'Selling my iPhone 14 Pro in excellent condition. No scratches, comes with original box and charger.',
    price: 899.99,
    currency: 'USD',
    category: 'electronics' as ListingCategory,
    condition: 'Like New',
    photos: [
      '/images/iphone-14.jpg',
    ],
    status: 'active',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'listing2',
    sellerId: 'user2',
    title: 'MacBook Air M2 - Like New',
    description: 'MacBook Air M2 with 8GB RAM and 256GB SSD. Used for only 3 months, perfect condition.',
    price: 1299.99,
    currency: 'USD',
    category: 'electronics' as ListingCategory,
    condition: 'Like New',
          photos: [
        '/images/macbook-m2.jpg',
      ],
    status: 'active',
    createdAt: '2024-01-11T14:30:00Z',
    updatedAt: '2024-01-11T14:30:00Z',
  },
  {
    id: 'listing3',
    sellerId: 'user3',
    title: 'Nike Air Max 270 - Size 10',
    description: 'Nike Air Max 270 in black and white. Size 10, worn only a few times.',
    price: 89.99,
    currency: 'USD',
    category: 'fashion' as ListingCategory,
    condition: 'Good',
    photos: [
      '/images/air-max-270.avif',
    ],
    status: 'active',
    createdAt: '2024-01-12T09:15:00Z',
    updatedAt: '2024-01-12T09:15:00Z',
  },
  {
    id: 'listing4',
    sellerId: 'user1',
    title: 'Basketball - Spalding Official',
    description: 'Official Spalding basketball, used for indoor games. Great condition.',
    price: 25.99,
    currency: 'USD',
    category: 'sports' as ListingCategory,
    condition: 'Good',
    photos: [
      '/images/basketball.avif',
    ],
    status: 'active',
    createdAt: '2024-01-13T16:20:00Z',
    updatedAt: '2024-01-13T16:20:00Z',
  },
  {
    id: 'listing5',
    sellerId: 'user2',
    title: 'Tennis Racket - Wilson Pro Staff',
    description: 'Wilson Pro Staff tennis racket, perfect for intermediate players.',
    price: 120.00,
    currency: 'USD',
    category: 'sports' as ListingCategory,
    condition: 'Like New',
    photos: [
      '/images/tennis-racket.avif',
    ],
    status: 'active',
    createdAt: '2024-01-14T11:45:00Z',
    updatedAt: '2024-01-14T11:45:00Z',
  },
  {
    id: 'listing6',
    sellerId: 'user3',
    title: 'Yoga Mat - Premium Quality',
    description: 'High-quality yoga mat, non-slip surface, perfect for home workouts.',
    price: 35.99,
    currency: 'USD',
    category: 'sports' as ListingCategory,
    condition: 'Good',
    photos: [
      '/images/yoga-mat.avif',
    ],
    status: 'active',
    createdAt: '2024-01-15T08:30:00Z',
    updatedAt: '2024-01-15T08:30:00Z',
  },
  {
    id: 'listing7',
    sellerId: 'user1',
    title: 'Coffee Table - Modern Design',
    description: 'Beautiful modern coffee table with glass top and wooden legs. Perfect for living room.',
    price: 299.99,
    currency: 'USD',
    category: 'home' as ListingCategory,
    condition: 'Like New',
    photos: [],
    status: 'active',
    createdAt: '2024-01-16T12:00:00Z',
    updatedAt: '2024-01-16T12:00:00Z',
  },
  {
    id: 'listing8',
    sellerId: 'user2',
    title: 'Smart Home Speaker - Amazon Echo',
    description: 'Amazon Echo Dot with Alexa. Voice-controlled smart speaker, excellent condition.',
    price: 49.99,
    currency: 'USD',
    category: 'home' as ListingCategory,
    condition: 'Like New',
    photos: [],
    status: 'active',
    createdAt: '2024-01-17T15:30:00Z',
    updatedAt: '2024-01-17T15:30:00Z',
  },
];

// Chat Types
interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'offer' | 'question';
  offer?: {
    amount: number;
    currency: string;
  };
  timestamp: string;
  deliveredAt?: string;
  readAt?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ChatConversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageId: string;
  createdAt: string;
  updatedAt: string;
}

// Mock Chat Data
export const dbChatMessages: ChatMessage[] = [
  {
    id: 'msg1',
    conversationId: 'conv1',
    senderId: 'user2',
    text: 'Hi! I saw your iPhone 14 Pro listing. Is it still available?',
    type: 'text',
    timestamp: '2024-01-15T10:00:00Z',
    deliveredAt: '2024-01-15T10:00:05Z',
    readAt: '2024-01-15T10:01:30Z',
    status: 'read',
  },
  {
    id: 'msg2',
    conversationId: 'conv1',
    senderId: 'user1',
    text: 'Hello! Yes, it\'s still available. Are you interested?',
    type: 'text',
    timestamp: '2024-01-15T10:05:00Z',
    deliveredAt: '2024-01-15T10:05:03Z',
    readAt: '2024-01-15T10:06:15Z',
    status: 'read',
  },
  {
    id: 'msg3',
    conversationId: 'conv1',
    senderId: 'user2',
    text: 'Yes, I am! Can you tell me more about the condition?',
    type: 'text',
    timestamp: '2024-01-15T10:10:00Z',
    deliveredAt: '2024-01-15T10:10:02Z',
    status: 'delivered',
  },
  {
    id: 'msg4',
    conversationId: 'conv2',
    senderId: 'user3',
    text: 'I can offer $1200 for the MacBook',
    type: 'offer',
    offer: { amount: 1200, currency: 'USD' },
    timestamp: '2024-01-15T09:15:00Z',
    deliveredAt: '2024-01-15T09:15:04Z',
    readAt: '2024-01-15T09:16:20Z',
    status: 'read',
  },
  {
    id: 'msg5',
    conversationId: 'conv3',
    senderId: 'user1',
    text: 'Can you ship to NYC?',
    type: 'question',
    timestamp: '2024-01-15T08:45:00Z',
    deliveredAt: '2024-01-15T08:45:06Z',
    status: 'delivered',
  },
];

export const dbChatConversations: ChatConversation[] = [
  {
    id: 'conv1',
    listingId: 'listing1',
    buyerId: 'user2',
    sellerId: 'user1',
    lastMessageId: 'msg3',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:10:00Z',
  },
  {
    id: 'conv2',
    listingId: 'listing2',
    buyerId: 'user3',
    sellerId: 'user2',
    lastMessageId: 'msg4',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:15:00Z',
  },
  {
    id: 'conv3',
    listingId: 'listing3',
    buyerId: 'user1',
    sellerId: 'user3',
    lastMessageId: 'msg5',
    createdAt: '2024-01-15T08:30:00Z',
    updatedAt: '2024-01-15T08:45:00Z',
  },
];

// Chat Database Operations
export const dbChat = {
  // Get conversations for a user
  async getConversations(userId: string, page: number = 1, limit: number = 20) {
    const userConversations = dbChatConversations.filter(
      conv => conv.buyerId === userId || conv.sellerId === userId
    );

    const start = (page - 1) * limit;
    const end = start + limit;
    const items = userConversations
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(start, end);

    // Enrich with listing and user data
    const enrichedItems = items.map(conv => {
      const listing = listingsData.find(l => l.id === conv.listingId);
      const otherUserId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
      const otherUser = dbUsers.find(u => u.id === otherUserId);
      const lastMessage = dbChatMessages.find(m => m.id === conv.lastMessageId);

      return {
        id: conv.id,
        listingId: conv.listingId,
        listingTitle: listing?.title || 'Unknown Listing',
        listingImage: listing?.photos[0] || '',
        otherUser: {
          id: otherUser?.id || '',
          name: otherUser?.name || 'Unknown User',
          avatar: otherUser?.avatar || '',
          isOnline: Math.random() > 0.5, // Mock online status
        },
        lastMessage: lastMessage || {
          id: '',
          conversationId: conv.id,
          senderId: '',
          text: 'No messages yet',
          type: 'text' as const,
          timestamp: conv.createdAt,
          status: 'sent',
        },
        unreadCount: Math.floor(Math.random() * 5), // Mock unread count
        updatedAt: conv.updatedAt,
      };
    });

    return {
      items: enrichedItems,
      total: userConversations.length,
      hasMore: end < userConversations.length,
    };
  },

  // Get messages for a conversation
  async getMessages(conversationId: string, page: number = 1, limit: number = 50) {
    const messages = dbChatMessages.filter(msg => msg.conversationId === conversationId);
    
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = messages
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(start, end);

    return {
      items,
      total: messages.length,
      hasMore: end < messages.length,
    };
  },

  // Create a new conversation
  async createConversation(userId: string, listingId: string, initialMessage: string) {
    const listing = listingsData.find(l => l.id === listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const conversationId = `conv${Date.now()}`;
    const messageId = `msg${Date.now()}`;

    const conversation: ChatConversation = {
      id: conversationId,
      listingId,
      buyerId: userId,
      sellerId: listing.sellerId,
      lastMessageId: messageId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const message: ChatMessage = {
      id: messageId,
      conversationId,
      senderId: userId,
      text: initialMessage,
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    dbChatConversations.push(conversation);
    dbChatMessages.push(message);

    return conversation;
  },

  // Send a message
  async sendMessage(conversationId: string, senderId: string, text: string, type: string = 'text', offer?: any) {
    const conversation = dbChatConversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const messageId = `msg${Date.now()}`;
    const message: ChatMessage = {
      id: messageId,
      conversationId,
      senderId,
      text,
      type: type as 'text' | 'image' | 'offer' | 'question',
      offer,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    // Update conversation's last message
    conversation.lastMessageId = messageId;
    conversation.updatedAt = new Date().toISOString();

    dbChatMessages.push(message);

    // Simulate delivery after a short delay
    setTimeout(() => {
      const msgIndex = dbChatMessages.findIndex(m => m.id === messageId);
      if (msgIndex !== -1) {
        dbChatMessages[msgIndex].deliveredAt = new Date().toISOString();
        dbChatMessages[msgIndex].status = 'delivered';
      }
    }, 2000);

    // Simulate read status after another delay (if recipient is online)
    setTimeout(() => {
      const msgIndex = dbChatMessages.findIndex(m => m.id === messageId);
      if (msgIndex !== -1 && Math.random() > 0.3) { // 70% chance of being read
        dbChatMessages[msgIndex].readAt = new Date().toISOString();
        dbChatMessages[msgIndex].status = 'read';
      }
    }, 5000);

    return message;
  },

  // Mark conversation as read
  async markAsRead(conversationId: string, userId: string) {
    // Mark all unread messages in this conversation as read
    const messages = dbChatMessages.filter(msg => 
      msg.conversationId === conversationId && 
      msg.senderId !== userId && 
      msg.status !== 'read'
    );

    messages.forEach(msg => {
      msg.readAt = new Date().toISOString();
      msg.status = 'read';
    });

    return { success: true, messagesRead: messages.length };
  },

  // Mark specific message as read
  async markMessageAsRead(messageId: string) {
    const message = dbChatMessages.find(m => m.id === messageId);
    if (message && message.status !== 'read') {
      message.readAt = new Date().toISOString();
      message.status = 'read';
      return { success: true };
    }
    return { success: false };
  },

  // Get unread message count for a user
  async getUnreadCount(userId: string) {
    const userConversations = dbChatConversations.filter(
      conv => conv.buyerId === userId || conv.sellerId === userId
    );

    let totalUnread = 0;
    userConversations.forEach(conv => {
      const unreadMessages = dbChatMessages.filter(msg => 
        msg.conversationId === conv.id && 
        msg.senderId !== userId && 
        msg.status !== 'read'
      );
      totalUnread += unreadMessages.length;
    });

    return totalUnread;
  },
};

// User Operations
export const dbUsersOperations = {
  async findById(id: string): Promise<User | null> {
    return dbUsers.find(user => user.id === id) || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    return dbUsers.find(user => user.email === email) || null;
  },

  async create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const newUser: User = {
      id: `user${Date.now()}`,
      ...userData,
      createdAt: new Date().toISOString(),
    };
    dbUsers.push(newUser);
    return newUser;
  },

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = dbUsers.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    dbUsers[userIndex] = { ...dbUsers[userIndex], ...updates };
    return dbUsers[userIndex];
  },

  async delete(id: string): Promise<boolean> {
    const userIndex = dbUsers.findIndex(user => user.id === id);
    if (userIndex === -1) return false;
    
    dbUsers.splice(userIndex, 1);
    return true;
  },
};

// Profile Operations
export const dbProfilesOperations = {
  async findByUserId(userId: string): Promise<Profile | null> {
    return dbProfiles.find(profile => profile.userId === userId) || null;
  },

  async create(profileData: Omit<Profile, 'userId'> & { userId: string }): Promise<Profile> {
    const newProfile: Profile = {
      userId: profileData.userId,
      bio: profileData.bio || '',
      location: profileData.location || '',
      rating: profileData.rating || 0,
    };
    dbProfiles.push(newProfile);
    return newProfile;
  },

  async update(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    const profileIndex = dbProfiles.findIndex(profile => profile.userId === userId);
    if (profileIndex === -1) return null;
    
    dbProfiles[profileIndex] = { ...dbProfiles[profileIndex], ...updates };
    return dbProfiles[profileIndex];
  },
};

// Listing Operations
export const dbListings = {
  list(): Listing[] {
    return listingsData;
  },

  get(id: string): Listing | null {
    return listingsData.find(listing => listing.id === id) || null;
  },

  async findById(id: string): Promise<Listing | null> {
    return listingsData.find(listing => listing.id === id) || null;
  },

  async findByUserId(userId: string): Promise<Listing[]> {
    return listingsData.filter(listing => listing.sellerId === userId);
  },

  create(listingData: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>, sellerId: string): Listing {
    const newListing: Listing = {
      id: `listing${Date.now()}`,
      ...listingData,
      sellerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    listingsData.push(newListing);
    return newListing;
  },

  update(id: string, updates: Partial<Listing>): Listing | null {
    const listingIndex = listingsData.findIndex(listing => listing.id === id);
    if (listingIndex === -1) return null;
    
    listingsData[listingIndex] = { 
      ...listingsData[listingIndex], 
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return listingsData[listingIndex];
  },

  remove(id: string): boolean {
    const listingIndex = listingsData.findIndex(listing => listing.id === id);
    if (listingIndex === -1) return false;
    
    listingsData.splice(listingIndex, 1);
    return true;
  },

  async search(filters: any = {}, page: number = 1, limit: number = 20): Promise<{ items: Listing[], total: number, hasMore: boolean }> {
    let filteredListings = [...listingsData];

    console.log('mockDb search called with filters:', filters);
    console.log('Total listings before filtering:', filteredListings.length);

    // Apply filters
    if (filters.category) {
      console.log('Filtering by category:', filters.category);
      filteredListings = filteredListings.filter(listing => listing.category === filters.category);
      console.log('Listings after category filter:', filteredListings.length);
    }

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filteredListings = filteredListings.filter(listing => 
        listing.title.toLowerCase().includes(keyword) ||
        listing.description.toLowerCase().includes(keyword)
      );
    }

    if (filters.minPrice !== undefined) {
      filteredListings = filteredListings.filter(listing => listing.price >= filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      filteredListings = filteredListings.filter(listing => listing.price <= filters.maxPrice);
    }

    // Sort by creation date (newest first)
    filteredListings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = filteredListings.slice(start, end);

    return {
      items,
      total: filteredListings.length,
      hasMore: end < filteredListings.length,
    };
  },
};
