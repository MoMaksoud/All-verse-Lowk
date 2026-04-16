import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { apiClient } from '../../lib/api/client';
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
}

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const favoritesCount = useFavoritesCount();

  useEffect(() => {
    fetchListings();
  }, []);

  // Refresh listings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [])
  );

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      // Match web hero: only ask for the 4 items we render in the grid.
      const response = await apiClient.get('/api/listings?limit=4');
      const data = await response.json();
      
      if (response.ok && data.data && Array.isArray(data.data)) {
        // Production API structure: { data: [...], pagination: {...} }
        setListings(data.data);
        setError(null);
      } else if (response.ok && Array.isArray(data.data?.items)) {
        // Alternative structure: { data: { items: [...] } }
        setListings(data.data.items);
        setError(null);
      } else {
        setError(`No listings found. Status: ${response.status}`);
      }
    } catch (err: any) {
      setError(`Error: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/(tabs)/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        {/* Header - Now part of scrollable content */}
        <View style={styles.scrollableHeader}>
          <View style={styles.headerContent}>
            <Image 
              source={logoSource} 
              style={styles.headerLogo}
              contentFit="contain"
            />
            <Text style={styles.headerTitle}>ALL VERSE GPT</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/(tabs)/favorites')}
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
              onPress={() => router.push('/(tabs)/cart')}
            >
              <Ionicons name="cart-outline" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={16} color={colors.brand.DEFAULT} />
            <Text style={styles.badgeText}>Universal AI Shopping Search</Text>
          </View>
          
          <Text style={styles.heroTitle}>Find Anything,{'\n'}Anywhere</Text>
          <Text style={styles.heroSubtitle}>
            One search. Every marketplace. AI-powered insights that help you buy smarter.
          </Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for electronics, fashion, home goods..."
                placeholderTextColor={colors.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={() => setImageSearchOpen(true)}
                style={styles.cameraButton}
                accessibilityLabel="Search with image"
              >
                <Ionicons name="camera-outline" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSearch}
                style={[styles.searchButton, !searchQuery.trim() && styles.searchButtonDisabled]}
                disabled={!searchQuery.trim()}
              >
                <Ionicons name="search" size={18} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Popular Searches */}
            <View style={styles.popularSearches}>
              <Text style={styles.popularLabel}>Popular:</Text>
              {POPULAR_SEARCHES.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.popularTag}
                  onPress={() => {
                    setSearchQuery(term);
                    router.push(`/(tabs)/search?q=${encodeURIComponent(term)}`);
                  }}
                >
                  <Text style={styles.popularTagText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Featured Listings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Featured Listings</Text>
              <Text style={styles.sectionSubtitle}>AI-recommended items for you</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.brand.DEFAULT} />
            </TouchableOpacity>
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {loading ? (
            <View style={styles.listingsGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={`skeleton-${i}`} />
              ))}
            </View>
          ) : listings.length > 0 ? (
            <View style={styles.listingsGrid}>
              {listings.slice(0, 4).map((listing) => (
                <ListingCard
                  key={listing.id}
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
                  variant="grid"
                />
              ))}
            </View>
          ) : !error && (
            <View style={styles.emptyState}>
              <Text style={styles.placeholderText}>No listings available</Text>
              <Text style={styles.emptyStateSubtext}>Pull down to refresh</Text>
            </View>
          )}
        </View>

        {/* AI-Powered Features — centered to mirror apps/web hero */}
        <View style={styles.section}>
          <View style={styles.featuresHeader}>
            <Text style={[styles.sectionTitle, styles.featuresTitle]}>AI-Powered Features</Text>
            <Text style={[styles.sectionSubtitle, styles.featuresSubtitle]}>
              Experience the future of marketplace interactions
            </Text>
          </View>

          <View style={styles.featuresGrid}>
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/(tabs)/messages')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="chatbubbles" size={24} color={colors.text.primary} />
              </View>
              <Text style={styles.featureTitle}>Smart Chat</Text>
              <Text style={styles.featureDescription}>AI-powered conversations with sellers</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/(tabs)/search')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="flash" size={24} color={colors.text.primary} />
              </View>
              <Text style={styles.featureTitle}>Smart Search</Text>
              <Text style={styles.featureDescription}>AI-powered search and discovery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/(tabs)/sell' as any)}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="bulb" size={24} color={colors.text.primary} />
              </View>
              <Text style={styles.featureTitle}>AI Pricing</Text>
              <Text style={styles.featureDescription}>AI-suggested fair prices</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/(tabs)/search')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="bag" size={24} color={colors.text.primary} />
              </View>
              <Text style={styles.featureTitle}>Smart Discovery</Text>
              <Text style={styles.featureDescription}>Find exactly what you need</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaCard}>
            <View style={styles.ctaLogoContainer}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={styles.ctaLogo}
                contentFit="contain"
              />
            </View>
            <Text style={styles.ctaTitle}>Ready to Start Selling?</Text>
            <Text style={styles.ctaSubtitle}>
              Turn your items into earnings with AI-assisted listing and pricing.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(tabs)/sell')}
            >
              <Text style={styles.ctaButtonText}>Start Selling</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/*
          Footer — mobile port of apps/web/src/app/page.tsx footer (lines
          280-346). Web uses a 3-column grid; we stack vertically to respect
          the narrow viewport. Contact email mirrors legal/contact.tsx.
        */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />

          {/* Contact */}
          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>CONTACT</Text>
            <TouchableOpacity
              style={styles.footerLinkRow}
              onPress={() => Linking.openURL('mailto:info@allversegpt.com')}
            >
              <Ionicons name="mail-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.footerLink}>info@allversegpt.com</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Links */}
          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>QUICK LINKS</Text>
            <TouchableOpacity onPress={() => router.push('/legal/about' as any)}>
              <Text style={styles.footerLink}>About</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/legal/privacy' as any)}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/legal/terms' as any)}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
          </View>

          {/* Resources */}
          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>RESOURCES</Text>
            <TouchableOpacity onPress={() => router.push('/legal/help' as any)}>
              <Text style={styles.footerLink}>Help Center</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/legal/faq' as any)}>
              <Text style={styles.footerLink}>FAQ</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/legal/contact' as any)}>
              <Text style={styles.footerLink}>Contact</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerDivider} />
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} All Verse GPT. All rights reserved.
          </Text>
        </View>
      </ScrollView>

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
    flex: 1,
    justifyContent: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    padding: spacing.lg,
    backgroundColor: colors.error.soft,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: typography.size.base,
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
