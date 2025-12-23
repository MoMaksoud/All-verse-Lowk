import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { apiClient } from '../../lib/api/client';
import { signOut, getCurrentUser, onAuthStateChange, getIdToken } from '../../lib/firebase/auth';
import ListingCard from '../../components/ListingCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EditProfileModal from '../../components/EditProfileModal';

const { width } = Dimensions.get('window');

interface Profile {
  userId: string;
  username?: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  email?: string;
  gender?: 'male' | 'female' | 'prefer-not-to-say';
  age?: number;
  phoneNumber?: string;
  interestCategories?: string[];
  userActivity?: 'browse-only' | 'buy-only' | 'sell-only' | 'both-buy-sell';
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  shoppingFrequency?: 'daily' | 'weekly' | 'monthly' | 'occasionally' | 'rarely';
  itemConditionPreference?: 'new-only' | 'second-hand-only' | 'both';
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition?: string;
  photos?: string[];
  sellerId?: string;
  sold?: boolean;
  inventory?: number;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    // Check authentication state
    const checkAuth = () => {
      const user = getCurrentUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      setIsAuthenticated(!!user);
      if (user) {
        fetchProfile();
      } else {
        // Clear profile when signed out
        setProfile(null);
        setListings([]);
        setError(null);
      }
    });

    // Fetch profile if authenticated
    if (getCurrentUser()) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const fetchProfile = async () => {
    // Don't fetch if not authenticated
    const currentUser = getCurrentUser();
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Check if we can get a token (force refresh to ensure it's valid)
      const token = await getIdToken(true);
      
      if (!token) {
        setError('Authentication failed. Please sign out and sign in again.');
        setLoading(false);
        return;
      }
      
      const response = await apiClient.get('/api/profile', true);
      const data = await response.json();
      
      if (response.ok) {
        if (data.data === null) {
          // Profile doesn't exist yet - this is expected for new users
          setProfile(null);
        } else {
          setProfile(data.data);
          if (data.data.listings) {
            setListings(data.data.listings);
          }
        }
      } else if (response.status === 400) {
        // Bad request - likely userId missing
        setError(data.error || data.message || 'Profile not found. Please try signing out and back in.');
      } else if (response.status === 401) {
        // Unauthorized - user is signed out
        setIsAuthenticated(false);
        setProfile(null);
        setListings([]);
      } else if (response.status === 404) {
        // Profile not found - expected for new users
        setProfile(null);
      } else {
        setError(data.message || data.error || 'Failed to load profile');
      }
    } catch (err: any) {
      // Only show error if user is authenticated
      if (getCurrentUser()) {
        setError(err?.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        // Clear local state
        setProfile(null);
        setListings([]);
        // Navigate to sign in
        router.replace('/auth/signin');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign out');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete(`/api/listings/${listingId}`, true);
              if (response.ok) {
                // Remove from local state
                setListings(listings.filter(l => l.id !== listingId));
                Alert.alert('Success', 'Listing deleted successfully');
              } else {
                const data = await response.json();
                Alert.alert('Error', data.message || 'Failed to delete listing');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete listing');
            }
          },
        },
      ]
    );
  };

  if (loading && isAuthenticated === null) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.signInPrompt}>
            <Ionicons name="person-circle-outline" size={80} color="#60a5fa" />
            <Text style={styles.signInTitle}>Sign In Required</Text>
            <Text style={styles.signInSubtitle}>
              Please sign in to view your profile and manage your listings
            </Text>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.push('/auth/signin')}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.signUpButton}
              onPress={() => router.push('/auth/signup')}
            >
              <Text style={styles.signUpButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#60a5fa"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Account</Text>
        </View>

        {/* Profile Card */}
        {profile ? (
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profile.profilePicture ? (
                  <Image
                    source={{
                      uri: profile.profilePicture,
                    }}
                    style={styles.avatar}
                    defaultSource={require('../../assets/icon.png')}
                  />
                ) : (
                  <Image
                    source={require('../../assets/icon.png')}
                    style={styles.avatar}
                  />
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{profile.displayName || profile.username || 'User'}</Text>
                {profile.username && (
                  <Text style={styles.username}>@{profile.username}</Text>
                )}
                {profile.bio && (
                  <Text style={styles.bio}>{profile.bio}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="create-outline" size={18} color="#60a5fa" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person-circle-outline" size={80} color="#60a5fa" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.name}>Welcome!</Text>
                <Text style={styles.email}>{getCurrentUser()?.email || ''}</Text>
                <Text style={styles.createProfileText}>
                  Complete your profile to get started
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.createProfileButton}
              onPress={() => setShowEditModal(true)}
            >
              <Text style={styles.createProfileButtonText}>Create Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Listings Section */}
        {listings.length > 0 && (
          <View style={styles.listingsSection}>
            <Text style={styles.sectionTitle}>My Listings</Text>
            <View style={styles.listingsGrid}>
              {listings.map((listing) => (
                <View key={listing.id} style={styles.listingWrapper}>
                  <ListingCard
                    id={listing.id}
                    title={listing.title}
                    description={listing.description}
                    price={listing.price}
                    category={listing.category}
                    condition={listing.condition}
                    imageUrl={listing.photos?.[0]}
                    sellerId={listing.sellerId}
                    sold={listing.sold}
                    inventory={listing.inventory}
                  />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteListing(listing.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {listings.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No listings yet</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/(tabs)/sell')}
            >
              <Text style={styles.createButtonText}>Create Your First Listing</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && isAuthenticated && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedProfile) => {
            setProfile(updatedProfile);
            setShowEditModal(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1b2e',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileCard: {
    backgroundColor: '#1a2332',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginTop: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    gap: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listingsSection: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  listingWrapper: {
    width: (width - 56) / 2,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
  },
  signInPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  signInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  signInSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  signUpButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
    color: '#60a5fa',
    marginBottom: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#60a5fa',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
  },
  createProfileButton: {
    backgroundColor: '#60a5fa',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createProfileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createProfileText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});
