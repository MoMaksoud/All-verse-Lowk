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
      
      // Create a simple profile object with required fields
      const profileToSave: FirestoreProfile = {
        userId,
        username: profileData.username || '',
        bio: profileData.bio,
        createdAt: profileData.createdAt || new Date().toISOString(),
        gender: profileData.gender,
        age: profileData.age,
        location: profileData.location,
        profilePicture: profileData.profilePicture,
        phoneNumber: profileData.phoneNumber,
        rating: profileData.rating || 0,
        interestCategories: profileData.interestCategories || [],
        userActivity: profileData.userActivity || 'both-buy-sell',
        budget: profileData.budget,
        shoppingFrequency: profileData.shoppingFrequency,
        itemConditionPreference: profileData.itemConditionPreference || 'both',
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
