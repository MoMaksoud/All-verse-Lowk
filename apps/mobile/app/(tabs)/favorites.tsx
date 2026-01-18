import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../lib/api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import ListingCard from '../../components/ListingCard';

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
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const getFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const favoriteIds = await getFavorites();
      
      if (favoriteIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Fetch details for each favorite listing
      const favoriteListings = await Promise.all(
        favoriteIds.map(async (id: string) => {
          try {
            const response = await apiClient.get(`/api/listings/${id}`, false);
            if (response.ok) {
              const data = await response.json();
              return data.data || data;
            }
            return null;
          } catch (error) {
            console.error(`Error fetching listing ${id}:`, error);
            return null;
          }
        })
      );

      // Filter out null values (deleted listings)
      const validFavorites = favoriteListings.filter((listing) => listing !== null);
      setFavorites(validFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [getFavorites]);

  useEffect(() => {
    loadFavorites();
  }, []);

  // Refresh favorites when screen comes into focus
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
    try {
      const currentFavorites = await getFavorites();
      const updatedFavorites = currentFavorites.filter((id: string) => id !== listingId);
      await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));

      // Update local state
      setFavorites((prev) => prev.filter((listing) => listing.id !== listingId));
    } catch (error) {
      console.error('Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove favorite');
    }
  }, [getFavorites]);

  // Filter favorites based on search and category
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
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
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
          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search favorites..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter */}
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
                  <Text
                    style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Results count */}
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
            <Ionicons name="heart-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
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
            <Ionicons name="filter-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyTitle}>No Matches</Text>
            <Text style={styles.emptyText}>Try adjusting your search or filter criteria.</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('');
              }}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0063e1" />}
          columnWrapperStyle={styles.row}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
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
    color: '#fff',
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
    backgroundColor: '#1a2332',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
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
    backgroundColor: '#1a2332',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryChipActive: {
    backgroundColor: '#0063e1',
    borderColor: '#0063e1',
  },
  categoryChipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  resultsCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
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
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#0063e1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

