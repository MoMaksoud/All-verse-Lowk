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

import { db, isFirebaseConfigured } from './firebase';

// Profile interface - updated to match new comprehensive profile schema
export interface FirestoreProfile {
  userId: string;
  username: string;
  bio?: string;
  createdAt: any;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  age?: number;
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
  // Stripe Connect for seller payouts
  stripeConnectAccountId?: string;
  stripeConnectOnboardingComplete?: boolean;
}

// Firestore service for profiles
export class ProfileService {
  private static collectionName = 'profiles';

  // Get user profile
  static async getProfile(userId: string): Promise<FirestoreProfile | null> {
    try {
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database not initialized or Firebase not configured');
      }
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
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database not initialized or Firebase not configured');
      }
      
      const profileRef = doc(db, this.collectionName, userId);
      
      // Check if profile already exists
      const existingProfile = await this.getProfile(userId);
      
      // Merge: start with existing profile, then override with provided values
      // Use nullish coalescing (??) to only fall back when value is undefined/null
      // This ensures falsy values (empty strings, 0, empty arrays) are saved
      const profileToSave: any = {
        userId,
        username: profileData.username ?? existingProfile?.username ?? '',
        bio: profileData.bio ?? existingProfile?.bio ?? '',
        createdAt: existingProfile?.createdAt ?? serverTimestamp(),
        rating: profileData.rating ?? existingProfile?.rating ?? 0,
        interestCategories: profileData.interestCategories ?? existingProfile?.interestCategories ?? [],
        userActivity: profileData.userActivity ?? existingProfile?.userActivity ?? 'both-buy-sell',
        itemConditionPreference: profileData.itemConditionPreference ?? existingProfile?.itemConditionPreference ?? 'both',
        updatedAt: serverTimestamp(),
      };
      
      // Only include optional fields if they have values (not undefined)
      if (profileData.gender !== undefined || existingProfile?.gender !== undefined) {
        profileToSave.gender = profileData.gender ?? existingProfile?.gender;
      }
      if (profileData.age !== undefined || existingProfile?.age !== undefined) {
        profileToSave.age = profileData.age ?? existingProfile?.age;
      }
      if (profileData.profilePicture !== undefined || existingProfile?.profilePicture) {
        profileToSave.profilePicture = profileData.profilePicture ?? existingProfile?.profilePicture ?? '';
      }
      if (profileData.phoneNumber !== undefined || existingProfile?.phoneNumber) {
        profileToSave.phoneNumber = profileData.phoneNumber ?? existingProfile?.phoneNumber ?? '';
      }
      if (profileData.budget !== undefined || existingProfile?.budget) {
        const budget = profileData.budget ?? existingProfile?.budget;
        if (budget) {
          // Clean budget object - remove undefined properties
          const cleanBudget: any = {};
          if (budget.min !== undefined && budget.min !== null) cleanBudget.min = budget.min;
          if (budget.max !== undefined && budget.max !== null) cleanBudget.max = budget.max;
          if (budget.currency) cleanBudget.currency = budget.currency;
          if (Object.keys(cleanBudget).length > 0) {
            profileToSave.budget = cleanBudget;
          }
        }
      }
      if (profileData.shoppingFrequency !== undefined || existingProfile?.shoppingFrequency !== undefined) {
        profileToSave.shoppingFrequency = profileData.shoppingFrequency ?? existingProfile?.shoppingFrequency;
      }
      if (profileData.stripeConnectAccountId !== undefined || existingProfile?.stripeConnectAccountId) {
        profileToSave.stripeConnectAccountId = profileData.stripeConnectAccountId ?? existingProfile?.stripeConnectAccountId;
      }
      if (profileData.stripeConnectOnboardingComplete !== undefined || existingProfile?.stripeConnectOnboardingComplete !== undefined) {
        profileToSave.stripeConnectOnboardingComplete = profileData.stripeConnectOnboardingComplete ?? existingProfile?.stripeConnectOnboardingComplete;
      }
      
      // Remove any undefined values before saving (Firestore doesn't accept undefined)
      const cleanedProfile: any = {};
      Object.keys(profileToSave).forEach(key => {
        if (profileToSave[key] !== undefined) {
          cleanedProfile[key] = profileToSave[key];
        }
      });
      
      await setDoc(profileRef, cleanedProfile, { merge: true });
      
      // Fetch and return the saved profile (to get actual timestamps)
      const savedProfile = await this.getProfile(userId);
      if (!savedProfile) {
        throw new Error('Failed to retrieve saved profile');
      }
      return savedProfile;
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
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database not initialized or Firebase not configured');
      }
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
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database not initialized or Firebase not configured');
      }
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
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database not initialized or Firebase not configured');
      }
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
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database not initialized or Firebase not configured');
      }
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
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database not initialized or Firebase not configured');
      }
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
      if (!db || !isFirebaseConfigured()) {
        throw new Error('Database not initialized or Firebase not configured');
      }
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

