import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Profile interface - updated to match new comprehensive profile schema
export interface FirestoreProfile {
  userId: string;
  username: string;
  bio?: string;
  createdAt: any;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  age?: number;
  location?: string;
  profilePicture?: string;
  phoneNumber?: string;
  rating: number;
  interestCategories: string[];
  userActivity: 'browse-only' | 'buy-only' | 'sell-only' | 'both-buy-sell';
  budget?: {
    min?: number;
    max?: number;
    currency: string;
  };
  shoppingFrequency?: 'daily' | 'weekly' | 'monthly' | 'occasionally' | 'rarely';
  itemConditionPreference: 'new-only' | 'second-hand-only' | 'both';
  updatedAt?: any;
}

// Firestore service for profiles
export class ProfileService {
  private static collectionName = 'profiles';

  // Get user profile
  static async getProfile(userId: string): Promise<FirestoreProfile | null> {
    try {
      const profileRef = doc(db, this.collectionName, userId);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        return profileSnap.data() as FirestoreProfile;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  // Create or update user profile
  static async saveProfile(userId: string, profileData: Partial<FirestoreProfile>): Promise<FirestoreProfile> {
    try {
      console.log('ProfileService.saveProfile called with userId:', userId);
      console.log('ProfileService.saveProfile called with profileData:', JSON.stringify(profileData, null, 2));
      
      const profileRef = doc(db, this.collectionName, userId);
      console.log('Profile reference created:', profileRef);
      
      // Check if profile already exists
      const existingProfile = await this.getProfile(userId);
      
      // Create a simple profile object with required fields
      const profileToSave: FirestoreProfile = {
        userId,
        username: profileData.username || existingProfile?.username || '',
        bio: profileData.bio || existingProfile?.bio || '',
        createdAt: existingProfile?.createdAt || serverTimestamp(),
        gender: profileData.gender || existingProfile?.gender,
        age: profileData.age || existingProfile?.age,
        location: profileData.location || existingProfile?.location || '',
        profilePicture: profileData.profilePicture || existingProfile?.profilePicture || '',
        phoneNumber: profileData.phoneNumber || existingProfile?.phoneNumber || '',
        rating: profileData.rating || existingProfile?.rating || 0,
        interestCategories: profileData.interestCategories || existingProfile?.interestCategories || [],
        userActivity: profileData.userActivity || existingProfile?.userActivity || 'both-buy-sell',
        budget: profileData.budget || existingProfile?.budget,
        shoppingFrequency: profileData.shoppingFrequency || existingProfile?.shoppingFrequency,
        itemConditionPreference: profileData.itemConditionPreference || existingProfile?.itemConditionPreference || 'both',
        updatedAt: serverTimestamp(),
      };
      
      console.log('Saving to Firestore:', JSON.stringify(profileToSave, null, 2));
      
      await setDoc(profileRef, profileToSave, { merge: true });
      
      console.log('Profile saved to Firestore successfully');
      
      return profileToSave;
    } catch (error) {
      console.error('Error saving profile:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      throw error;
    }
  }

  // Create a new user profile (for new users)
  static async createUserProfile(userId: string, userData: {
    displayName: string;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
  }): Promise<FirestoreProfile> {
    try {
      const profileData: Partial<FirestoreProfile> = {
        username: userData.displayName || userData.email?.split('@')[0] || 'user',
        bio: '',
        location: '',
        rating: 0,
        interestCategories: [],
        userActivity: 'both-buy-sell',
        itemConditionPreference: 'both',
        phoneNumber: userData.phoneNumber || '',
        profilePicture: userData.photoURL || '',
      };

      return await this.saveProfile(userId, profileData);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Update specific profile fields
  static async updateProfile(userId: string, updates: Partial<FirestoreProfile>): Promise<FirestoreProfile> {
    try {
      const profileRef = doc(db, this.collectionName, userId);
      
      await updateDoc(profileRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      // Return updated profile
      const updatedProfile = await this.getProfile(userId);
      return updatedProfile!;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Delete user profile
  static async deleteProfile(userId: string): Promise<void> {
    try {
      const profileRef = doc(db, this.collectionName, userId);
      await deleteDoc(profileRef);
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }

  // Get all profiles (for admin purposes)
  static async getAllProfiles(): Promise<FirestoreProfile[]> {
    try {
      const profilesRef = collection(db, this.collectionName);
      const querySnapshot = await getDocs(profilesRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any)) as FirestoreProfile[];
    } catch (error) {
      console.error('Error getting all profiles:', error);
      throw error;
    }
  }
}

// Listing service for Firestore
export interface FirestoreListing {
  id?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
  sellerId: string;
  sellerName?: string;
  status: 'active' | 'sold' | 'draft';
  createdAt?: any;
  updatedAt?: any;
}

export class ListingService {
  private static collectionName = 'listings';

  // Create a new listing
  static async createListing(listingData: Omit<FirestoreListing, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreListing> {
    try {
      const listingsRef = collection(db, this.collectionName);
      const newListingRef = doc(listingsRef);
      
      const listingToSave: FirestoreListing = {
        ...listingData,
        id: newListingRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(newListingRef, listingToSave);
      return listingToSave;
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  }

  // Get user's listings
  static async getUserListings(userId: string): Promise<FirestoreListing[]> {
    try {
      const listingsRef = collection(db, this.collectionName);
      const q = query(listingsRef, where('sellerId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreListing[];
    } catch (error) {
      console.error('Error getting user listings:', error);
      throw error;
    }
  }

  // Get all active listings
  static async getAllListings(): Promise<FirestoreListing[]> {
    try {
      const listingsRef = collection(db, this.collectionName);
      const q = query(listingsRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreListing[];
    } catch (error) {
      console.error('Error getting all listings:', error);
      throw error;
    }
  }
}

// Message and Conversation interfaces
export interface FirestoreMessage {
  id?: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'offer' | 'question';
  offer?: {
    amount: number;
    currency: string;
  };
  timestamp?: any;
  deliveredAt?: any;
  readAt?: any;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface FirestoreConversation {
  id?: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageId?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Messages Service
export class MessagesService {
  private static conversationsCollection = 'conversations';
  private static messagesCollection = 'messages';

  // Get conversations for a user
  static async getUserConversations(userId: string): Promise<any[]> {
    try {
      const conversationsRef = collection(db, this.conversationsCollection);
      const q = query(
        conversationsRef, 
        where('buyerId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      const conversations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreConversation[];

      // Also get conversations where user is seller
      const sellerQ = query(
        conversationsRef, 
        where('sellerId', '==', userId)
      );
      const sellerSnapshot = await getDocs(sellerQ);
      
      const sellerConversations = sellerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreConversation[];

      // Combine and return enriched conversations
      const allConversations = [...conversations, ...sellerConversations];
      return await this.enrichConversations(allConversations, userId);
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  // Get messages for a conversation
  static async getConversationMessages(conversationId: string): Promise<FirestoreMessage[]> {
    try {
      const messagesRef = collection(db, this.messagesCollection);
      const q = query(
        messagesRef, 
        where('conversationId', '==', conversationId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreMessage[];
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw error;
    }
  }

  // Create a new conversation
  static async createConversation(conversationData: Omit<FirestoreConversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<FirestoreConversation> {
    try {
      const conversationsRef = collection(db, this.conversationsCollection);
      const newConversationRef = doc(conversationsRef);
      
      const conversationToSave: FirestoreConversation = {
        ...conversationData,
        id: newConversationRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(newConversationRef, conversationToSave);
      return conversationToSave;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Send a message
  static async sendMessage(messageData: Omit<FirestoreMessage, 'id' | 'timestamp'>): Promise<FirestoreMessage> {
    try {
      const messagesRef = collection(db, this.messagesCollection);
      const newMessageRef = doc(messagesRef);
      
      const messageToSave: FirestoreMessage = {
        ...messageData,
        id: newMessageRef.id,
        timestamp: serverTimestamp(),
        status: 'sent'
      };
      
      await setDoc(newMessageRef, messageToSave);

      // Update conversation's last message and timestamp
      const conversationRef = doc(db, this.conversationsCollection, messageData.conversationId);
      await updateDoc(conversationRef, {
        lastMessageId: newMessageRef.id,
        updatedAt: serverTimestamp()
      });

      return messageToSave;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Helper method to enrich conversations with listing and user data
  private static async enrichConversations(conversations: FirestoreConversation[], userId: string): Promise<any[]> {
    try {
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          // Get listing data
          const listingRef = doc(db, 'listings', conv.listingId);
          const listingSnap = await getDoc(listingRef);
          const listing = listingSnap.exists() ? { id: listingSnap.id, ...listingSnap.data() } : null;

          // Get other user data
          const otherUserId = conv.buyerId === userId ? conv.sellerId : conv.buyerId;
          const profileRef = doc(db, 'profiles', otherUserId);
          const profileSnap = await getDoc(profileRef);
          const profile = profileSnap.exists() ? profileSnap.data() : null;

          // Get last message
          let lastMessage = null;
          if (conv.lastMessageId) {
            const messageRef = doc(db, this.messagesCollection, conv.lastMessageId);
            const messageSnap = await getDoc(messageRef);
            lastMessage = messageSnap.exists() ? { id: messageSnap.id, ...messageSnap.data() } : null;
          }

          return {
            id: conv.id,
            listingId: conv.listingId,
            listingTitle: listing?.title || 'Unknown Listing',
            listingImage: listing?.images?.[0] || '',
            otherUser: {
              id: otherUserId,
              name: profile?.username || 'Unknown User',
              avatar: profile?.profilePicture || '',
              isOnline: false, // This would need real-time implementation
            },
            lastMessage: lastMessage || {
              id: '',
              conversationId: conv.id,
              senderId: '',
              text: 'No messages yet',
              type: 'text',
              timestamp: conv.createdAt,
              status: 'sent',
            },
            unreadCount: 0, // This would need to be calculated
            updatedAt: conv.updatedAt,
          };
        })
      );

      return enrichedConversations;
    } catch (error) {
      console.error('Error enriching conversations:', error);
      return conversations.map(conv => ({
        id: conv.id,
        listingId: conv.listingId,
        listingTitle: 'Unknown Listing',
        listingImage: '',
        otherUser: {
          id: conv.buyerId === userId ? conv.sellerId : conv.buyerId,
          name: 'Unknown User',
          avatar: '',
          isOnline: false,
        },
        lastMessage: {
          id: '',
          conversationId: conv.id,
          senderId: '',
          text: 'No messages yet',
          type: 'text',
          timestamp: conv.createdAt,
          status: 'sent',
        },
        unreadCount: 0,
        updatedAt: conv.updatedAt,
      }));
    }
  }
}
