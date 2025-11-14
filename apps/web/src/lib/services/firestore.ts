import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  addDoc,
  onSnapshot,
  Timestamp,
  increment,
} from 'firebase/firestore';

import { db, isFirebaseConfigured } from '../firebase';
import {
  FirestoreUser,
  CreateUserInput,
  UpdateUserInput,
  FirestoreListing,
  CreateListingInput,
  UpdateListingInput,
  FirestoreCart,
  AddToCartInput,
  UpdateCartItemInput,
  FirestoreOrder,
  CreateOrderInput,
  UpdateOrderInput,
  FirestorePayment,
  CreatePaymentInput,
  UpdatePaymentInput,
  FirestoreMessage,
  CreateMessageInput,
  FirestoreChat,
  CreateConversationInput,
  ProfilePhotoUpload,
  ListingPhotoUpload,
  PaginationOptions,
  PaginatedResult,
  SearchFilters,
  SortOptions,
  COLLECTIONS,
} from '../types/firestore';

// ============================================================================
// BASE SERVICE CLASS
// ============================================================================
abstract class BaseFirestoreService<T> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  protected getCollection() {
    if (!db || !isFirebaseConfigured()) {
      throw new Error('Database not initialized or Firebase not configured');
    }
    return collection(db, this.collectionName);
  }

  protected getDocRef(id: string) {
    if (!db || !isFirebaseConfigured()) {
      throw new Error('Database not initialized or Firebase not configured');
    }
    return doc(db, this.collectionName, id);
  }

  protected async getDoc(id: string): Promise<DocumentSnapshot> {
    return await getDoc(this.getDocRef(id));
  }

  protected async getDocs(query?: any): Promise<QueryDocumentSnapshot[]> {
    const snapshot = await getDocs(query || this.getCollection());
    return snapshot.docs as QueryDocumentSnapshot[];
  }

  protected async setDoc(id: string, data: any): Promise<void> {
    await setDoc(this.getDocRef(id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  protected async updateDoc(id: string, data: any): Promise<void> {
    await updateDoc(this.getDocRef(id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  protected async deleteDoc(id: string): Promise<void> {
    await deleteDoc(this.getDocRef(id));
  }

  protected async addDoc(data: any): Promise<string> {
    const docRef = await addDoc(this.getCollection(), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  protected createPaginationQuery(
    baseQuery: any,
    options: PaginationOptions,
    lastDoc?: QueryDocumentSnapshot
  ) {
    let paginatedQuery = baseQuery;
    
    if (lastDoc) {
      paginatedQuery = query(paginatedQuery, startAfter(lastDoc));
    }
    
    return query(paginatedQuery, limit(options.limit));
  }

  protected createPaginatedResult<T>(
    docs: QueryDocumentSnapshot[],
    options: PaginationOptions,
    total?: number
  ): PaginatedResult<T> {
    const items = docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    const hasMore = docs.length === options.limit;
    
    return {
      items,
      total: total || items.length,
      page: options.page,
      limit: options.limit,
      hasMore,
    };
  }
}

// ============================================================================
// USERS SERVICE
// ============================================================================
export class UsersService extends BaseFirestoreService<FirestoreUser> {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  async getUser(uid: string): Promise<FirestoreUser | null> {
    const doc = await this.getDoc(uid);
    if (!doc.exists()) return null;
    
    return { id: doc.id, ...doc.data() } as FirestoreUser & { id: string };
  }

  async createUser(uid: string, userData: CreateUserInput): Promise<FirestoreUser> {
    const userDataWithDefaults = {
      ...userData,
      role: userData.role || 'buyer',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await this.setDoc(uid, userDataWithDefaults);
    return this.getUser(uid) as Promise<FirestoreUser>;
  }

  async updateUser(uid: string, updates: UpdateUserInput): Promise<void> {
    await this.updateDoc(uid, updates);
  }

  async deleteUser(uid: string): Promise<void> {
    await this.deleteDoc(uid);
  }

  async getUsersByRole(role: 'buyer' | 'seller' | 'admin'): Promise<FirestoreUser[]> {
    const q = query(this.getCollection(), where('role', '==', role));
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreUser & { id: string }));
  }
}

// ============================================================================
// LISTINGS SERVICE
// ============================================================================
export class ListingsService extends BaseFirestoreService<FirestoreListing> {
  constructor() {
    super(COLLECTIONS.LISTINGS);
  }

  async getListing(id: string): Promise<FirestoreListing | null> {
    const doc = await this.getDoc(id);
    if (!doc.exists()) return null;
    
    return { id: doc.id, ...doc.data() } as FirestoreListing & { id: string };
  }

  async createListing(listingData: CreateListingInput): Promise<string> {
    const listingDataWithDefaults = {
      ...listingData,
      currency: listingData.currency || 'USD',
      isActive: listingData.isActive !== false,
      soldCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return await this.addDoc(listingDataWithDefaults);
  }

  async updateListing(id: string, updates: UpdateListingInput): Promise<void> {
    await this.updateDoc(id, updates);
  }

  async deleteListing(id: string): Promise<void> {
    await this.deleteDoc(id);
  }

  async getListingsBySeller(sellerId: string): Promise<FirestoreListing[]> {
    const q = query(this.getCollection(), where('sellerId', '==', sellerId));
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreListing & { id: string }));
  }

  async getActiveListings(): Promise<FirestoreListing[]> {
    const q = query(this.getCollection(), where('isActive', '==', true));
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreListing & { id: string }));
  }

  async getAllListings(): Promise<FirestoreListing[]> {
    const docs = await this.getDocs(this.getCollection());
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreListing & { id: string }));
  }

  async searchListings(
    filters: SearchFilters,
    sortOptions?: SortOptions,
    paginationOptions?: PaginationOptions
  ): Promise<PaginatedResult<FirestoreListing>> {
    let q = query(this.getCollection());

    // Apply database-level filters for better performance
    q = query(q, where('isActive', '==', filters.isActive !== false));
    
    // Add database-level filters (requires composite indexes)
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.condition) {
      q = query(q, where('condition', '==', filters.condition));
    }
    if (filters.sellerId) {
      q = query(q, where('sellerId', '==', filters.sellerId));
    }
    if (filters.minPrice !== undefined) {
      q = query(q, where('price', '>=', filters.minPrice));
    }
    if (filters.maxPrice !== undefined) {
      q = query(q, where('price', '<=', filters.maxPrice));
    }

    // Apply sorting at database level
    const sortField = sortOptions?.field || 'createdAt';
    const sortDirection = sortOptions?.direction || 'desc';
    q = query(q, orderBy(sortField, sortDirection));

    // Apply pagination
    if (paginationOptions) {
      q = this.createPaginationQuery(q, paginationOptions) as any;
    }

    const docs = await this.getDocs(q);
    const results = this.createPaginatedResult<FirestoreListing>(docs, paginationOptions || { page: 1, limit: 20 });

    return results;
  }

  async updateInventory(id: string, quantitySold: number): Promise<void> {
    const listing = await this.getListing(id);
    if (!listing) throw new Error('Listing not found');

    const newInventory = Math.max(0, listing.inventory - quantitySold);
    const newSoldCount = listing.soldCount + quantitySold;

    const updates: any = {
      inventory: newInventory,
      soldCount: newSoldCount,
      isActive: newInventory > 0,
    };

    // Mark as sold if inventory reaches 0 (but keep isActive true for 2 days)
    if (newInventory === 0) {
      updates.soldAt = serverTimestamp();
      updates.isActive = true; // Keep active for 2 days, then filter out
    }

    await this.updateDoc(id, updates);
  }
}

// ============================================================================
// CARTS SERVICE
// ============================================================================
export class CartsService extends BaseFirestoreService<FirestoreCart> {
  constructor() {
    super(COLLECTIONS.CARTS);
  }

  async getCart(uid: string): Promise<FirestoreCart | null> {
    const doc = await this.getDoc(uid);
    if (!doc.exists()) return null;
    
    return { id: doc.id, ...doc.data() } as FirestoreCart & { id: string };
  }

  async createCart(uid: string): Promise<void> {
    await this.setDoc(uid, {
      items: [],
      updatedAt: serverTimestamp(),
    });
  }

  async addToCart(uid: string, item: AddToCartInput): Promise<void> {
    const cart = await this.getCart(uid);
    if (!cart) {
      await this.createCart(uid);
      return this.addToCart(uid, item);
    }

    const existingItemIndex = cart.items.findIndex(
      cartItem => cartItem.listingId === item.listingId
    );

    let updatedItems;
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      updatedItems = [...cart.items];
      updatedItems[existingItemIndex].qty += item.qty;
    } else {
      // Add new item
      updatedItems = [...cart.items, item];
    }

    await this.updateDoc(uid, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
  }

  async updateCartItem(uid: string, update: UpdateCartItemInput): Promise<void> {
    const cart = await this.getCart(uid);
    if (!cart) throw new Error('Cart not found');

    const updatedItems = cart.items.map(item =>
      item.listingId === update.listingId
        ? { ...item, qty: update.qty }
        : item
    ).filter(item => item.qty > 0); // Remove items with 0 quantity

    await this.updateDoc(uid, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
  }

  async removeFromCart(uid: string, listingId: string): Promise<void> {
    const cart = await this.getCart(uid);
    if (!cart) throw new Error('Cart not found');

    const updatedItems = cart.items.filter(item => item.listingId !== listingId);

    await this.updateDoc(uid, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
  }

  async clearCart(uid: string): Promise<void> {
    await this.updateDoc(uid, {
      items: [],
      updatedAt: serverTimestamp(),
    });
  }

  async deleteCart(uid: string): Promise<void> {
    await this.deleteDoc(uid);
  }

  // Subscribe to real-time updates for a user's cart
  subscribeToCart(uid: string, callback: (cart: (FirestoreCart & { id: string }) | null) => void): () => void {
    const ref = doc(db, this.collectionName, uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...(snap.data() as any) });
      } else {
        callback(null);
      }
    });
  }
}

// ============================================================================
// ORDERS SERVICE
// ============================================================================
export class OrdersService extends BaseFirestoreService<FirestoreOrder> {
  constructor() {
    super(COLLECTIONS.ORDERS);
  }

  async getOrder(id: string): Promise<FirestoreOrder | null> {
    const doc = await this.getDoc(id);
    if (!doc.exists()) return null;
    
    return { id: doc.id, ...doc.data() } as FirestoreOrder & { id: string };
  }

  async createOrder(orderData: CreateOrderInput): Promise<string> {
    const orderDataWithDefaults = {
      ...orderData,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return await this.addDoc(orderDataWithDefaults);
  }

  async updateOrder(id: string, updates: UpdateOrderInput): Promise<void> {
    await this.updateDoc(id, updates);
  }

  async getOrdersByBuyer(buyerId: string): Promise<FirestoreOrder[]> {
    const q = query(this.getCollection(), where('buyerId', '==', buyerId));
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreOrder & { id: string }));
  }

  async getOrdersBySeller(sellerId: string): Promise<FirestoreOrder[]> {
    const q = query(this.getCollection(), where('items', 'array-contains', { sellerId }));
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreOrder & { id: string }));
  }

  async getOrdersByStatus(status: string): Promise<FirestoreOrder[]> {
    const q = query(this.getCollection(), where('status', '==', status));
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreOrder & { id: string }));
  }
}

// ============================================================================
// PAYMENTS SERVICE
// ============================================================================
export class PaymentsService extends BaseFirestoreService<FirestorePayment> {
  constructor() {
    super(COLLECTIONS.PAYMENTS);
  }

  async getPayment(id: string): Promise<FirestorePayment | null> {
    const doc = await this.getDoc(id);
    if (!doc.exists()) return null;
    
    return { id: doc.id, ...doc.data() } as FirestorePayment & { id: string };
  }

  async createPayment(paymentData: CreatePaymentInput): Promise<string> {
    const paymentDataWithDefaults = {
      ...paymentData,
      createdAt: serverTimestamp(),
    };

    return await this.addDoc(paymentDataWithDefaults);
  }

  async updatePayment(id: string, updates: UpdatePaymentInput): Promise<void> {
    await this.updateDoc(id, updates);
  }

  async getPaymentsByOrder(orderId: string): Promise<FirestorePayment[]> {
    const q = query(this.getCollection(), where('orderId', '==', orderId));
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestorePayment & { id: string }));
  }

  async getPaymentsByStatus(status: string): Promise<FirestorePayment[]> {
    const q = query(this.getCollection(), where('status', '==', status));
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestorePayment & { id: string }));
  }
}

// (Removed legacy MessagesService and ConversationsService; use ChatsService instead)

// ============================================================================
// PROFILE PHOTOS SERVICE
// ============================================================================
class ProfilePhotosService extends BaseFirestoreService<ProfilePhotoUpload> {
  constructor() {
    super(COLLECTIONS.PROFILE_PHOTOS);
  }

  async saveProfilePhoto(data: ProfilePhotoUpload): Promise<void> {
    const docRef = doc(db, this.collectionName, data.userId);
    await setDoc(docRef, {
      ...data,
      uploadedAt: serverTimestamp(),
    });
  }

  async getProfilePhoto(userId: string): Promise<ProfilePhotoUpload | null> {
    const docRef = doc(db, this.collectionName, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { ...docSnap.data(), userId } as ProfilePhotoUpload;
    }
    return null;
  }

  async deleteProfilePhoto(userId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, userId);
    await deleteDoc(docRef);
  }
}

// ============================================================================
// LISTING PHOTOS SERVICE
// ============================================================================
class ListingPhotosService extends BaseFirestoreService<ListingPhotoUpload> {
  constructor() {
    super(COLLECTIONS.LISTING_PHOTOS);
  }

  async saveListingPhotos(data: ListingPhotoUpload): Promise<void> {
    const docRef = doc(db, this.collectionName, data.listingId);
    await setDoc(docRef, {
      ...data,
      uploadedAt: serverTimestamp(),
    });
  }

  async getListingPhotos(listingId: string): Promise<ListingPhotoUpload | null> {
    const docRef = doc(db, this.collectionName, listingId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { ...docSnap.data(), listingId } as ListingPhotoUpload;
    }
    return null;
  }

  async deleteListingPhotos(listingId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, listingId);
    await deleteDoc(docRef);
  }
}

// ============================================================================
// CHAT SERVICE
// ============================================================================
export class ChatsService extends BaseFirestoreService<FirestoreChat> {
  constructor() {
    super('chats');
  }

  // Create or get existing chat between two users
  async getOrCreateChat(userId1: string, userId2: string): Promise<string> {
    // Check if either user is deleted
    const user1Doc = await getDoc(doc(db, COLLECTIONS.USERS, userId1));
    const user2Doc = await getDoc(doc(db, COLLECTIONS.USERS, userId2));
    
    const user1Deleted = user1Doc.exists() && (user1Doc.data() as any)?.deleted === true;
    const user2Deleted = user2Doc.exists() && (user2Doc.data() as any)?.deleted === true;
    
    if (user1Deleted || user2Deleted) {
      throw new Error('Cannot create chat with a deleted user');
    }
    
    const participants = [userId1, userId2].sort();
    const chatId = participants.join('_');
    
    const chatRef = doc(db, this.collectionName, chatId);
    const chatSnap = await getDoc(chatRef);
    
    // Check if chat exists and if user is marked as deleted in it
    if (chatSnap.exists()) {
      const chatData = chatSnap.data() as any;
      if (chatData?.deletedParticipants?.[userId1] || chatData?.deletedParticipants?.[userId2]) {
        throw new Error('Cannot message a deleted user');
      }
    }
    
    if (!chatSnap.exists()) {
      // Fetch minimal profile info for both users from profiles (preferred) or users fallback
      const buildProfile = async (uid: string) => {
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', uid));
          const p: any = profileDoc.data();
          // Ensure displayName is never undefined - use fallbacks
          const displayName = p?.displayName || p?.username || `User ${uid.substring(0, 8)}`;
          const username = p?.username || displayName;
          const photoURL = p?.profilePicture || '';
          return { 
            displayName: displayName || `User ${uid.substring(0, 8)}`, 
            username: username || displayName || `User ${uid.substring(0, 8)}`, 
            photoURL: photoURL || '' 
          };
        } catch (error) {
          console.error(`Error fetching profile for ${uid}:`, error);
          // Return safe defaults if profile fetch fails
          return {
            displayName: `User ${uid.substring(0, 8)}`,
            username: `User ${uid.substring(0, 8)}`,
            photoURL: ''
          };
        }
      };

      const [p1, p2] = await Promise.all([buildProfile(userId1), buildProfile(userId2)]);

      const newChat: FirestoreChat = {
        participants,
        participantProfiles: {
          [userId1]: {
            displayName: p1.displayName || `User ${userId1.substring(0, 8)}`,
            username: p1.username || p1.displayName || `User ${userId1.substring(0, 8)}`,
            photoURL: p1.photoURL || ''
          },
          [userId2]: {
            displayName: p2.displayName || `User ${userId2.substring(0, 8)}`,
            username: p2.username || p2.displayName || `User ${userId2.substring(0, 8)}`,
            photoURL: p2.photoURL || ''
          },
        },
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };
      await setDoc(chatRef, newChat);
    }
    
    return chatId;
  }

  // Get all chats for a user
  async getUserChats(userId: string): Promise<FirestoreChat[]> {
    const q = query(
      this.getCollection(),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreChat & { id: string }));
  }

  // Update last message in chat
  async updateLastMessage(chatId: string, message: { text: string; senderId: string; timestamp: Timestamp }): Promise<void> {
    const chatRef = doc(db, this.collectionName, chatId);
    await updateDoc(chatRef, {
      lastMessage: message,
      updatedAt: serverTimestamp(),
    });
  }

  // Send a message
  async sendMessage(chatId: string, senderId: string, text: string): Promise<string> {
    // Check if chat exists and if recipient is deleted
    const chatDoc = await this.getDoc(chatId);
    if (!chatDoc.exists()) {
      throw new Error('Chat not found');
    }
    
    const chat = chatDoc.data() as any;
    const participants = chat?.participants || [];
    const deletedParticipants = chat?.deletedParticipants || {};
    
    // Find the other participant
    const otherParticipant = participants.find((p: string) => p !== senderId);
    if (otherParticipant && deletedParticipants[otherParticipant]) {
      throw new Error('Cannot send message to a deleted user');
    }
    
    const messageRef = doc(collection(db, this.collectionName, chatId, 'messages'));
    const messageData: FirestoreMessage = {
      chatId,
      senderId,
      text,
      timestamp: serverTimestamp() as Timestamp,
      readBy: [senderId], // Sender has read their own message
    };
    
    await setDoc(messageRef, messageData);
    
    // Update last message and increment unread for others
    const chatRef = doc(db, this.collectionName, chatId);
    const updates: any = {
      lastMessage: {
        text,
        senderId,
        timestamp: serverTimestamp() as Timestamp,
      },
      updatedAt: serverTimestamp(),
    };
    
    // Increment unread count for each participant except sender
    for (const uid of participants) {
      if (uid !== senderId) {
        updates[`unreadCount.${uid}`] = increment(1);
      }
    }
    
    await updateDoc(chatRef, updates);
    
    return messageRef.id;
  }
  
  // Mark messages as read (legacy - sets unreadCount to 0)
  async markChatAsRead(chatId: string, userId: string): Promise<void> {
    const chatRef = doc(db, this.collectionName, chatId);
    await updateDoc(chatRef, {
      [`unreadCount.${userId}`]: 0,
    });
  }

  // Mark chat as opened (updates lastOpenedAt timestamp)
  async markChatAsOpened(chatId: string, userId: string): Promise<void> {
    const chatRef = doc(db, this.collectionName, chatId);
    await updateDoc(chatRef, {
      [`lastOpenedAt.${userId}`]: serverTimestamp(),
      [`unreadCount.${userId}`]: 0, // Also clear unread count
    });
  }

  // Get messages for a chat
  async getChatMessages(chatId: string): Promise<FirestoreMessage[]> {
    const messagesRef = collection(db, this.collectionName, chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as unknown as FirestoreMessage[];
  }

  // Subscribe to chat messages (real-time)
  subscribeToChatMessages(chatId: string, callback: (messages: FirestoreMessage[]) => void): () => void {
    const messagesRef = collection(db, this.collectionName, chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as FirestoreMessage[];
      callback(messages);
    });
  }

  // Subscribe to user chats (real-time)
  subscribeToUserChats(userId: string, callback: (chats: FirestoreChat[]) => void): () => void {
    const q = query(
      this.getCollection(),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const chats = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as FirestoreChat[];
      callback(chats);
    });
  }
}

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================
export const firestoreServices = {
  users: new UsersService(),
  listings: new ListingsService(),
  carts: new CartsService(),
  orders: new OrdersService(),
  payments: new PaymentsService(),
  profilePhotos: new ProfilePhotosService(),
  listingPhotos: new ListingPhotosService(),
  chats: new ChatsService(),
};

// Re-export types for convenience
export type { FirestoreChat, FirestoreMessage } from '../types/firestore';
