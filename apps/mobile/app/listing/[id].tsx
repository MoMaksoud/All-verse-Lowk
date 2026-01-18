import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProfilePicture from '../../components/ProfilePicture';

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
  createdAt?: string;
}

interface SellerProfile {
  username?: string;
  profilePicture?: string;
  createdAt?: string;
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollViewRef = useRef<any>(null);

  useEffect(() => {
    if (id) {
      fetchListing();
      loadFavoriteState();
    }
  }, [id]);

  const loadFavoriteState = async () => {
    if (!id) return;
    try {
      const favorites = await AsyncStorage.getItem('favorites');
      if (favorites) {
        const favArray = JSON.parse(favorites);
        setIsFavorited(favArray.includes(id));
      }
    } catch (error) {
      console.error('Error loading favorite state:', error);
    }
  };

  const fetchListing = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/listings/${id}`);
      const data = await response.json();

      if (response.ok) {
        // Handle both response structures: direct object or wrapped in data
        const listingData = data.data || data;
        
        if (listingData && listingData.id) {
          setListing(listingData);
          
          // Fetch seller profile
          if (listingData.sellerId) {
            fetchSellerProfile(listingData.sellerId);
          }
        } else {
          Alert.alert('Error', 'Invalid listing data');
        }
      } else {
        Alert.alert('Error', `Failed to load listing (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      Alert.alert('Error', 'Failed to load listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerProfile = async (sellerId: string) => {
    try {
      const response = await apiClient.get(`/api/profile?userId=${sellerId}`);
      const data = await response.json();

      if (response.ok && data.data) {
        setSeller(data.data);
      }
    } catch (error) {
      console.error('Error fetching seller profile:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to add items to cart');
      router.push('/auth/signin');
      return;
    }

    if (!listing) return;

    try {
      setAddingToCart(true);
      const response = await apiClient.post('/api/carts', {
        listingId: listing.id,
        sellerId: listing.sellerId,
        qty: 1,
        priceAtAdd: listing.price,
      }, true);

      if (response.ok) {
        Alert.alert('Success', 'Item added to cart!');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleContact = () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to contact seller');
      router.push('/auth/signin');
      return;
    }

    // Navigate to chat
    if (listing?.sellerId) {
      router.push(`/chat/${listing.sellerId}`);
    }
  };

  const handleFavorite = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to favorite items');
      router.push('/auth/signin');
      return;
    }

    if (!id) return;

    try {
      const favorites = await AsyncStorage.getItem('favorites');
      const favArray = favorites ? JSON.parse(favorites) : [];

      if (isFavorited) {
        const updated = favArray.filter((fav: string) => fav !== id);
        await AsyncStorage.setItem('favorites', JSON.stringify(updated));
        setIsFavorited(false);
        Alert.alert('Removed from favorites');
      } else {
        const updated = [...favArray, id];
        await AsyncStorage.setItem('favorites', JSON.stringify(updated));
        setIsFavorited(true);
        Alert.alert('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading listing..." />;
  }

  if (!listing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Listing not found</Text>
      </View>
    );
  }

  const normalizeImageUrl = (url?: string): string => {
    if (!url) return 'https://via.placeholder.com/400';
    if (url.startsWith('http')) return url;
    return 'https://via.placeholder.com/400';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Favorite Button - Floating */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavorite}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorited ? '#ef4444' : '#fff'}
          />
        </TouchableOpacity>

        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <View style={styles.imageWrapper}>
            <ScrollView
              ref={imageScrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {(listing.photos && listing.photos.length > 0 ? listing.photos : [null]).map(
                (photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: normalizeImageUrl(photo) }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                )
              )}
            </ScrollView>
            
            {/* Navigation Arrows - Only show if multiple images */}
            {listing.photos && listing.photos.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowLeft]}
                    onPress={() => {
                      const newIndex = currentImageIndex - 1;
                      imageScrollViewRef.current?.scrollTo({
                        x: newIndex * (width - 40),
                        animated: true,
                      });
                    }}
                  >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
                {currentImageIndex < listing.photos.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navArrow, styles.navArrowRight]}
                    onPress={() => {
                      const newIndex = currentImageIndex + 1;
                      imageScrollViewRef.current?.scrollTo({
                        x: newIndex * (width - 40),
                        animated: true,
                      });
                    }}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          
          {listing.photos && listing.photos.length > 1 && (
            <View style={styles.pagination}>
              {listing.photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentImageIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Price and Status */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.price}>${listing.price.toLocaleString()}</Text>
            </View>
            {((listing.sold ?? false) || listing.inventory === 0) && (
              <View style={styles.soldBadge}>
                <Text style={styles.soldText}>SOLD</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaChip}>
              <Ionicons name="pricetag" size={14} color="#0063e1" />
              <Text style={styles.metaText}>{listing.category}</Text>
            </View>
            {listing.condition && (
              <View style={styles.metaChip}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.metaText}>{listing.condition}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Seller Info */}
          {seller && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seller</Text>
              <TouchableOpacity
                style={styles.sellerCard}
                onPress={() => router.push(`/profile/${listing.sellerId}`)}
              >
                <ProfilePicture
                  src={seller.profilePicture}
                  name={seller.username}
                  size="md"
                />
                <View style={styles.sellerInfo}>
                  <Text style={styles.sellerName}>
                    {seller.username || 'Marketplace User'}
                  </Text>
                  <Text style={styles.sellerMeta}>
                    Member since {new Date(seller.createdAt || Date.now()).getFullYear()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {!listing.sold && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.button, styles.contactButton]}
            onPress={handleContact}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.cartButton]}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            <Ionicons name="cart-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {((listing.sold ?? false) || listing.inventory === 0) && (
        <View style={styles.actionBar}>
          <View style={styles.soldButton}>
            <Ionicons name="close-circle" size={22} color="#ef4444" />
            <Text style={styles.soldButtonText}>Item Sold</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollView: {
    flex: 1,
  },
  favoriteButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: width - 40,
    height: (width - 40) * 0.85,
    backgroundColor: '#0E1526',
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  navArrowLeft: {
    left: 10,
  },
  navArrowRight: {
    right: 10,
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: '#0063e1',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0063e1',
  },
  soldBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  soldText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    lineHeight: 30,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 99, 225, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 99, 225, 0.2)',
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  descriptionSection: {
    marginBottom: 24,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  sellerMeta: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  contactButton: {
    backgroundColor: '#374151',
  },
  cartButton: {
    backgroundColor: '#0063e1',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  soldButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  soldButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

