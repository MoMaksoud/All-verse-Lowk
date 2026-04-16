import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api/client';
import { colors, spacing, radii, typography } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 2; // 2 columns with spacing
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 1.1; // Slightly taller than wide

interface ListingCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition?: string;
  imageUrl?: string | null;
  sellerId?: string;
  sold?: boolean;
  inventory?: number;
  variant?: 'grid' | 'list';
}

export default function ListingCard({
  id,
  title,
  description,
  price,
  category,
  condition,
  imageUrl,
  sellerId,
  sold = false,
  inventory,
  variant = 'grid',
}: ListingCardProps) {
  const { currentUser } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error when imageUrl changes (e.g. new listing)
  React.useEffect(() => {
    setImageError(false);
  }, [imageUrl]);
  // Load favorite state on mount
  React.useEffect(() => {
    const loadFavoriteState = async () => {
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
    loadFavoriteState();
  }, [id]);

  const handlePress = () => {
    try {
      router.push(`/listing/${id}` as any);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleFavorite = useCallback(async () => {
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
      } else {
        const updated = [...favArray, id];
        await AsyncStorage.setItem('favorites', JSON.stringify(updated));
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [id, isFavorited]);

  const handleAddToCart = useCallback(async (e?: any) => {
    if (e) {
      e.stopPropagation?.();
    }

    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to add items to cart');
      return;
    }

    if (!sellerId) {
      Alert.alert('Error', 'Unable to add item to cart');
      return;
    }

    if (sold || inventory === 0) {
      Alert.alert('Item Unavailable', 'This item is sold out');
      return;
    }

    try {
      setAddingToCart(true);
      const response = await apiClient.post('/api/carts', {
        listingId: id,
        sellerId: sellerId,
        qty: 1,
        priceAtAdd: price,
      }, true);

      if (response.ok) {
        Alert.alert('Success', 'Item added to cart!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', errorData.message || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  }, [currentUser, sellerId, id, price, sold, inventory]);

  const formatPrice = (price: number): string => {
    return `$${price.toLocaleString()}`;
  };

  const normalizeImageUrl = (url?: string | null): string => {
    if (!url) return 'https://via.placeholder.com/300';
    if (url.startsWith('http')) return url;
    // For now, return placeholder for local paths
    return 'https://via.placeholder.com/300';
  };

  if (variant === 'list') {
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {imageError ? (
          <View style={[styles.listImage, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color={colors.text.muted} />
          </View>
        ) : (
          <Image
            source={{ uri: normalizeImageUrl(imageUrl) }}
            style={styles.listImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
        <View style={styles.listContent}>
          <Text style={styles.listTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.listDescription} numberOfLines={2}>
            {description}
          </Text>
          <View style={styles.listFooter}>
            <Text style={styles.price}>{formatPrice(price)}</Text>
            <Text style={styles.category}>{category}</Text>
          </View>
          {!(sold || inventory === 0) && (
            <TouchableOpacity
              style={[styles.addToCartButton, addingToCart && styles.addToCartButtonDisabled]}
              onPress={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={16} color={colors.text.primary} />
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: CARD_WIDTH }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {imageError ? (
        <View style={[styles.gridImage, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={40} color={colors.text.muted} />
        </View>
      ) : (
        <Image
          source={{ uri: normalizeImageUrl(imageUrl) }}
          style={styles.gridImage}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      )}
      
      <View style={styles.cardOverlay}>
        {(sold || inventory === 0) && (
          <View style={styles.soldBadge}>
            <Text style={styles.soldText}>SOLD</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.gridFavoriteButton}
          onPress={handleFavorite}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorited ? colors.error.DEFAULT : colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.gridContent}>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.gridDescription} numberOfLines={2}>
          {description}
        </Text>
        <View style={styles.gridFooter}>
          <Text style={styles.price}>{formatPrice(price)}</Text>
          {condition && (
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{condition}</Text>
            </View>
          )}
        </View>
        {!(sold || inventory === 0) && (
          <TouchableOpacity
            style={[styles.addToCartButton, addingToCart && styles.addToCartButtonDisabled]}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="cart-outline" size={16} color={colors.text.primary} />
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid variant styles
  gridCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  gridImage: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colors.bg.raised,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_IMAGE_HEIGHT,
    pointerEvents: 'box-none',
    zIndex: 5,
  },
  gridContent: {
    padding: spacing.md + 2,
    minHeight: 120,
  },
  gridTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs + 2,
    lineHeight: 20,
    minHeight: 40,
  },
  gridDescription: {
    fontSize: typography.size.base - 1,
    color: colors.text.tertiary,
    marginBottom: spacing.sm + 2,
    lineHeight: 18,
    minHeight: 36,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  gridFavoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.bg.overlay,
    borderRadius: radii.full,
    padding: spacing.sm,
    zIndex: 15,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List variant styles
  listCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    flexDirection: 'row',
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  listImage: {
    width: 100,
    height: 100,
    borderRadius: radii.lg,
    backgroundColor: colors.bg.raised,
  },
  listContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  listDescription: {
    fontSize: typography.size.base - 1,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Shared styles
  price: {
    fontSize: 17,
    fontWeight: typography.weight.bold,
    color: colors.brand.DEFAULT,
  },
  category: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  conditionBadge: {
    backgroundColor: colors.success.soft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  conditionText: {
    fontSize: 10,
    color: colors.success.DEFAULT,
    fontWeight: typography.weight.semibold,
  },
  soldBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.error.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    zIndex: 12,
    maxWidth: '60%',
  },
  soldText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.bg.overlay,
    borderRadius: radii.full,
    padding: spacing.sm,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  addToCartButtonDisabled: {
    backgroundColor: colors.brand.DEFAULT,
    opacity: 0.5,
  },
  addToCartText: {
    color: colors.text.primary,
    fontSize: typography.size.base - 1,
    fontWeight: typography.weight.semibold,
  },
});

