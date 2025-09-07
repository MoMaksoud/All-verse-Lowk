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

// Profile interface
export interface FirestoreProfile {
  userId: string;
  bio?: string;
  location?: string;
  rating?: number;
  profilePictureUrl?: string;
  createdAt?: any;
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
      const profileRef = doc(db, this.collectionName, userId);
      const existingProfile = await this.getProfile(userId);
      
      const profileToSave: FirestoreProfile = {
        userId,
        ...existingProfile,
        ...profileData,
        updatedAt: serverTimestamp(),
        ...(existingProfile ? {} : { createdAt: serverTimestamp() })
      };
      
      await setDoc(profileRef, profileToSave, { merge: true });
      
      return profileToSave;
    } catch (error) {
      console.error('Error saving profile:', error);
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
      })) as FirestoreProfile[];
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
