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
  ActivityIndicator,
} from 'react-native';
import { colors, palette } from '../../constants/theme';
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
  const [contactLoading, setContactLoading] = useState(false);
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
        try {
          const parsed = JSON.parse(favorites);
          const favArray = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
          setIsFavorited(favArray.includes(id));
        } catch {
          setIsFavorited(false);
        }
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

  const handleContact = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to contact seller');
      router.push('/auth/signin');
      return;
    }

    if (!listing?.sellerId) {
      Alert.alert('Error', 'Unable to contact seller');
      return;
    }

    try {
      setContactLoading(true);
      const response = await apiClient.post('/api/chats', { otherUserId: listing.sellerId }, true);

      if (!response.ok) {
        let errorMessage = 'Failed to start chat';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          const errorText = await response.text().catch(() => '');
          if (errorText) {
            try {
              const parsed = JSON.parse(errorText);
              errorMessage = parsed.message || parsed.error || errorMessage;
            } catch {
              errorMessage = errorText.substring(0, 100) || errorMessage;
            }
          }
        }
        Alert.alert('Error', errorMessage);
        return;
      }

      const data = await response.json();
      const chatId = data.chatId || data.id;

      if (!chatId) {
        Alert.alert('Error', 'Could not start conversation. Please try again.');
        return;
      }

      // Pre-fill the chat input with a reference to this listing (mirrors web
      // behaviour where "Message Seller" opens a modal seeded with the same
      // template). The chat screen reads this `text` param on mount.
      const initialMessage = `Hi! I'm interested in "${listing.title}"`;
      router.push(
        `/chat/${chatId}?text=${encodeURIComponent(initialMessage)}` as any,
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Failed to start chat. Please try again.'
      );
    } finally {
      setContactLoading(false);
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
      let favArray: string[] = [];
      if (favorites) {
        try {
          const parsed = JSON.parse(favorites);
          favArray = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
        } catch {
          favArray = [];
        }
      }

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
            color={isFavorited ? colors.error.DEFAULT : colors.text.primary}
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
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
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
                    <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
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
              <Ionicons name="pricetag" size={14} color={colors.brand.DEFAULT} />
              <Text style={styles.metaText}>{listing.category}</Text>
            </View>
            {listing.condition && (
              <View style={styles.metaChip}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success.DEFAULT} />
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
                <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
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
            disabled={contactLoading}
          >
            {contactLoading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={22} color={colors.text.primary} />
                <Text style={styles.buttonText}>Message</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.cartButton]}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            <Ionicons name="cart-outline" size={22} color={colors.text.primary} />
            <Text style={styles.buttonText}>
              {addingToCart ? 'Adding...' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {((listing.sold ?? false) || listing.inventory === 0) && (
        <View style={styles.actionBar}>
          <View style={styles.soldButton}>
            <Ionicons name="close-circle" size={22} color={colors.error.DEFAULT} />
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
    backgroundColor: colors.bg.base,
  },
  scrollView: {
    flex: 1,
  },
  favoriteButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
    backgroundColor: colors.bg.overlay,
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
    backgroundColor: colors.bg.raised,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: colors.bg.overlay,
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
    backgroundColor: colors.text.muted,
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: colors.brand.DEFAULT,
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
    color: colors.text.tertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
  },
  soldBadge: {
    backgroundColor: colors.error.softStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  soldText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error.DEFAULT,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
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
    backgroundColor: colors.brand.softer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.brand.soft,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  descriptionSection: {
    marginBottom: 24,
    backgroundColor: colors.bg.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.bg.glass,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sellerMeta: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    shadowColor: palette.black,
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
    backgroundColor: palette.gray[700],
  },
  cartButton: {
    backgroundColor: colors.brand.DEFAULT,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  soldButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    backgroundColor: colors.error.softStrong,
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  soldButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error.DEFAULT,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.base,
  },
  errorText: {
    fontSize: 16,
    color: colors.text.tertiary,
  },
});

