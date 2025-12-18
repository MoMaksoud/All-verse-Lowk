import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [isFavorited, setIsFavorited] = useState(false);

  // Load favorite state on mount
  React.useEffect(() => {
    const loadFavoriteState = async () => {
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
      const favArray = favorites ? JSON.parse(favorites) : [];
      
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
        <Image
          source={{ uri: normalizeImageUrl(imageUrl) }}
          style={styles.listImage}
          resizeMode="cover"
        />
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
        </View>
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
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: CARD_WIDTH }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: normalizeImageUrl(imageUrl) }}
        style={styles.gridImage}
        resizeMode="cover"
      />
      
      {sold && (
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
          color={isFavorited ? '#ef4444' : '#fff'}
        />
      </TouchableOpacity>

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
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid variant styles
  gridCard: {
    backgroundColor: '#0B1220',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  gridImage: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: '#0E1526',
  },
  gridContent: {
    padding: 14,
    minHeight: 120,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 20,
    minHeight: 40,
  },
  gridDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 10,
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
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },

  // List variant styles
  listCard: {
    backgroundColor: '#0B1220',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  listImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#0E1526',
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Shared styles
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#60a5fa',
  },
  category: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  conditionBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  soldBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  soldText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
});

