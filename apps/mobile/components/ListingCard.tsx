import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Alert } from '../lib/ui/alert';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { formatPrice } from '../lib/format';
import ProfilePicture from './ProfilePicture';
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
  sellerName?: string;
  sellerAvatar?: string;
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
  sellerName,
  sellerAvatar,
  sold = false,
  inventory,
  variant = 'grid',
}: ListingCardProps) {
  const { currentUser } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [imageError, setImageError] = useState(false);

  const isFavorited = isFavorite(id);

  // You can't buy your own listing.
  const isOwnListing = !!currentUser && !!sellerId && currentUser.uid === sellerId;

  // Reset image error when imageUrl changes (e.g. new listing)
  React.useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const handlePress = () => {
    try {
      router.push(`/listing/${id}` as any);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleFavorite = useCallback(() => {
    if (!currentUser) {
      Alert.alert('Sign in required', 'Sign in to save items to your favorites.');
      return;
    }
    toggle(id);
  }, [currentUser, toggle, id]);

  // Only render real http(s) images; otherwise show a local placeholder.
  const validImageUrl = imageUrl && imageUrl.startsWith('http') ? imageUrl : null;
  const showPlaceholder = imageError || !validImageUrl;

  if (variant === 'list') {
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {showPlaceholder ? (
          <View style={[styles.listImage, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={32} color={colors.text.muted} />
          </View>
        ) : (
          <Image
            source={{ uri: validImageUrl! }}
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
          {isOwnListing ? (
            <View style={styles.ownListingTag}>
              <Ionicons name="pricetag-outline" size={14} color={colors.text.muted} />
              <Text style={styles.ownListingText}>Your listing</Text>
            </View>
          ) : sellerName ? (
            <View style={styles.sellerRow}>
              <ProfilePicture src={sellerAvatar} name={sellerName} customSize={18} />
              <Text style={styles.sellerHandle} numberOfLines={1}>{sellerName}</Text>
            </View>
          ) : null}
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
      {showPlaceholder ? (
        <View style={[styles.gridImage, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={40} color={colors.text.muted} />
        </View>
      ) : (
        <Image
          source={{ uri: validImageUrl! }}
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
        {isOwnListing ? (
          <View style={styles.ownListingTag}>
            <Ionicons name="pricetag-outline" size={14} color={colors.text.muted} />
            <Text style={styles.ownListingText}>Your listing</Text>
          </View>
        ) : sellerName ? (
          <View style={styles.sellerRow}>
            <ProfilePicture src={sellerAvatar} name={sellerName} customSize={18} />
            <Text style={styles.sellerHandle} numberOfLines={1}>{sellerName}</Text>
          </View>
        ) : null}
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
  ownListingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.bg.raised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm + 2,
  },
  ownListingText: {
    color: colors.text.muted,
    fontSize: typography.size.base - 1,
    fontWeight: typography.weight.semibold,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  sellerHandle: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontWeight: typography.weight.medium,
  },
});

