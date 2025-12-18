import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api/client';
import ProfilePicture from '../../components/ProfilePicture';
import ListingCard from '../../components/ListingCard';
import LoadingSpinner from '../../components/LoadingSpinner';

interface UserProfile {
  username?: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  email?: string;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition?: string;
  photos?: string[];
  sold?: boolean;
  inventory?: number;
}

export default function ProfileScreen() {
  const { currentUser, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
      fetchMyListings();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/api/profile', true);
      const data = await response.json();

      // 404 is expected for new users without a profile yet
      if (response.status === 404) {
        setProfile(null);
        return;
      }

      if (response.ok && data.data) {
        setProfile(data.data);
      } else if (response.status !== 404) {
        console.error('Failed to fetch profile:', response.status);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    }
  };

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/my-listings', true);
      const data = await response.json();

      if (response.ok && data.data) {
        setListings(data.data);
      } else {
        console.error('Failed to fetch listings:', response.status, data);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    console.log('Sign out button pressed');
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Starting sign out process...');
              const { error } = await signOut();
              console.log('Sign out result:', { error });
              
              if (error) {
                console.error('Sign out failed:', error);
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              } else {
                console.log('Sign out successful, clearing state...');
                // Clear local state
                setProfile(null);
                setListings([]);
                // Navigate to sign in
                console.log('Navigating to sign in...');
                router.replace('/auth/signin');
              }
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'An unexpected error occurred while signing out.');
            }
          },
        },
      ]
    );
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name="person-circle-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyTitle}>Not Signed In</Text>
          <Text style={styles.emptyText}>
            Sign in to view your profile and manage your listings
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/auth/signin')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Profile Header */}
        <View style={styles.header}>
          <ProfilePicture
            src={profile?.profilePicture}
            name={profile?.displayName || profile?.username}
            email={currentUser.email || undefined}
            size="xl"
          />
          <Text style={styles.name}>
            {profile?.displayName || profile?.username || 'User'}
          </Text>
          {profile?.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          {profile?.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{listings.length}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {listings.filter(l => l.sold).length}
            </Text>
            <Text style={styles.statLabel}>Sold</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {listings.filter(l => !l.sold).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Coming Soon', 'Settings feature coming soon!')}
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionText, styles.signOutText]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* My Listings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Listings</Text>
          {listings.length > 0 ? (
            <View style={styles.listingsGrid}>
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  description={listing.description}
                  price={listing.price}
                  category={listing.category}
                  condition={listing.condition}
                  imageUrl={listing.photos?.[0]}
                  sold={listing.sold}
                  inventory={listing.inventory}
                  variant="grid"
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyListings}>
              <Ionicons name="cube-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyListingsText}>No listings yet</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/(tabs)/sell')}
              >
                <Text style={styles.createButtonText}>Create Listing</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  username: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  stats: {
    flexDirection: 'row',
    padding: 24,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#60a5fa',
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1220',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  signOutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  signOutText: {
    color: '#ef4444',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyListings: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListingsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
