import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../lib/api/client';
import ListingCard from '../../components/ListingCard';
import LoadingSpinner from '../../components/LoadingSpinner';

interface SearchResult {
  internal: InternalListing[];
  external: ExternalListing[];
}

interface InternalListing {
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

interface ExternalListing {
  title: string;
  price: number;
  source: string;
  url: string;
  image?: string;
  rating?: number;
  reviewsCount?: number;
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.q) {
      performSearch(params.q);
    }
  }, [params.q]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      const response = await apiClient.get(
        `/api/universal-search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (response.ok && data) {
        setResults({
          internal: data.internalResults || [],
          external: data.externalResults || [],
        });
      } else {
        console.error('Search failed:', response.status);
      }
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search across all marketplaces..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <LoadingSpinner message="Searching..." />
      ) : results ? (
        <ScrollView style={styles.results}>
          {/* Internal Results */}
          {results.internal && results.internal.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>AllVerse GPT Marketplace</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>AVGPT</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                {results.internal.length} result{results.internal.length !== 1 ? 's' : ''}
              </Text>
              <View style={styles.listingsGrid}>
                {results.internal.map((listing) => (
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
            </View>
          )}

          {/* External Results */}
          {results.external && results.external.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>From Other Marketplaces</Text>
              <Text style={styles.sectionSubtitle}>
                {results.external.length} result{results.external.length !== 1 ? 's' : ''}
              </Text>
              {results.external.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.externalCard}
                  onPress={async () => {
                    try {
                      const supported = await Linking.canOpenURL(item.url);
                      if (supported) {
                        await Linking.openURL(item.url);
                      } else {
                        Alert.alert('Error', `Cannot open URL: ${item.url}`);
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to open link');
                    }
                  }}
                >
                  {item.image && (
                    <Image 
                      source={{ uri: item.image }} 
                      style={styles.externalImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.externalContent}>
                    <Text style={styles.externalTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.externalMeta}>
                      <Text style={styles.externalPrice}>${item.price.toLocaleString()}</Text>
                      {item.rating && (
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={14} color="#fbbf24" />
                          <Text style={styles.ratingText}>{item.rating}</Text>
                          {item.reviewsCount && (
                            <Text style={styles.reviewsText}>({item.reviewsCount})</Text>
                          )}
                        </View>
                      )}
                    </View>
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceText}>{item.source}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* No Results */}
          {(!results.internal || results.internal.length === 0) &&
            (!results.external || results.external.length === 0) && (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.noResultsText}>No results found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try different keywords or browse categories
                </Text>
              </View>
            )}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyText}>Search across all marketplaces</Text>
          <Text style={styles.emptySubtext}>
            One search. Every marketplace. AI-powered insights.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1220',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
  },
  results: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  externalCard: {
    backgroundColor: '#0B1220',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  externalImage: {
    width: 100,
    height: 100,
    backgroundColor: '#0E1526',
  },
  externalContent: {
    flex: 1,
    padding: 12,
    position: 'relative',
  },
  externalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  externalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  externalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#60a5fa',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60a5fa',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    textAlign: 'center',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    textAlign: 'center',
  },
});
