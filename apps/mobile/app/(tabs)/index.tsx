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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { apiClient } from '../../lib/api/client';
import ListingCard from '../../components/ListingCard';
import LoadingSpinner from '../../components/LoadingSpinner';

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
      const response = await apiClient.get('/api/listings');
      const data = await response.json();
      
      if (response.ok && data.data && Array.isArray(data.data)) {
        // Production API structure: { data: [...], pagination: {...} }
        setListings(data.data);
        setError(null);
      } else if (response.ok && data.data?.items) {
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

  if (loading) {
    return <LoadingSpinner message="Loading listings..." />;
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
              <Ionicons name="heart-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/(tabs)/cart')}
            >
              <Ionicons name="cart-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={16} color="#60a5fa" />
            <Text style={styles.badgeText}>Universal AI Shopping Search</Text>
          </View>
          
          <Text style={styles.heroTitle}>Find Anything,{'\n'}Anywhere</Text>
          <Text style={styles.heroSubtitle}>
            One search. Every marketplace. AI-powered insights that help you buy smarter.
          </Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for electronics, fashion, home goods..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity 
                onPress={handleSearch}
                style={[styles.searchButton, !searchQuery.trim() && styles.searchButtonDisabled]}
                disabled={!searchQuery.trim()}
              >
                <Ionicons name="search" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Popular Searches */}
            <View style={styles.popularSearches}>
              <Text style={styles.popularLabel}>Popular:</Text>
              {['iPhone 14', 'Nike Shoes', 'MacBook', 'Gaming Chair'].map((term) => (
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
              <Ionicons name="arrow-forward" size={16} color="#60a5fa" />
            </TouchableOpacity>
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {listings.length > 0 ? (
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

        {/* AI-Powered Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-Powered Features</Text>
          <Text style={styles.sectionSubtitle}>Experience the future of marketplace interactions</Text>
          
          <View style={styles.featuresGrid}>
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/(tabs)/messages')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="chatbubbles" size={24} color="#fff" />
              </View>
              <Text style={styles.featureTitle}>Smart Chat</Text>
              <Text style={styles.featureDescription}>AI-powered conversations with sellers</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/(tabs)/search')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="flash" size={24} color="#fff" />
              </View>
              <Text style={styles.featureTitle}>Smart Search</Text>
              <Text style={styles.featureDescription}>AI-powered search and discovery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/(tabs)/sell' as any)}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="bulb" size={24} color="#fff" />
              </View>
              <Text style={styles.featureTitle}>AI Pricing</Text>
              <Text style={styles.featureDescription}>AI-suggested fair prices</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/(tabs)/search')}
            >
              <View style={styles.featureIcon}>
                <Ionicons name="bag" size={24} color="#fff" />
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
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1b2e',
  },
  scrollContent: {
    paddingBottom: 10,
    paddingTop: 10,
  },
  scrollableHeader: {
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 8,
    paddingHorizontal: 20,
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60a5fa',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 44,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  searchContainer: {
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
  },
  searchButton: {
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    padding: 10,
    marginLeft: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#4b5563',
    opacity: 0.5,
  },
  popularSearches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  popularLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  popularTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  popularTagText: {
    fontSize: 12,
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60a5fa',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  featureCard: {
    width: (width - 52) / 2,
    backgroundColor: '#0B1220',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 16,
  },
  ctaSection: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 32,
  },
  ctaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ctaLogoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ctaLogo: {
    width: 24,
    height: 24,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
