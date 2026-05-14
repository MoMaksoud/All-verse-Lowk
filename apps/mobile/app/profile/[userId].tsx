import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette } from '../../constants/theme';
import { apiClient } from '../../lib/api/client';
import ListingCard from '../../components/ListingCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProfilePicture from '../../components/ProfilePicture';

const { width } = Dimensions.get('window');

interface PublicProfile {
  userId?: string;
  id?: string;
  username?: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  createdAt?: string;
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

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const buildFallbackProfile = (userId: string): PublicProfile => ({
  userId,
  username: 'Marketplace User',
});

const getErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    return data?.message || data?.error || fallback;
  } catch {
    return fallback;
  }
};

const formatMemberSince = (createdAt?: string) => {
  if (!createdAt) return '';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

export default function PublicProfileScreen() {
  const { userId: userIdParam } = useLocalSearchParams<{ userId?: string | string[] }>();
  const userId = useMemo(() => {
    const value = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
    return typeof value === 'string' ? value.trim() : '';
  }, [userIdParam]);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async (showLoading = true) => {
    if (!userId) {
      setProfile(null);
      setListings([]);
      setError('Seller profile is unavailable.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const encodedUserId = encodeURIComponent(userId);
      const [profileResponse, listingsResponse] = await Promise.all([
        apiClient.get(`/api/profile?userId=${encodedUserId}`, false),
        apiClient.get(`/api/listings?sellerId=${encodedUserId}&limit=100`, false),
      ]);

      if (profileResponse.ok) {
        const profileData = await profileResponse.json().catch(() => ({}));
        setProfile(profileData?.data ? { userId, ...profileData.data } : buildFallbackProfile(userId));
      } else if (profileResponse.status === 404) {
        setProfile(buildFallbackProfile(userId));
      } else {
        const message = await getErrorMessage(profileResponse, 'Failed to load seller profile.');
        throw new Error(message);
      }

      if (listingsResponse.ok) {
        const listingsData = await listingsResponse.json().catch(() => ({}));
        setListings(Array.isArray(listingsData?.data) ? listingsData.data : []);
      } else {
        const message = await getErrorMessage(listingsResponse, 'Failed to load seller listings.');
        throw new Error(message);
      }
    } catch (err: any) {
      setProfile(buildFallbackProfile(userId));
      setListings([]);
      setError(err?.message || 'Failed to load seller profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfileData(false);
  }, [fetchProfileData]);

  if (loading) {
    return <LoadingSpinner message="Loading seller profile..." />;
  }

  const displayProfile = profile || (userId ? buildFallbackProfile(userId) : null);
  const displayName = displayProfile?.displayName || displayProfile?.username || 'Marketplace User';
  const memberSince = formatMemberSince(displayProfile?.createdAt);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.DEFAULT}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <ProfilePicture
              src={displayProfile?.profilePicture}
              name={displayName}
              size="xl"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{displayName}</Text>
              {displayProfile?.username && displayProfile.username !== 'Marketplace User' && (
                <Text style={styles.username}>@{displayProfile.username}</Text>
              )}
              {memberSince && (
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.text.muted} />
                  <Text style={styles.metaText}>Member since {memberSince}</Text>
                </View>
              )}
            </View>
          </View>

          {displayProfile?.bio && (
            <Text style={styles.bio}>{displayProfile.bio}</Text>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchProfileData()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.listingsSection}>
          <Text style={styles.sectionTitle}>Listings ({listings.length})</Text>
          {listings.length > 0 ? (
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
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={40} color={colors.text.muted} />
              <Text style={styles.emptyText}>No listings found.</Text>
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
    backgroundColor: colors.bg.base,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: colors.bg.surface,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    color: colors.text.muted,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  bio: {
    fontSize: 15,
    color: colors.text.tertiary,
    lineHeight: 22,
    marginTop: 16,
  },
  errorContainer: {
    backgroundColor: colors.error.soft,
    borderColor: colors.error.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
  },
  errorText: {
    color: colors.error.text,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'center',
    backgroundColor: colors.error.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  listingsSection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
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
  },
  emptyState: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 15,
    textAlign: 'center',
  },
});
