import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api/client';
import LoadingSpinner from '../../components/LoadingSpinner';

interface CartItem {
  listingId: string;
  sellerId: string;
  qty: number;
  priceAtAdd: number;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  photos: string[];
  category: string;
  condition: string;
  sellerId: string;
  inventory: number;
  isActive: boolean;
  sold?: boolean;
}

export default function CartScreen() {
  const { currentUser } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchCart();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  // Refresh cart when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        fetchCart();
      }
    }, [currentUser])
  );

  const fetchCart = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const response = await apiClient.get('/api/carts', true);

      if (response.ok) {
        const data = await response.json();
        const cart = data.data || data;
        setCartItems(cart.items || []);

        // Fetch listing details for each cart item
        const listingPromises = (cart.items || []).map(async (item: CartItem) => {
          try {
            const listingResponse = await apiClient.get(`/api/listings/${item.listingId}`, false);
            if (listingResponse.ok) {
              const listingData = await listingResponse.json();
              return { id: item.listingId, listing: listingData.data || listingData };
            }
            return null;
          } catch (error) {
            return null;
          }
        });

        const listingResults = await Promise.all(listingPromises);
        const listingsMap: Record<string, Listing> = {};

        listingResults.forEach((result) => {
          if (result) {
            listingsMap[result.id] = result.listing;
          }
        });

        setListings(listingsMap);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCart();
    setRefreshing(false);
  }, [currentUser]);

  const updateCartItem = async (listingId: string, qty: number) => {
    if (!currentUser) return;

    try {
      const response = await apiClient.put('/api/carts', { listingId, qty }, true);

      if (response.ok) {
        await fetchCart();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update cart item');
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      Alert.alert('Error', 'Failed to update cart item');
    }
  };

  const removeFromCart = async (listingId: string) => {
    if (!currentUser) return;

    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete(`/api/carts?listingId=${listingId}`, true);

              if (response.ok) {
                await fetchCart();
              } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.message || 'Failed to remove item');
              }
            } catch (error) {
              console.error('Error removing from cart:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.priceAtAdd * item.qty, 0);
  };

  const ListHeader = () => (
    <View style={styles.pageHeader}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.pageTitle}>Cart</Text>
    </View>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const listing = listings[item.listingId];
    if (!listing) return null;

    return (
      <View style={styles.cartItem}>
        <TouchableOpacity
          onPress={() => router.push(`/listing/${item.listingId}` as any)}
          style={styles.cartItemContent}
        >
          {/* Image */}
          <View style={styles.imageContainer}>
            {listing.photos && listing.photos.length > 0 ? (
              <Image 
                source={{ uri: listing.photos[0] }} 
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={32} color="rgba(255, 255, 255, 0.3)" />
              </View>
            )}
            {/* Show SOLD badge if item is sold (match website logic: sold || inventory === 0) */}
            {((listing.sold ?? false) || listing.inventory === 0) && (
              <View style={styles.cartSoldBadge}>
                <Text style={styles.cartSoldText}>SOLD</Text>
              </View>
            )}
          </View>

          {/* Item Details - Two Line Layout */}
          <View style={styles.itemDetails}>
            {/* First Line: Title and Remove Button */}
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {listing.title}
              </Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromCart(item.listingId)}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* Second Line: Category and Price */}
            <View style={styles.itemFooter}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemCategory} numberOfLines={1}>
                  {listing.category}
                </Text>
                <Text style={styles.itemPrice} numberOfLines={1}>
                  ${item.priceAtAdd.toFixed(2)}
                </Text>
              </View>
              
              {/* Quantity Controls */}
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateCartItem(item.listingId, Math.max(1, item.qty - 1))}
                >
                  <Ionicons name="remove" size={18} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.qty}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateCartItem(item.listingId, item.qty + 1)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ListHeader />
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyText}>Please sign in to view your cart</Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/auth/signin')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading cart..." />;
  }

  const total = calculateTotal();
  const tax = total * 0.08;
  const processingFee = total * 0.029 + 0.3;
  const finalTotal = total + tax + processingFee;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {cartItems.length === 0 ? (
        <>
          <ListHeader />
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add some items to get started!</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.browseButtonText}>Browse Listings</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.listingId}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0063e1" />}
            ListHeaderComponent={ListHeader}
          />

          {/* Order Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Order Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({cartItems.length} items)</Text>
                <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (8%)</Text>
                <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Processing Fee</Text>
                <Text style={styles.summaryValue}>${processingFee.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>${finalTotal.toFixed(2)}</Text>
              </View>

              <TouchableOpacity 
                style={styles.checkoutButton}
                onPress={() => router.push('/checkout' as any)}
              >
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.checkoutNote}>Secure checkout powered by Stripe</Text>
            </View>
          </View>
        </>
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
  },
  listContent: {
    padding: 16,
    paddingBottom: 200, // Space for summary
  },
  cartItem: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  cartItemContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 110,
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    marginRight: 14,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartSoldBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  cartSoldText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemCategory: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0063e1',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#1a2332',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    padding: 6,
    marginTop: -2,
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
  signInButton: {
    backgroundColor: '#0063e1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  summaryContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a2332',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  summaryContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  summaryValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0063e1',
  },
  checkoutButton: {
    backgroundColor: '#0063e1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  checkoutNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 12,
  },
});

