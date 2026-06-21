import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../lib/ui/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../contexts/AuthContext';
import ProfilePicture from '../../components/ProfilePicture';
import ListingCard from '../../components/ListingCard';
import LoadingSpinner from '../../components/LoadingSpinner';

interface SellerProfile {
  userId: string;
  username?: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  createdAt?: string;
  interestCategories?: string[];
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

export default function SellerProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagingLoading, setMessagingLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, listingsRes] = await Promise.all([
        apiClient.get(`/api/profile?userId=${userId}`),
        apiClient.get(`/api/listings?sellerId=${userId}&limit=30`),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.data || null);
      }

      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      Alert.alert('Error', 'Failed to load seller profile');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to message sellers');
      router.push('/auth/signin');
      return;
    }
    if (!userId) return;

    try {
      setMessagingLoading(true);
      const response = await apiClient.post('/api/chats', { otherUserId: userId }, true);
      if (!response.ok) throw new Error('Failed to start chat');
      const data = await response.json();
      const chatId = data.chatId || data.id;
      if (!chatId) throw new Error('Chat ID missing');
      router.push(`/chat/${chatId}` as any);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to start conversation');
    } finally {
      setMessagingLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading profile..." />;

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Ionicons name="person-outline" size={64} color={colors.text.muted} />
          <Text style={styles.notFoundText}>Seller not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUser?.uid === userId;
  const memberYear = profile.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : new Date().getFullYear();
  const activeListings = listings.filter((l) => !l.sold && (l.inventory ?? 1) > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Back button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>

            {/* Profile header */}
            <View style={styles.header}>
              <ProfilePicture
                src={profile.profilePicture}
                name={profile.username || profile.displayName}
                size="xl"
              />
              <Text style={styles.username}>
                {profile.username || profile.displayName || 'Seller'}
              </Text>
              {profile.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : null}

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{activeListings.length}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{listings.filter(l => l.sold).length}</Text>
                  <Text style={styles.statLabel}>Sold</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{memberYear}</Text>
                  <Text style={styles.statLabel}>Joined</Text>
                </View>
              </View>

              {!isOwnProfile && (
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={handleMessage}
                  disabled={messagingLoading}
                >
                  {messagingLoading ? (
                    <ActivityIndicator size="small" color={colors.text.primary} />
                  ) : (
                    <>
                      <Ionicons name="chatbubble-outline" size={18} color={colors.text.primary} />
                      <Text style={styles.messageButtonText}>Message Seller</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Section label */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>LISTINGS</Text>
              <Text style={styles.sectionCount}>{listings.length}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            id={item.id}
            title={item.title}
            description={item.description}
            price={item.price}
            category={item.category}
            condition={item.condition}
            imageUrl={item.photos?.[0] || null}
            sellerId={item.sellerId || ''}
            sold={(item.sold ?? false) || (item.inventory ?? 1) === 0}
            inventory={item.inventory ?? 1}
            variant="grid"
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={48} color={colors.text.muted} />
            <Text style={styles.emptyText}>No listings yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 14,
    marginBottom: 6,
  },
  bio: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 280,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  statLabel: { fontSize: 11, color: colors.text.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border.subtle },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  messageButtonText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 1.5,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.DEFAULT,
  },
  row: { paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  listContent: { paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15, color: colors.text.muted },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: colors.text.muted },
});
