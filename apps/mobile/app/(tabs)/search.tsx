import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

// Flat item types for virtualized search results and browse grid.
// Pairing listings into rows avoids allocating all handles in one GC scope.
type SearchFlatItem =
  | { kind: 'internal-header'; count: number }
  | { kind: 'internal-row'; left: InternalListing; right: InternalListing | null; rowIndex: number }
  | { kind: 'external-header'; count: number }
  | { kind: 'external-item'; item: ExternalListing; itemIndex: number }
  | { kind: 'no-results' };

type BrowseFlatItem =
  | { kind: 'browse-header'; count: number }
  | { kind: 'listing-row'; left: Listing; right: Listing | null; rowIndex: number };

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  useEffect(() => {
    loadRecentSearches();
    if (params.q) {
      performSearch(params.q);
    } else {
      fetchListings();
    }
  }, [params.q]);

  // Refresh listings when screen comes into focus (if no search query)
  useFocusEffect(
    useCallback(() => {
      if (!params.q && !searchQuery.trim()) {
        fetchListings();
      }
    }, [params.q, searchQuery])
  );

  useEffect(() => {
    if (searchQuery.length === 0) {
      setShowRecentSearches(true);
    } else {
      setShowRecentSearches(false);
    }
  }, [searchQuery]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const arr = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
        setRecentSearches(arr);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
      setRecentSearches([]);
    }
  };

  const saveRecentSearch = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      let searches: string[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          searches = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
        } catch {
          searches = [];
        }
      }
      
      // Remove if already exists
      searches = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
      
      // Add to beginning
      searches.unshift(query);
      
      // Limit to MAX_RECENT_SEARCHES
      searches = searches.slice(0, MAX_RECENT_SEARCHES);
      
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  const fetchListings = async () => {
    try {
      setListingsLoading(true);
      const response = await apiClient.get('/api/listings?limit=50');
      const data = await response.json();

      if (response.ok && data.data && Array.isArray(data.data)) {
        setListings(data.data.slice(0, 50));
      } else if (response.ok && data.data?.items) {
        setListings(data.data.items.slice(0, 50));
      } else if (response.ok && Array.isArray(data)) {
        setListings(data.slice(0, 50));
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setListingsLoading(false);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setResults(null);
      await saveRecentSearch(query);
      
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
      setShowRecentSearches(false);
    }
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
    performSearch(query);
    setShowRecentSearches(false);
  };

  // Build flat data arrays so FlatList virtualizes rendering instead of
  // allocating all JS handles at once in a single GC scope via .map().
  const searchFlatData = useMemo<SearchFlatItem[]>(() => {
    if (!results) return [];
    const items: SearchFlatItem[] = [];
    if (results.internal.length > 0) {
      items.push({ kind: 'internal-header', count: results.internal.length });
      for (let i = 0; i < results.internal.length; i += 2) {
        items.push({ kind: 'internal-row', left: results.internal[i], right: results.internal[i + 1] ?? null, rowIndex: i });
      }
    }
    if (results.external.length > 0) {
      items.push({ kind: 'external-header', count: results.external.length });
      results.external.forEach((item, itemIndex) => {
        items.push({ kind: 'external-item', item, itemIndex });
      });
    }
    if (results.internal.length === 0 && results.external.length === 0) {
      items.push({ kind: 'no-results' });
    }
    return items;
  }, [results]);

  const browseFlatData = useMemo<BrowseFlatItem[]>(() => {
    if (listings.length === 0) return [];
    const items: BrowseFlatItem[] = [{ kind: 'browse-header', count: listings.length }];
    for (let i = 0; i < listings.length; i += 2) {
      items.push({ kind: 'listing-row', left: listings[i], right: listings[i + 1] ?? null, rowIndex: i });
    }
    return items;
  }, [listings]);

  const renderSearchItem = useCallback(({ item }: { item: SearchFlatItem }) => {
    if (item.kind === 'internal-header') {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AllVerse GPT Marketplace</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>AVGPT</Text></View>
          </View>
          <Text style={styles.sectionSubtitle}>{item.count} result{item.count !== 1 ? 's' : ''}</Text>
        </View>
      );
    }
    if (item.kind === 'internal-row') {
      return (
        <View style={styles.listingsGridRow}>
          <ListingCard
            id={item.left.id} title={item.left.title} description={item.left.description}
            price={item.left.price} category={item.left.category} condition={item.left.condition}
            imageUrl={item.left.photos?.[0]} sellerId={item.left.sellerId}
            sold={(item.left.sold ?? false) || item.left.inventory === 0}
            inventory={item.left.inventory} variant="grid"
          />
          {item.right ? (
            <ListingCard
              id={item.right.id} title={item.right.title} description={item.right.description}
              price={item.right.price} category={item.right.category} condition={item.right.condition}
              imageUrl={item.right.photos?.[0]} sellerId={item.right.sellerId}
              sold={(item.right.sold ?? false) || item.right.inventory === 0}
              inventory={item.right.inventory} variant="grid"
            />
          ) : (
            <View style={styles.gridPlaceholder} />
          )}
        </View>
      );
    }
    if (item.kind === 'external-header') {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From Other Marketplaces</Text>
          <Text style={styles.sectionSubtitle}>{item.count} result{item.count !== 1 ? 's' : ''}</Text>
        </View>
      );
    }
    if (item.kind === 'external-item') {
      return (
        <View style={styles.externalItemWrapper}>
          <TouchableOpacity
            style={styles.externalCard}
            onPress={async () => {
              try {
                const supported = await Linking.canOpenURL(item.item.url);
                if (supported) {
                  await Linking.openURL(item.item.url);
                } else {
                  Alert.alert('Error', `Cannot open URL: ${item.item.url}`);
                }
              } catch {
                Alert.alert('Error', 'Failed to open link');
              }
            }}
          >
            {item.item.image && (
              <Image source={{ uri: item.item.image }} style={styles.externalImage} resizeMode="cover" />
            )}
            <View style={styles.externalContent}>
              <Text style={styles.externalTitle} numberOfLines={2}>{item.item.title}</Text>
              <View style={styles.externalMeta}>
                <Text style={styles.externalPrice}>${item.item.price.toLocaleString()}</Text>
                {item.item.rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color="#fbbf24" />
                    <Text style={styles.ratingText}>{item.item.rating}</Text>
                    {item.item.reviewsCount && (
                      <Text style={styles.reviewsText}>({item.item.reviewsCount})</Text>
                    )}
                  </View>
                )}
              </View>
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceText}>{item.item.source}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    if (item.kind === 'no-results') {
      return (
        <View style={styles.noResults}>
          <Ionicons name="search-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.noResultsText}>No results found</Text>
          <Text style={styles.noResultsSubtext}>Try different keywords or browse categories</Text>
        </View>
      );
    }
    return null;
  }, []);

  const renderBrowseItem = useCallback(({ item }: { item: BrowseFlatItem }) => {
    if (item.kind === 'browse-header') {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AllVerse GPT Marketplace</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>AVGPT</Text></View>
          </View>
          <Text style={styles.sectionSubtitle}>{item.count} listing{item.count !== 1 ? 's' : ''} available</Text>
        </View>
      );
    }
    if (item.kind === 'listing-row') {
      return (
        <View style={styles.listingsGridRow}>
          <ListingCard
            id={item.left.id} title={item.left.title} description={item.left.description}
            price={item.left.price} category={item.left.category} condition={item.left.condition}
            imageUrl={item.left.photos?.[0]} sellerId={item.left.sellerId}
            sold={(item.left.sold ?? false) || item.left.inventory === 0}
            inventory={item.left.inventory} variant="grid"
          />
          {item.right ? (
            <ListingCard
              id={item.right.id} title={item.right.title} description={item.right.description}
              price={item.right.price} category={item.right.category} condition={item.right.condition}
              imageUrl={item.right.photos?.[0]} sellerId={item.right.sellerId}
              sold={(item.right.sold ?? false) || item.right.inventory === 0}
              inventory={item.right.inventory} variant="grid"
            />
          ) : (
            <View style={styles.gridPlaceholder} />
          )}
        </View>
      );
    }
    return null;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar at top */}
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
            onFocus={() => setShowRecentSearches(true)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setShowRecentSearches(true);
            }}>
              <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Recent Searches */}
        {showRecentSearches && recentSearches.length > 0 && (
          <View style={styles.recentSearchesContainer}>
            <View style={styles.recentSearchesHeader}>
              <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearRecentSearches}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentSearchItem}
                onPress={() => handleRecentSearchPress(search)}
              >
                <Ionicons name="time-outline" size={18} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.recentSearchText}>{search}</Text>
                <TouchableOpacity
                  onPress={async () => {
                    const updated = recentSearches.filter((_, i) => i !== index);
                    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
                    setRecentSearches(updated);
                  }}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading ? (
        <LoadingSpinner message="Searching..." />
      ) : results ? (
        <FlatList
          data={searchFlatData}
          renderItem={renderSearchItem}
          keyExtractor={(item, index) => `s-${item.kind}-${index}`}
          style={styles.results}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />
      ) : listingsLoading ? (
        <LoadingSpinner message="Loading listings..." />
      ) : listings.length > 0 ? (
        <FlatList
          data={browseFlatData}
          renderItem={renderBrowseItem}
          keyExtractor={(item, index) => `b-${item.kind}-${index}`}
          style={styles.results}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />
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
    position: 'relative',
    zIndex: 10,
  },
  recentSearchesContainer: {
    marginTop: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    maxHeight: 300,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentSearchesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  clearButton: {
    fontSize: 13,
    color: '#0063e1',
    fontWeight: '600',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    marginLeft: 10,
  },
  removeButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
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
    backgroundColor: '#0063e1',
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
  listingsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  gridPlaceholder: {
    flex: 1,
    margin: 4,
  },
  externalItemWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  externalCard: {
    backgroundColor: '#1e293b',
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
    color: '#0063e1',
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
    backgroundColor: 'rgba(0, 99, 225, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 99, 225, 0.3)',
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0063e1',
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
