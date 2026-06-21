import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  Linking,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Alert } from '../../lib/ui/alert';
import { colors, palette } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../lib/api/client';
import { getCache, setCache } from '../../lib/cache';
import { formatPrice } from '../../lib/format';
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

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Fashion', value: 'fashion' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Home', value: 'home' },
  { label: 'Sports', value: 'sports' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Other', value: 'other' },
];

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price ↑', value: 'low-to-high' },
  { label: 'Price ↓', value: 'high-to-low' },
];

const CONDITIONS = [
  { label: 'Any', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Like New', value: 'like-new' },
  { label: 'Good', value: 'good' },
  { label: 'Fair', value: 'fair' },
];

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
  const [searchFocused, setSearchFocused] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Ref so useFocusEffect always reads latest filter values without stale closure
  const filtersRef = useRef({ category: '', sort: 'newest', condition: '', min: '', max: '' });
  filtersRef.current = { category: selectedCategory, sort: selectedSort, condition: selectedCondition, min: minPrice, max: maxPrice };

  const getCacheKey = (f = filtersRef.current) =>
    `listings_${f.category}_${f.sort}_${f.condition}_${f.min}_${f.max}`;

  const activeFilterCount = [
    selectedCategory,
    selectedSort !== 'newest' ? 'sort' : '',
    selectedCondition,
    minPrice,
    maxPrice,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedCategory('');
    setSelectedSort('newest');
    setSelectedCondition('');
    setMinPrice('');
    setMaxPrice('');
  };

  useEffect(() => {
    loadRecentSearches();
    if (params.q) performSearch(params.q);
  }, [params.q]);

  // Re-fetch whenever filters change
  useEffect(() => {
    if (!params.q && !searchQuery.trim()) {
      fetchListingsWithFilters(selectedCategory, selectedSort, selectedCondition, minPrice, maxPrice, false);
    }
  }, [selectedCategory, selectedSort, selectedCondition, minPrice, maxPrice]);

  // On focus: serve cache instantly, then background-refresh
  useFocusEffect(
    useCallback(() => {
      if (!params.q && !searchQuery.trim()) {
        const f = filtersRef.current;
        const cached = getCache<Listing[]>(getCacheKey(f), 60_000);
        if (cached) {
          setListings(cached);
          setListingsLoading(false);
          fetchListingsWithFilters(f.category, f.sort, f.condition, f.min, f.max, true);
        }
      }
    }, [params.q, searchQuery])
  );

  useEffect(() => {
    setShowRecentSearches(searchFocused && searchQuery.length === 0);
  }, [searchQuery, searchFocused]);

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

  const fetchListingsWithFilters = async (
    category: string, sort: string, condition: string,
    min: string, max: string, silent: boolean
  ) => {
    try {
      if (!silent) setListingsLoading(true);
      const qs = new URLSearchParams({ limit: '50', sort });
      if (category) qs.set('category', category);
      if (condition) qs.set('condition', condition);
      if (min) qs.set('min', min);
      if (max) qs.set('max', max);
      const cacheKey = `listings_${category}_${sort}_${condition}_${min}_${max}`;

      const response = await apiClient.get(`/api/listings?${qs.toString()}`);
      const data = await response.json();

      let items: Listing[] | null = null;
      if (response.ok && data.data && Array.isArray(data.data)) {
        items = data.data.slice(0, 50);
      } else if (response.ok && data.data?.items) {
        items = data.data.items.slice(0, 50);
      } else if (response.ok && Array.isArray(data)) {
        items = data.slice(0, 50);
      }
      if (items) {
        setListings(items);
        setCache(cacheKey, items);
      }
    } catch {
      // silently fail
    } finally {
      if (!silent) setListingsLoading(false);
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
            <Text style={styles.sectionTitle}>AllVerse Marketplace</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>AV</Text></View>
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
                <Text style={styles.externalPrice}>{formatPrice(item.item.price)}</Text>
                {item.item.rating && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color={palette.amber[400]} />
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
          <Ionicons name="search-outline" size={64} color={colors.text.muted} />
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
        <View style={styles.listingsMeta}>
          <Text style={styles.listingsMetaText}>
            {item.count} listing{item.count !== 1 ? 's' : ''}
          </Text>
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
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Marketplace</Text>
        <TouchableOpacity
          style={[styles.filterIconBtn, activeFilterCount > 0 && styles.filterIconBtnActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons
            name="options"
            size={24}
            color={activeFilterCount > 0 ? colors.brand.DEFAULT : colors.text.muted}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={18} color={searchFocused ? colors.brand.DEFAULT : colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search across all marketplaces..."
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setResults(null);
            }}>
              <Ionicons name="close-circle" size={18} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Universal search value prop */}
        {!results && !loading && !searchQuery.trim() && (
          <View style={styles.webSearchHint}>
            <Ionicons name="globe-outline" size={14} color={colors.brand.DEFAULT} />
            <Text style={styles.webSearchHintText}>
              One search — AllVerse plus other marketplaces across the web
            </Text>
          </View>
        )}

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
                <Ionicons name="time-outline" size={18} color={colors.text.tertiary} />
                <Text style={styles.recentSearchText}>{search}</Text>
                <TouchableOpacity
                  onPress={async () => {
                    const updated = recentSearches.filter((_, i) => i !== index);
                    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
                    setRecentSearches(updated);
                  }}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={16} color={colors.text.muted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {activeFilterCount > 0 && !results && !loading && (
        <View style={styles.filterIndicator}>
          <Ionicons name="funnel" size={11} color={colors.brand.DEFAULT} />
          <Text style={styles.filterIndicatorText} numberOfLines={1}>
            {[
              selectedCategory && CATEGORIES.find(c => c.value === selectedCategory)?.label,
              selectedSort !== 'newest' && SORT_OPTIONS.find(s => s.value === selectedSort)?.label,
              selectedCondition && CONDITIONS.find(c => c.value === selectedCondition)?.label,
              (minPrice || maxPrice) && `$${minPrice || '0'}–${maxPrice ? `$${maxPrice}` : '∞'}`,
            ].filter(Boolean).join(' · ')}
          </Text>
          <TouchableOpacity onPress={clearAllFilters} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
            <Text style={styles.filterIndicatorClear}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

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
      ) : activeFilterCount === 0 && !searchQuery.trim() ? (
        <ScrollView
          style={styles.results}
          contentContainerStyle={styles.discoveryContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {recentSearches.length > 0 && (
            <View style={styles.discoverySection}>
              <View style={styles.discoveryHeaderRow}>
                <Text style={styles.discoveryHeading}>Recent searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.discoveryClear}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.discoveryChips}>
                {recentSearches.slice(0, 8).map((s, i) => (
                  <TouchableOpacity key={i} style={styles.discoveryChip} onPress={() => handleRecentSearchPress(s)}>
                    <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.discoveryChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.discoverySection}>
            <Text style={styles.discoveryHeading}>Browse categories</Text>
            <View style={styles.discoveryChips}>
              {CATEGORIES.filter((c) => c.value).map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={styles.discoveryChip}
                  onPress={() => setSelectedCategory(c.value)}
                >
                  <Text style={styles.discoveryChipText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.discoveryTipCard}>
            <Ionicons name="globe-outline" size={22} color={colors.brand.DEFAULT} />
            <View style={styles.discoveryTipTextWrap}>
              <Text style={styles.discoveryTipTitle}>Can&apos;t find it on AllVerse?</Text>
              <Text style={styles.discoveryTipText}>
                Type anything above — we also search Amazon, eBay and other marketplaces across the web.
              </Text>
            </View>
          </View>
        </ScrollView>
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
          <Ionicons name="storefront-outline" size={52} color={colors.text.muted} />
          <Text style={styles.emptyText}>
            {activeFilterCount > 0 ? 'No listings match' : 'Nothing here yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeFilterCount > 0
              ? 'Try adjusting your filters or clear them'
              : 'Check back soon — or search across all marketplaces above'}
          </Text>
        </View>
      )}
      {/* Filter modal — full-screen, solid bg, no bleed-through */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => { Keyboard.dismiss(); setFilterModalVisible(false); }}
      >
        <View style={styles.modalRoot}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <SafeAreaView style={{ flex: 1 }}>

              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => { Keyboard.dismiss(); setFilterModalVisible(false); }}
                >
                  <Ionicons name="close" size={20} color={colors.text.muted} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Filters</Text>
                {activeFilterCount > 0 ? (
                  <TouchableOpacity onPress={clearAllFilters}>
                    <Text style={styles.clearAllText}>Clear all</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 56 }} />
                )}
              </View>

              {/* Scrollable filter options */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.filterLabel}>Category</Text>
                <View style={styles.filterChips}>
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat.value;
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setSelectedCategory(cat.value)}
                      >
                        {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.filterLabel}>Sort By</Text>
                <View style={styles.filterChips}>
                  {SORT_OPTIONS.map((opt) => {
                    const active = selectedSort === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setSelectedSort(opt.value)}
                      >
                        {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.filterLabel}>Condition</Text>
                <View style={styles.filterChips}>
                  {CONDITIONS.map((c) => {
                    const active = selectedCondition === c.value;
                    return (
                      <TouchableOpacity
                        key={c.value}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setSelectedCondition(c.value)}
                      >
                        {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.filterLabel}>Price Range</Text>
                <View style={styles.priceRow}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Min $"
                    placeholderTextColor={colors.text.muted}
                    keyboardType="numeric"
                    returnKeyType="done"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  <Text style={styles.priceSep}>—</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max $"
                    placeholderTextColor={colors.text.muted}
                    keyboardType="numeric"
                    returnKeyType="done"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>
              </ScrollView>

              {/* Done bar — solid bg, always above keyboard */}
              <View style={styles.doneBtnWrapper}>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => { Keyboard.dismiss(); setFilterModalVisible(false); }}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>

            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    position: 'relative',
    zIndex: 10,
  },
  webSearchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  webSearchHintText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.text.tertiary,
  },
  discoveryContent: {
    padding: 20,
    gap: 24,
  },
  discoverySection: {
    gap: 12,
  },
  discoveryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discoveryHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  discoveryClear: {
    fontSize: 13,
    color: colors.brand.DEFAULT,
    fontWeight: '600',
  },
  discoveryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  discoveryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  discoveryChipText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  discoveryTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.brand.softer,
    borderWidth: 1,
    borderColor: colors.brand.soft,
  },
  discoveryTipTextWrap: {
    flex: 1,
  },
  discoveryTipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  discoveryTipText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.tertiary,
  },
  recentSearchesContainer: {
    marginTop: 12,
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
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
    color: colors.text.secondary,
  },
  clearButton: {
    fontSize: 13,
    color: colors.brand.DEFAULT,
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
    color: colors.text.primary,
    marginLeft: 10,
  },
  removeButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  searchBarFocused: {
    borderColor: colors.border.focused,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  results: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginRight: 8,
  },
  badge: {
    backgroundColor: colors.brand.DEFAULT,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 10,
  },

  // Browse grid
  listingsMeta: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  listingsMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 0.2,
  },

  // Active filter indicator bar
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.brand.soft,
  },
  filterIndicatorText: {
    flex: 1,
    fontSize: 12,
    color: colors.brand.DEFAULT,
    fontWeight: '500',
  },
  filterIndicatorClear: {
    fontSize: 12,
    color: colors.brand.DEFAULT,
    fontWeight: '700',
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
    paddingVertical: 5,
  },
  gridPlaceholder: {
    flex: 1,
    margin: 4,
  },
  externalItemWrapper: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  externalCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  externalImage: {
    width: 100,
    height: 100,
    backgroundColor: colors.bg.raised,
  },
  externalContent: {
    flex: 1,
    padding: 12,
    position: 'relative',
  },
  externalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
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
    color: colors.brand.DEFAULT,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: palette.amber[400],
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand.soft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.brand.ring,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.DEFAULT,
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
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
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
    color: colors.text.primary,
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 8,
    textAlign: 'center',
  },

  // Filter icon button (header, top-right)
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filterIconBtnActive: {
    backgroundColor: colors.brand.soft,
    borderColor: colors.brand.ring,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },

  // Filter modal chips
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  chipActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },

  // Filter modal — full-screen, opaque
  modalRoot: {
    flex: 1,
    backgroundColor: colors.bg.raised,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.bg.raised,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  clearAllText: {
    fontSize: 14,
    color: colors.brand.DEFAULT,
    fontWeight: '600',
    width: 56,
    textAlign: 'right',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    backgroundColor: colors.bg.raised,
  },
  doneBtnWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.bg.raised,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 10,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  priceInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.bg.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text.primary,
  },
  priceSep: { color: colors.text.muted, fontSize: 16 },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.brand.DEFAULT,
    alignItems: 'center',
  },
  doneBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
