import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Alert } from '../lib/ui/alert';
import { colors } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ListingCard from '../components/ListingCard';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  photos: string[];
  sellerId: string;
  inventory: number;
  isActive: boolean;
  sold?: boolean;
}

export default function FavoritesScreen() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const loadFavorites = useCallback(async () => {
    if (!currentUser) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.get('/api/favorites', true);
      const resData = res.ok ? await res.json() : { data: [] };
      const favoriteIds: string[] = resData.data ?? [];

      if (favoriteIds.length === 0) {
        setFavorites([]);
        return;
      }

      const BATCH_SIZE = 5;
      const favoriteListings: (Listing | null)[] = [];
      for (let i = 0; i < favoriteIds.length; i += BATCH_SIZE) {
        const batch = favoriteIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (id: string) => {
            try {
              const response = await apiClient.get(`/api/listings/${id}`, false);
              if (response.ok) {
                const data = await response.json();
                return data.data || data;
              }
              return null;
            } catch {
              return null;
            }
          })
        );
        favoriteListings.push(...batchResults);
      }

      setFavorites(favoriteListings.filter((listing): listing is Listing => listing !== null));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    loadFavorites();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, [loadFavorites]);

  const removeFavorite = useCallback(async (listingId: string) => {
    setFavorites((prev) => prev.filter((listing) => listing.id !== listingId));
    try {
      await apiClient.delete(`/api/favorites/${listingId}`, true);
    } catch {
      Alert.alert('Error', 'Failed to remove favorite');
      loadFavorites();
    }
  }, [loadFavorites]);

  const filteredFavorites = favorites.filter((listing) => {
    const matchesSearch =
      !searchQuery ||
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['electronics', 'fashion', 'home', 'sports', 'automotive', 'other'];

  const ListHeader = () => (
    <View>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>My Favorites</Text>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner message="Loading favorites..." />;
  }

  const renderListHeader = () => (
    <View>
      <ListHeader />
      {favorites.length > 0 && (
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.text.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search favorites..."
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              <TouchableOpacity
                style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                onPress={() => setSelectedCategory('')}
              >
                <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {(searchQuery || selectedCategory) && (
            <Text style={styles.resultsCount}>
              {filteredFavorites.length} of {favorites.length} favorites match your filters
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {favorites.length === 0 ? (
        <>
          <ListHeader />
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={80} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptyText}>
              Start exploring and click the heart icon on items you like to add them here.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.browseButtonText}>Browse Listings</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : filteredFavorites.length === 0 ? (
        <>
          <ListHeader />
          <View style={styles.emptyState}>
            <Ionicons name="filter-outline" size={80} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>No Matches</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filter criteria.</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => { setSearchQuery(''); setSelectedCategory(''); }}
            >
              <Text style={styles.browseButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <FlatList
          data={filteredFavorites}
          renderItem={({ item }) => (
            <ListingCard
              id={item.id}
              title={item.title}
              description={item.description}
              price={item.price}
              category={item.category}
              condition={item.condition}
              imageUrl={item.photos?.[0] || null}
              sellerId={item.sellerId}
              sold={(item.sold ?? false) || item.inventory === 0}
              inventory={item.inventory}
              variant="grid"
            />
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderListHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.DEFAULT} />}
          columnWrapperStyle={styles.row}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
    marginBottom: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: colors.text.primary,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryScroll: {
    paddingRight: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  categoryChipActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  categoryChipText: {
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: colors.text.primary,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  browseButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
