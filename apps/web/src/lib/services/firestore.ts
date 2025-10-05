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
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  addDoc,
  writeBatch,
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
  UpdateMessageInput,
  FirestoreConversation,
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

    await this.updateDoc(id, {
      inventory: newInventory,
      soldCount: newSoldCount,
      isActive: newInventory > 0,
    });
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

// ============================================================================
// MESSAGES SERVICE
// ============================================================================
export class MessagesService extends BaseFirestoreService<FirestoreMessage> {
  constructor() {
    super(COLLECTIONS.MESSAGES);
  }

  async getMessage(conversationId: string, messageId: string): Promise<FirestoreMessage | null> {
    const docRef = doc(db, this.collectionName, conversationId, 'threads', messageId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) return null;
    
    return { id: docSnapshot.id, ...docSnapshot.data() } as FirestoreMessage & { id: string };
  }

  async createMessage(conversationId: string, messageData: CreateMessageInput): Promise<string> {
    const messageDataWithDefaults = {
      ...messageData,
      attachments: messageData.attachments || [],
      createdAt: serverTimestamp(),
      readAt: null,
    };

    const docRef = await addDoc(
      collection(db, this.collectionName, conversationId, 'threads'),
      messageDataWithDefaults
    );
    return docRef.id;
  }

  async updateMessage(conversationId: string, messageId: string, updates: UpdateMessageInput): Promise<void> {
    const docRef = doc(db, this.collectionName, conversationId, 'threads', messageId);
    await updateDoc(docRef, updates as any);
  }

  async getMessages(conversationId: string, limitCount: number = 50): Promise<FirestoreMessage[]> {
    const q = query(
      collection(db, this.collectionName, conversationId, 'threads'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreMessage & { id: string }));
  }

  async markAsRead(conversationId: string, messageId: string): Promise<void> {
    await this.updateMessage(conversationId, messageId, {
      readAt: serverTimestamp() as any,
    });
  }
}

// ============================================================================
// CONVERSATIONS SERVICE
// ============================================================================
export class ConversationsService extends BaseFirestoreService<FirestoreConversation> {
  constructor() {
    super(COLLECTIONS.CONVERSATIONS);
  }

  async getConversation(id: string): Promise<FirestoreConversation | null> {
    const doc = await this.getDoc(id);
    if (!doc.exists()) return null;
    
    return { id: doc.id, ...doc.data() } as FirestoreConversation & { id: string };
  }

  async createConversation(conversationData: CreateConversationInput): Promise<string> {
    const conversationDataWithDefaults = {
      ...conversationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return await this.addDoc(conversationDataWithDefaults);
  }

  async getConversationsByUser(userId: string): Promise<FirestoreConversation[]> {
    const q = query(this.getCollection(), where('participants', 'array-contains', userId));
    const docs = await this.getDocs(q);
    return docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreConversation & { id: string }));
  }

  async updateLastMessage(conversationId: string, message: FirestoreMessage): Promise<void> {
    await this.updateDoc(conversationId, {
      lastMessage: message,
      lastMessageAt: message.createdAt,
      updatedAt: serverTimestamp(),
    });
  }
}

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
// EXPORT ALL SERVICES
// ============================================================================
export const firestoreServices = {
  users: new UsersService(),
  listings: new ListingsService(),
  carts: new CartsService(),
  orders: new OrdersService(),
  payments: new PaymentsService(),
  messages: new MessagesService(),
  conversations: new ConversationsService(),
  profilePhotos: new ProfilePhotosService(),
  listingPhotos: new ListingPhotosService(),
};
