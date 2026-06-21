import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { apiClient } from '../../lib/api/client';
import { getCache, setCache } from '../../lib/cache';
import ListingCard from '../../components/ListingCard';
import SkeletonCard from '../../components/SkeletonCard';
import ImageSearchModal from '../../components/ImageSearchModal';
import { getPopularSearches } from '../../lib/searchAnalytics';
import { useFavoritesCount } from '../../hooks/useFavoritesCount';
import { colors, spacing, radii, typography, palette } from '../../constants/theme';

// Trending queries from the shared search-analytics util. Mirrors web hero.
const POPULAR_SEARCHES = getPopularSearches(4).map((q) => q.query);

const logoSource = require('../../assets/icon.png');

const { width } = Dimensions.get('window');

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
  sellerProfile?: { username?: string; profilePicture?: string } | null;
}

const PAGE_SIZE = 20;

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const favoritesCount = useFavoritesCount();
  const pageRef = useRef(1);

  // Load a page of listings. mode: 'initial' (show skeletons), 'refresh'
  // (pull-to-refresh), 'more' (append next page), 'silent' (background refresh).
  const fetchPage = useCallback(async (pageNum: number, mode: 'initial' | 'refresh' | 'more' | 'silent') => {
    try {
      if (mode === 'initial') { setLoading(true); setError(false); }
      if (mode === 'more') setLoadingMore(true);

      const response = await apiClient.get(`/api/listings?page=${pageNum}&limit=${PAGE_SIZE}&sort=newest`);
      const data = await response.json();
      const items: Listing[] = Array.isArray(data?.data) ? data.data : [];

      if (response.ok) {
        setHasMore(!!data?.pagination?.hasMore);
        pageRef.current = pageNum;
        setListings((prev) => (mode === 'more' ? [...prev, ...items] : items));
        if (mode !== 'more') setCache('home_listings', items);
        setError(false);
      } else if (mode !== 'more' && mode !== 'silent') {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching home listings:', err);
      if (mode !== 'more' && mode !== 'silent') setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const cached = getCache<Listing[]>('home_listings', 60_000);
    if (cached && cached.length > 0) {
      setListings(cached);
      setLoading(false);
      fetchPage(1, 'silent');
    } else {
      fetchPage(1, 'initial');
    }
  }, [fetchPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, 'refresh');
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    fetchPage(pageRef.current + 1, 'more');
  }, [loading, loadingMore, refreshing, hasMore, fetchPage]);


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Pinned header: brand + search */}
      <View style={styles.pinnedHeader}>
        <View style={styles.scrollableHeader}>
          <View style={styles.headerContent}>
            <Image source={logoSource} style={styles.headerLogo} contentFit="contain" />
            <Text style={styles.headerTitle}>ALL VERSE</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/favorites' as any)}
              accessibilityLabel="Favorites"
            >
              <Ionicons name="heart-outline" size={24} color={colors.text.primary} />
              {favoritesCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {favoritesCount > 99 ? '99+' : favoritesCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/cart' as any)}
              accessibilityLabel="Cart"
            >
              <Ionicons name="cart-outline" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBarPinned}>
          <View style={styles.searchBar}>
            <TouchableOpacity
              style={styles.searchPillMain}
              onPress={() => router.push('/(tabs)/search' as any)}
              activeOpacity={0.7}
              accessibilityRole="search"
              accessibilityLabel="Search AllVerse and the web"
            >
              <Ionicons name="search" size={20} color={colors.text.tertiary} />
              <Text style={styles.searchPillText}>Search AllVerse &amp; the web</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setImageSearchOpen(true)}
              style={styles.cameraButton}
              accessibilityLabel="Search with image"
            >
              <Ionicons name="camera-outline" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Feed */}
      {loading && listings.length === 0 ? (
        <View style={styles.listContent}>
          <View style={styles.listingsGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={`skeleton-${i}`} />
            ))}
          </View>
        </View>
      ) : error && listings.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.text.muted} />
          <Text style={styles.errorTitle}>We couldn&apos;t load listings right now.</Text>
          <Text style={styles.errorSubtext}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchPage(1, 'initial')}>
            <Ionicons name="refresh" size={16} color={colors.text.primary} />
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.DEFAULT} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View style={styles.feedHeader}>
              <View style={styles.popularSearches}>
                <Text style={styles.popularLabel}>Popular:</Text>
                {POPULAR_SEARCHES.map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={styles.popularTag}
                    onPress={() => router.push(`/(tabs)/search?q=${encodeURIComponent(term)}` as any)}
                  >
                    <Text style={styles.popularTagText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.feedLabel}>Fresh listings</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={48} color={colors.text.muted} />
              <Text style={styles.placeholderText}>No listings yet</Text>
              <Text style={styles.emptyStateSubtext}>Pull down to refresh, or be the first to sell.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreFooter}>
                <ActivityIndicator color={colors.brand.DEFAULT} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ListingCard
              id={item.id}
              title={item.title}
              description={item.description}
              price={item.price}
              category={item.category}
              condition={item.condition}
              imageUrl={item.photos?.[0]}
              sellerId={item.sellerId}
              sellerName={item.sellerProfile?.username}
              sellerAvatar={item.sellerProfile?.profilePicture}
              sold={item.sold}
              inventory={item.inventory}
              variant="grid"
            />
          )}
        />
      )}

      {/* Image search modal (camera / library) */}
      <ImageSearchModal
        isOpen={imageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  pinnedHeader: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.bg.base,
  },
  searchBarPinned: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  searchPillMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchPillText: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.muted,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  feedHeader: {
    marginBottom: spacing.xs,
  },
  feedLabel: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  loadMoreFooter: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  scrollableHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.bg.glassHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.error.DEFAULT,
    borderWidth: 2,
    borderColor: colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    lineHeight: 12,
  },
  aiAssistantCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.lg,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  aiAssistantIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.brand.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAssistantTextWrap: {
    flex: 1,
  },
  aiAssistantTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  aiAssistantSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
    marginTop: 1,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.wide,
  },
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.wide,
  },
  heroSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.softer,
    borderWidth: 1,
    borderColor: colors.info.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.lg,
    gap: spacing.xs + 2,
  },
  badgeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.brand.DEFAULT,
  },
  heroTitle: {
    fontSize: typography.size['7xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 44,
  },
  heroSubtitle: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  searchContainer: {
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.glassHover,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderWidth: 2,
    borderColor: colors.border.strong,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: typography.size.lg,
    color: colors.text.primary,
  },
  cameraButton: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.bg.glass,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  searchButton: {
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    marginLeft: spacing.sm,
  },
  searchButtonDisabled: {
    backgroundColor: palette.gray[600],
    opacity: 0.5,
  },
  popularSearches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  popularLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  popularTag: {
    backgroundColor: colors.bg.glass,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  popularTagText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing['3xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewAllText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.brand.DEFAULT,
  },
  errorContainer: {
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorTitle: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.sm,
  },
  errorSubtext: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    marginBottom: spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    marginTop: spacing.xs,
  },
  retryButtonText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  emptyState: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: typography.size.base,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: typography.size.sm,
    color: colors.text.disabled,
  },
  featuresHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featuresTitle: {
    textAlign: 'center',
    marginBottom: spacing.xs + 2,
  },
  featuresSubtitle: {
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  featureCard: {
    width: (width - 52) / 2,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  ctaSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  ctaCard: {
    backgroundColor: colors.bg.glass,
    borderRadius: radii['2xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  ctaLogoContainer: {
    backgroundColor: colors.bg.glassHover,
    borderRadius: radii.full,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  ctaLogo: {
    width: 24,
    height: 24,
  },
  ctaTitle: {
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: radii.lg,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
  },
  ctaButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  footerDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.lg,
  },
  footerSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  footerHeading: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing.xs,
  },
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerLink: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    paddingVertical: spacing.xs,
  },
  footerCopyright: {
    fontSize: typography.size.xs,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
