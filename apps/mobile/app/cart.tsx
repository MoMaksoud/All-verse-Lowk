import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Alert } from '../lib/ui/alert';
import { formatPrice } from '../lib/format';
import { colors } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api/client';
import LoadingSpinner from '../components/LoadingSpinner';

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
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
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
        setCartItems(Array.isArray(cart.items) ? cart.items : []);

        // Fetch listing details in batches of 5 to bound concurrent GC handles.
        // Unbounded Promise.all holds all in-flight promise handles in one GC scope,
        // which can exhaust Hermes GC scope slots.
        const BATCH_SIZE = 5;
        const allItems: CartItem[] = Array.isArray(cart.items) ? cart.items : [];
        const listingResults: ({ id: string; listing: Listing } | null)[] = [];
        for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
          const batch = allItems.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (item: CartItem) => {
              try {
                const listingResponse = await apiClient.get(`/api/listings/${item.listingId}`, false);
                if (listingResponse.ok) {
                  const listingData = await listingResponse.json();
                  return { id: item.listingId, listing: listingData.data || listingData };
                }
                return null;
              } catch {
                return null;
              }
            })
          );
          listingResults.push(...batchResults);
        }
        const listingsMap: Record<string, Listing> = {};

        listingResults.forEach((result) => {
          if (result) {
            listingsMap[result.id] = result.listing;
          }
        });

        setListings(listingsMap);

        // Fetch display names for each unique seller (best-effort).
        const uniqueSellerIds = [...new Set(allItems.map((i) => i.sellerId).filter(Boolean))];
        const nameEntries = await Promise.all(
          uniqueSellerIds.map(async (sellerId) => {
            try {
              const res = await apiClient.get(`/api/profile?userId=${sellerId}`, false);
              if (res.ok) {
                const data = await res.json();
                const name = data.data?.displayName || data.data?.username;
                return [sellerId, name || 'Seller'] as const;
              }
            } catch {
              // ignore â€” fall back to generic label
            }
            return [sellerId, 'Seller'] as const;
          })
        );
        setSellerNames(Object.fromEntries(nameEntries));
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

  const calculateTotal = () =>
    cartItems.reduce((sum, item) => sum + item.priceAtAdd, 0);

  // Group cart items by seller â€” each seller is checked out and paid separately.
  const sellerSections = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of cartItems) {
      if (!map.has(item.sellerId)) map.set(item.sellerId, []);
      map.get(item.sellerId)!.push(item);
    }
    return [...map.entries()].map(([sellerId, items]) => ({
      sellerId,
      sellerName: sellerNames[sellerId] || 'Seller',
      subtotal: items.reduce((sum, i) => sum + i.priceAtAdd, 0),
      data: items,
    }));
  }, [cartItems, sellerNames]);

  const ListHeader = () => (
    <View style={styles.pageHeader}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
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
                <Ionicons name="image-outline" size={32} color={colors.text.muted} />
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
                <Ionicons name="trash-outline" size={20} color={colors.error.DEFAULT} />
              </TouchableOpacity>
            </View>

            {/* Category + Price */}
            <Text style={styles.itemCategory}>{listing.category}</Text>
            <Text style={styles.itemPrice}>{formatPrice(item.priceAtAdd)}</Text>
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
          <Ionicons name="cart-outline" size={80} color={colors.text.muted} />
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
            <Ionicons name="cart-outline" size={80} color={colors.text.muted} />
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
          <SectionList
            sections={sellerSections}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.listingId}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.DEFAULT} />}
            ListHeaderComponent={ListHeader}
            SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
            renderSectionHeader={({ section }) => (
              <View style={styles.sellerHeader}>
                <View style={styles.sellerHeaderLeft}>
                  <Ionicons name="storefront-outline" size={15} color={colors.brand.DEFAULT} />
                  <Text style={styles.sellerHeaderName} numberOfLines={1}>
                    {(section as any).sellerName}
                  </Text>
                </View>
                <Text style={styles.sellerHeaderCount}>
                  {(section as any).data.length} {(section as any).data.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            )}
            renderSectionFooter={({ section }) => (
              <View style={styles.sellerFooter}>
                <Text style={styles.sellerFooterLabel}>Seller subtotal</Text>
                <Text style={styles.sellerFooterValue}>{formatPrice((section as any).subtotal)}</Text>
              </View>
            )}
            ListFooterComponent={
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Order Summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</Text>
                  <Text style={styles.summaryValue}>{formatPrice(total)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax (8%)</Text>
                  <Text style={styles.summaryValue}>{formatPrice(tax)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Processing Fee</Text>
                  <Text style={styles.summaryValue}>{formatPrice(processingFee)}</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>{formatPrice(finalTotal)}</Text>
                </View>

                {sellerSections.length > 1 && (
                  <View style={styles.multiSellerNote}>
                    <Ionicons name="information-circle-outline" size={15} color={colors.text.muted} />
                    <Text style={styles.multiSellerNoteText}>
                      {sellerSections.length} sellers â€” you'll pay each one separately at checkout.
                    </Text>
                  </View>
                )}

                <View style={styles.protectionRow}>
                  <Ionicons name="shield-checkmark-outline" size={15} color={colors.success.DEFAULT} />
                  <Text style={styles.protectionText}>
                    Buyer protection â€” pay securely with Stripe
                  </Text>
                </View>
              </View>
            }
          />

          {/* Sticky pay bar â€” slim, always reachable, never covers content */}
          <View style={styles.payBar}>
            <View style={styles.payBarTotals}>
              <Text style={styles.payBarLabel}>Total</Text>
              <Text style={styles.payBarValue}>{formatPrice(finalTotal)}</Text>
            </View>
            <TouchableOpacity
              style={styles.payBarButton}
              onPress={() => router.push('/checkout' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.payBarButtonText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </>
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
  },
  listContent: {
    padding: 16,
    paddingBottom: 110, // clears the slim sticky pay bar
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sellerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    marginRight: 12,
  },
  sellerHeaderName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  sellerHeaderCount: {
    fontSize: 12,
    color: colors.text.muted,
  },
  sellerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingHorizontal: 2,
    paddingBottom: 22,
  },
  sellerFooterLabel: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  sellerFooterValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  multiSellerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg.raised,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  multiSellerNoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 17,
  },
  protectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  protectionText: {
    flex: 1,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  cartItem: {
    backgroundColor: colors.bg.surface,
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
    backgroundColor: colors.bg.raised,
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
    backgroundColor: colors.error.DEFAULT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  cartSoldText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
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
    color: colors.text.primary,
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  itemCategory: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
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
  signInButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  signInButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
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
  summaryCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text.muted,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.bg.glassHover,
    marginTop: 4,
    marginBottom: 12,
  },
  summaryTotalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  summaryTotalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
  },
  payBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.bg.raised,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: 12,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  payBarTotals: {
    justifyContent: 'center',
  },
  payBarLabel: {
    fontSize: 11,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  payBarValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
  },
  payBarButton: {
    flex: 1,
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payBarButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
