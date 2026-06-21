import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Alert } from '../lib/ui/alert';
import { formatPrice } from '../lib/format';
import * as WebBrowser from 'expo-web-browser';
import { colors, palette } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api/client';
import LoadingSpinner from '../components/LoadingSpinner';

interface CartItem {
  listingId: string;
  sellerId: string;
  qty: number;
  priceAtAdd: number;
}

interface ListingLite {
  title: string;
  photo: string | null;
}

interface ShippingRate {
  id: string;
  carrier: string;
  serviceName: string;
  price: number;
  estimatedDays?: number;
}

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface SellerShippingState {
  rates: ShippingRate[];
  selected: ShippingRate | null;
  shipmentId: string | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_SHIPPING: SellerShippingState = {
  rates: [],
  selected: null,
  shipmentId: null,
  loading: false,
  error: null,
};

const PAYMENT_CONFIRM_ATTEMPTS = 8;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function confirmPayment(sessionId: string): Promise<string> {
  for (let attempt = 0; attempt < PAYMENT_CONFIRM_ATTEMPTS; attempt += 1) {
    const response = await apiClient.get(
      `/api/payments/confirm?session_id=${encodeURIComponent(sessionId)}`,
      true
    );
    const data = await response.json();

    if (response.ok && data.success) {
      const orderId = data.order?.orderId || data.orderId;
      if (!orderId) throw new Error('Payment was verified, but the order could not be found.');
      return orderId;
    }

    if (response.status === 202 || data.code === 'ORDER_PROCESSING') {
      await wait(1500);
      continue;
    }

    throw new Error(data.error || data.message || 'Payment could not be verified.');
  }

  throw new Error('Payment was received, but the order is still processing. Check Orders shortly.');
}

export default function CheckoutScreen() {
  const { currentUser } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [listings, setListings] = useState<Record<string, ListingLite>>({});
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [payingSellerId, setPayingSellerId] = useState<string | null>(null);
  const [paidSellers, setPaidSellers] = useState<Set<string>>(new Set());
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: currentUser?.displayName || '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  // Per-seller shipping quotes, keyed by sellerId.
  const [sellerShipping, setSellerShipping] = useState<Record<string, SellerShippingState>>({});

  useEffect(() => {
    if (currentUser) {
      fetchCart();
    } else {
      Alert.alert('Sign In Required', 'Please sign in to checkout');
      router.back();
    }
  }, [currentUser]);

  const fetchCart = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const response = await apiClient.get('/api/carts', true);
      if (!response.ok) return;
      const data = await response.json();
      const cart = data.data || data;
      const items: CartItem[] = Array.isArray(cart.items) ? cart.items : [];
      setCartItems(items);

      // Lightweight listing details (title + first photo) for display.
      const listingMap: Record<string, ListingLite> = {};
      await Promise.all(
        items.map(async (item) => {
          try {
            const res = await apiClient.get(`/api/listings/${item.listingId}`, false);
            if (res.ok) {
              const d = await res.json();
              const l = d.data || d;
              listingMap[item.listingId] = {
                title: l.title || 'Item',
                photo: Array.isArray(l.photos) && l.photos.length > 0 ? l.photos[0] : null,
              };
            }
          } catch {
            // ignore
          }
        })
      );
      setListings(listingMap);

      // Seller display names.
      const uniqueSellerIds = [...new Set(items.map((i) => i.sellerId).filter(Boolean))];
      const nameEntries = await Promise.all(
        uniqueSellerIds.map(async (sellerId) => {
          try {
            const res = await apiClient.get(`/api/profile?userId=${sellerId}`, false);
            if (res.ok) {
              const d = await res.json();
              return [sellerId, d.data?.displayName || d.data?.username || 'Seller'] as const;
            }
          } catch {
            // ignore
          }
          return [sellerId, 'Seller'] as const;
        })
      );
      setSellerNames(Object.fromEntries(nameEntries));
    } catch (error) {
      console.error('Error fetching cart:', error);
      Alert.alert('Error', 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  // Group cart by seller. Each seller = a separate order + payment.
  const sellerGroups = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of cartItems) {
      if (!map.has(item.sellerId)) map.set(item.sellerId, []);
      map.get(item.sellerId)!.push(item);
    }
    return [...map.entries()].map(([sellerId, items]) => ({
      sellerId,
      sellerName: sellerNames[sellerId] || 'Seller',
      items,
      subtotal: items.reduce((sum, i) => sum + i.priceAtAdd, 0),
    }));
  }, [cartItems, sellerNames]);

  const fetchRatesForSeller = useCallback(
    async (sellerId: string) => {
      const cleanZip = shippingAddress.zip.replace(/[\s-]/g, '').substring(0, 5);
      if (cleanZip.length < 5) return;

      setSellerShipping((prev) => ({
        ...prev,
        [sellerId]: { ...(prev[sellerId] ?? EMPTY_SHIPPING), loading: true, error: null },
      }));

      try {
        // Resolve the seller's origin ZIP (default to 10001).
        let fromZip = '10001';
        try {
          const sellerResponse = await apiClient.get(`/api/profile?userId=${sellerId}`, false);
          if (sellerResponse.ok) {
            const sellerData = await sellerResponse.json();
            const sellerZip = sellerData.data?.shippingAddress?.zip;
            if (sellerZip) fromZip = sellerZip.replace(/[\s-]/g, '').substring(0, 5);
          }
        } catch {
          // use default ZIP
        }

        const response = await apiClient.post(
          '/api/shipping/get-rates',
          {
            weight: 2,
            length: 12,
            width: 8,
            height: 6,
            fromZip,
            toZip: cleanZip,
            toAddress: {
              street: shippingAddress.street,
              city: shippingAddress.city,
              state: shippingAddress.state,
              zip: cleanZip,
              country: shippingAddress.country,
            },
          },
          true
        );

        if (response.ok) {
          const data = await response.json();
          if (data.rates && data.rates.length > 0) {
            setSellerShipping((prev) => ({
              ...prev,
              [sellerId]: {
                rates: data.rates,
                selected: data.rates[0],
                shipmentId: data.shipmentId || null,
                loading: false,
                error: null,
              },
            }));
          } else {
            setSellerShipping((prev) => ({
              ...prev,
              [sellerId]: { ...EMPTY_SHIPPING, error: 'No shipping rates available for this address' },
            }));
          }
        } else {
          const e = await response.json().catch(() => ({}));
          setSellerShipping((prev) => ({
            ...prev,
            [sellerId]: { ...EMPTY_SHIPPING, error: e.error || e.message || 'Failed to load shipping rates' },
          }));
        }
      } catch (error: any) {
        setSellerShipping((prev) => ({
          ...prev,
          [sellerId]: { ...EMPTY_SHIPPING, error: error?.message || 'Failed to fetch shipping rates' },
        }));
      }
    },
    [shippingAddress.zip, shippingAddress.street, shippingAddress.city, shippingAddress.state, shippingAddress.country]
  );

  // When ZIP becomes valid, quote shipping for every seller.
  useEffect(() => {
    const cleanZip = shippingAddress.zip.replace(/[\s-]/g, '');
    if (cleanZip.length >= 5 && sellerGroups.length > 0) {
      sellerGroups.forEach((group) => {
        if (!paidSellers.has(group.sellerId)) fetchRatesForSeller(group.sellerId);
      });
    } else {
      setSellerShipping({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingAddress.zip, cartItems]);

  const computeSellerTotals = (group: { subtotal: number; sellerId: string }) => {
    const subtotal = group.subtotal;
    const tax = subtotal * 0.08;
    const shipping = sellerShipping[group.sellerId]?.selected?.price || 0;
    const fees = (subtotal + tax + shipping) * 0.029 + 0.3;
    const total = subtotal + tax + fees + shipping;
    return { subtotal, tax, shipping, fees, total };
  };

  const grandRemainingTotal = useMemo(() => {
    return sellerGroups
      .filter((g) => !paidSellers.has(g.sellerId))
      .reduce((sum, g) => sum + computeSellerTotals(g).total, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerGroups, sellerShipping, paidSellers]);

  const addressComplete =
    !!shippingAddress.name &&
    !!shippingAddress.street &&
    !!shippingAddress.city &&
    !!shippingAddress.state &&
    !!shippingAddress.zip;

  const unpaidGroups = sellerGroups.filter((g) => !paidSellers.has(g.sellerId));
  const allShippingSelected = unpaidGroups.every((g) => !!sellerShipping[g.sellerId]?.selected);

  const handlePayAll = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to checkout');
      return;
    }
    if (!addressComplete) {
      Alert.alert('Invalid Address', 'Please fill in all shipping address fields');
      return;
    }
    if (!allShippingSelected) {
      Alert.alert('Shipping Required', 'Please select a shipping option for each seller');
      return;
    }

    setProcessing(true);
    const paidLocal = new Set(paidSellers);
    const confirmedOrderIds: string[] = [];

    try {
      for (const group of sellerGroups) {
        if (paidLocal.has(group.sellerId)) continue;
        setPayingSellerId(group.sellerId);

        const ship = sellerShipping[group.sellerId];
        const sel = ship?.selected;

        const response = await apiClient.post(
          '/api/payments/create-checkout-session',
          {
            sellerId: group.sellerId,
            shippingAddress,
            selectedShipping: sel
              ? {
                  rateId: sel.id,
                  shipmentId: ship?.shipmentId,
                  carrier: sel.carrier,
                  serviceName: sel.serviceName,
                  price: sel.price,
                }
              : null,
            platform: 'mobile',
          },
          true
        );

        const data = await response.json();
        if (!response.ok || !data.success || !data.url) {
          throw new Error(data.error || data.message || 'Failed to start payment');
        }

        const result = await WebBrowser.openAuthSessionAsync(data.url, 'allversegpt://');

        if (result.type === 'success') {
          const callbackSessionId = result.url
            ? new URL(result.url).searchParams.get('session_id')
            : null;
          const sessionId = callbackSessionId || data.sessionId;
          if (!sessionId) throw new Error('Payment returned without a session ID.');

          const orderId = await confirmPayment(sessionId);
          confirmedOrderIds.push(orderId);
          paidLocal.add(group.sellerId);
          setPaidSellers(new Set(paidLocal));
        } else {
          // User cancelled this seller's payment — stop here, keep progress.
          setProcessing(false);
          setPayingSellerId(null);
          if (paidLocal.size > 0) {
            const remaining = sellerGroups.length - paidLocal.size;
            Alert.alert(
              'Checkout paused',
              `You paid ${paidLocal.size} of ${sellerGroups.length} sellers. ${remaining} ${
                remaining === 1 ? 'seller' : 'sellers'
              } left — tap Pay to finish the rest.`
            );
          } else {
            Alert.alert('Payment Cancelled', 'Your payment was not completed.');
          }
          return;
        }
      }

      // Every seller paid.
      setProcessing(false);
      setPayingSellerId(null);
      router.replace(
        `/checkout-success?order_ids=${encodeURIComponent(confirmedOrderIds.join(','))}` as any
      );
    } catch (error: any) {
      setProcessing(false);
      setPayingSellerId(null);
      Alert.alert('Checkout Failed', error?.message || 'Failed to process checkout');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading checkout..." />;
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.browseButtonText}>Browse Listings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const zipValid = shippingAddress.zip.replace(/[\s-]/g, '').length >= 5;
  const multiSeller = sellerGroups.length > 1;

  const renderShippingOptions = (sellerId: string) => {
    const state = sellerShipping[sellerId] ?? EMPTY_SHIPPING;
    if (!zipValid) {
      return <Text style={styles.noRatesText}>Enter your ZIP above to see shipping options</Text>;
    }
    if (state.loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
          <Text style={styles.loadingText}>Loading shipping rates...</Text>
        </View>
      );
    }
    if (state.error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={colors.error.DEFAULT} />
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      );
    }
    if (state.rates.length === 0) {
      return <Text style={styles.noRatesText}>No shipping options for this address</Text>;
    }
    return (
      <View style={styles.shippingOptions}>
        {state.rates.map((rate) => {
          const tierName = rate.serviceName;
          const isSelected = state.selected?.id === rate.id;
          const isRecommended = tierName.toLowerCase().startsWith('standard');

          let deliveryWindow = '';
          if (tierName.toLowerCase().startsWith('economy')) deliveryWindow = '3–5 days';
          else if (tierName.toLowerCase().startsWith('standard')) deliveryWindow = '2–3 days';
          else if (tierName.toLowerCase().startsWith('express')) deliveryWindow = '1–2 days';
          else if (tierName.toLowerCase().startsWith('overnight')) deliveryWindow = '1 day';
          else if (rate.estimatedDays) deliveryWindow = `Estimated ${rate.estimatedDays} days`;

          return (
            <TouchableOpacity
              key={rate.id}
              style={[styles.shippingOption, isSelected && styles.shippingOptionSelected]}
              onPress={() =>
                setSellerShipping((prev) => ({
                  ...prev,
                  [sellerId]: { ...(prev[sellerId] ?? EMPTY_SHIPPING), selected: rate },
                }))
              }
            >
              <View style={styles.shippingOptionContent}>
                <View style={styles.shippingOptionLeft}>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={isSelected ? colors.brand.DEFAULT : colors.text.muted}
                  />
                  <View style={styles.shippingOptionInfo}>
                    <Text style={styles.shippingOptionName}>{tierName}</Text>
                    {isRecommended && (
                      <View style={[styles.recommendedBadge, { alignSelf: 'flex-start', marginBottom: 2 }]}>
                        <Text style={styles.recommendedBadgeText}>Recommended</Text>
                      </View>
                    )}
                    {!!deliveryWindow && <Text style={styles.shippingOptionDays}>{deliveryWindow}</Text>}
                  </View>
                </View>
                <Text style={styles.shippingOptionPrice}>{formatPrice(rate.price)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Shipping Address (shared across sellers) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.text.muted}
              value={shippingAddress.name}
              onChangeText={(text) => setShippingAddress((prev) => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter street address"
              placeholderTextColor={colors.text.muted}
              value={shippingAddress.street}
              onChangeText={(text) => setShippingAddress((prev) => ({ ...prev, street: text }))}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={colors.text.muted}
                value={shippingAddress.city}
                onChangeText={(text) => setShippingAddress((prev) => ({ ...prev, city: text }))}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={colors.text.muted}
                value={shippingAddress.state}
                onChangeText={(text) => setShippingAddress((prev) => ({ ...prev, state: text }))}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                placeholder="ZIP"
                placeholderTextColor={colors.text.muted}
                value={shippingAddress.zip}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^\d\s-]/g, '');
                  setShippingAddress((prev) => ({ ...prev, zip: cleaned }));
                }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                placeholder="Country"
                placeholderTextColor={colors.text.muted}
                value={shippingAddress.country}
                onChangeText={(text) => setShippingAddress((prev) => ({ ...prev, country: text }))}
              />
            </View>
          </View>
        </View>

        {multiSeller && (
          <View style={styles.multiSellerBanner}>
            <Ionicons name="information-circle-outline" size={18} color={palette.primary[400]} />
            <Text style={styles.multiSellerBannerText}>
              Your cart has {sellerGroups.length} sellers. Each is a separate order with its own
              shipping — you'll pay them one at a time.
            </Text>
          </View>
        )}

        {/* Per-seller cards */}
        {sellerGroups.map((group, index) => {
          const totals = computeSellerTotals(group);
          const isPaid = paidSellers.has(group.sellerId);
          const isPaying = payingSellerId === group.sellerId;

          return (
            <View
              key={group.sellerId}
              style={[styles.sellerCard, isPaid && styles.sellerCardPaid]}
            >
              {/* Seller header */}
              <View style={styles.sellerCardHeader}>
                <View style={styles.sellerCardHeaderLeft}>
                  <Ionicons name="storefront-outline" size={18} color={colors.text.primary} />
                  <Text style={styles.sellerCardName} numberOfLines={1}>
                    {group.sellerName}
                  </Text>
                </View>
                {multiSeller && (
                  isPaid ? (
                    <View style={styles.paidBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success?.DEFAULT ?? palette.primary[400]} />
                      <Text style={styles.paidBadgeText}>Paid</Text>
                    </View>
                  ) : (
                    <Text style={styles.sellerStepText}>
                      Order {index + 1} of {sellerGroups.length}
                    </Text>
                  )
                )}
              </View>

              {/* Items */}
              <View style={styles.sellerItems}>
                {group.items.map((item) => {
                  const l = listings[item.listingId];
                  return (
                    <View key={item.listingId} style={styles.itemRow}>
                      <View style={styles.itemThumb}>
                        {l?.photo ? (
                          <Image source={{ uri: l.photo }} style={styles.itemThumbImg} resizeMode="cover" />
                        ) : (
                          <Ionicons name="image-outline" size={20} color={colors.text.muted} />
                        )}
                      </View>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {l?.title || 'Item'}
                      </Text>
                      <Text style={styles.itemPrice}>{formatPrice(item.priceAtAdd)}</Text>
                    </View>
                  );
                })}
              </View>

              {!isPaid && (
                <>
                  {/* Shipping for this seller */}
                  <Text style={styles.sellerSubheading}>Shipping</Text>
                  {renderShippingOptions(group.sellerId)}

                  {/* Per-seller summary */}
                  <View style={styles.sellerSummary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryValue}>{formatPrice(totals.subtotal)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Tax (8%)</Text>
                      <Text style={styles.summaryValue}>{formatPrice(totals.tax)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Processing Fee</Text>
                      <Text style={styles.summaryValue}>{formatPrice(totals.fees)}</Text>
                    </View>
                    {totals.shipping > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Shipping</Text>
                        <Text style={styles.summaryValue}>{formatPrice(totals.shipping)}</Text>
                      </View>
                    )}
                    <View style={styles.sellerSummaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.sellerTotalLabel}>Seller total</Text>
                      <Text style={styles.sellerTotalValue}>{formatPrice(totals.total)}</Text>
                    </View>
                  </View>
                </>
              )}

              {isPaying && (
                <View style={styles.payingRow}>
                  <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
                  <Text style={styles.payingText}>Opening payment…</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Pay button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.checkoutButton, (processing || !allShippingSelected) && styles.checkoutButtonDisabled]}
          onPress={handlePayAll}
          disabled={processing || !allShippingSelected}
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color={colors.text.primary} />
              <Text style={styles.checkoutButtonText}>
                {multiSeller
                  ? `Pay ${unpaidGroups.length} ${unpaidGroups.length === 1 ? 'seller' : 'sellers'} · ${formatPrice(grandRemainingTotal)}`
                  : `Pay ${formatPrice(grandRemainingTotal)}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.secureText}>
          {multiSeller ? 'Each seller is charged separately · Powered by Stripe' : 'Secure checkout powered by Stripe'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  section: {
    backgroundColor: colors.bg.raised,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text.primary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  multiSellerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.brand.soft,
    borderWidth: 1,
    borderColor: colors.brand.DEFAULT,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  multiSellerBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  sellerCard: {
    backgroundColor: colors.bg.raised,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sellerCardPaid: {
    opacity: 0.7,
  },
  sellerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sellerCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sellerCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flexShrink: 1,
  },
  sellerStepText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paidBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.primary[400],
  },
  sellerItems: {
    gap: 10,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemThumbImg: {
    width: '100%',
    height: '100%',
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 19,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sellerSubheading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  shippingOptions: {
    gap: 12,
  },
  shippingOption: {
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border.subtle,
  },
  shippingOptionSelected: {
    borderColor: colors.brand.DEFAULT,
    backgroundColor: colors.brand.softer,
  },
  shippingOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shippingOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  shippingOptionInfo: {
    flex: 1,
  },
  shippingOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 3,
  },
  shippingOptionDays: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  shippingOptionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.brand.DEFAULT,
    backgroundColor: colors.brand.soft,
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.primary[400],
  },
  noRatesText: {
    color: colors.text.tertiary,
    fontSize: 14,
    paddingVertical: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  loadingText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error.soft,
    borderWidth: 1,
    borderColor: colors.error.border,
    borderRadius: 12,
    padding: 14,
  },
  errorText: {
    flex: 1,
    color: colors.error.DEFAULT,
    fontSize: 14,
  },
  sellerSummary: {
    marginTop: 16,
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    padding: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  sellerSummaryDivider: {
    height: 1,
    backgroundColor: colors.bg.glassHover,
    marginVertical: 8,
  },
  sellerTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sellerTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
  },
  payingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  payingText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  footer: {
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    padding: 20,
    paddingBottom: 32,
  },
  checkoutButton: {
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  checkoutButtonDisabled: {
    backgroundColor: colors.brand.hover,
    opacity: 0.5,
  },
  checkoutButtonText: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  secureText: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  browseButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  browseButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
