import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { colors, palette } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api/client';
import LoadingSpinner from '../components/LoadingSpinner';

interface CartItem {
  listingId: string;
  sellerId: string;
  qty: number;
  priceAtAdd: number;
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

export default function CheckoutScreen() {
  const { currentUser } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: currentUser?.displayName || '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingRate | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [shipmentId, setShipmentId] = useState<string | null>(null);

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

      if (response.ok) {
        const data = await response.json();
        const cart = data.data || data;
        setCartItems(cart.items || []);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      Alert.alert('Error', 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shippingAddress.zip && shippingAddress.zip.length >= 5 && cartItems.length > 0) {
      fetchShippingRates();
    } else {
      setShippingRates([]);
      setSelectedShipping(null);
      setShipmentId(null);
    }
  }, [shippingAddress.zip, cartItems]);

  const fetchShippingRates = async () => {
    if (!shippingAddress.zip || shippingAddress.zip.length < 5 || cartItems.length === 0) return;

    // Clean and validate ZIP code (remove spaces, dashes, keep only digits)
    const cleanZip = shippingAddress.zip.replace(/[\s-]/g, '');
    if (cleanZip.length < 5) {
      setRatesError('ZIP code must be at least 5 digits');
      setShippingRates([]);
      return;
    }

    try {
      setLoadingRates(true);
      setRatesError(null);
      
      // Get seller ZIP (default to 10001 if unavailable)
      let fromZip = '10001';
      if (cartItems.length > 0) {
        try {
          const sellerId = cartItems[0].sellerId;
          const sellerResponse = await apiClient.get(`/api/profile?userId=${sellerId}`, false);
          if (sellerResponse.ok) {
            const sellerData = await sellerResponse.json();
            const sellerZip = sellerData.data?.shippingAddress?.zip;
            if (sellerZip) {
              fromZip = sellerZip.replace(/[\s-]/g, '').substring(0, 5);
            }
          }
        } catch (error) {
          // Use default ZIP
        }
      }

      // Use only first 5 digits for API (standard US ZIP format)
      const toZip = cleanZip.substring(0, 5);

      // Call shipping rates API with package dimensions
      const response = await apiClient.post(
        '/api/shipping/get-rates',
        {
          weight: 2, // Default weight in pounds
          length: 12,
          width: 8,
          height: 6,
          fromZip,
          toZip,
          toAddress: {
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: toZip,
            country: shippingAddress.country,
          },
        },
        true
      );

      if (response.ok) {
        const data = await response.json();
        if (data.rates && data.rates.length > 0) {
          setShippingRates(data.rates);
          setShipmentId(data.shipmentId || null);
          setRatesError(null);
          
          // Auto-select first (cheapest) rate
          setSelectedShipping(data.rates[0]);
        } else {
          setRatesError('No shipping rates available for this address');
          setShippingRates([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch shipping rates' }));
        setRatesError(errorData.error || errorData.message || 'Failed to load shipping rates');
        setShippingRates([]);
      }
    } catch (error: any) {
      console.error('Error fetching shipping rates:', error);
      setRatesError(error?.message || 'Failed to fetch shipping rates. Please try again.');
      setShippingRates([]);
    } finally {
      setLoadingRates(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.priceAtAdd * item.qty, 0);
    const tax = subtotal * 0.08; // 8% tax
    const shipping = selectedShipping?.price || 0;
    const fees = (subtotal + tax + shipping) * 0.029 + 0.30; // Stripe fees
    const total = subtotal + tax + fees + shipping;

    return { subtotal, tax, fees, shipping, total };
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to checkout');
      return;
    }

    // Validate shipping address
    if (!shippingAddress.name || !shippingAddress.street || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.zip) {
      Alert.alert('Invalid Address', 'Please fill in all shipping address fields');
      return;
    }

    if (!selectedShipping) {
      Alert.alert('Shipping Required', 'Please select a shipping option');
      return;
    }

    try {
      setProcessing(true);

      // Create hosted Stripe Checkout session
      const response = await apiClient.post(
        '/api/payments/create-checkout-session',
        {
          cartItems,
          shippingAddress,
          selectedShipping: {
            rateId: selectedShipping.id,
            shipmentId: shipmentId,
            carrier: selectedShipping.carrier,
            serviceName: selectedShipping.serviceName,
            price: selectedShipping.price,
          },
        },
        true
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to create checkout session');
      }

      if (!data.url) {
        throw new Error('No checkout URL returned');
      }

      await Linking.openURL(data.url);
    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Checkout Failed', error?.message || 'Failed to process checkout');
    } finally {
      setProcessing(false);
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
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.browseButtonText}>Browse Listings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { subtotal, tax, fees, shipping, total } = calculateTotals();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.text.muted}
              value={shippingAddress.name}
              onChangeText={(text) => setShippingAddress(prev => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter street address"
              placeholderTextColor={colors.text.muted}
              value={shippingAddress.street}
              onChangeText={(text) => setShippingAddress(prev => ({ ...prev, street: text }))}
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
                onChangeText={(text) => setShippingAddress(prev => ({ ...prev, city: text }))}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={colors.text.muted}
                value={shippingAddress.state}
                onChangeText={(text) => setShippingAddress(prev => ({ ...prev, state: text }))}
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
                  // Only allow digits, spaces, and dashes
                  const cleaned = text.replace(/[^\d\s-]/g, '');
                  setShippingAddress(prev => ({ ...prev, zip: cleaned }));
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
                onChangeText={(text) => setShippingAddress(prev => ({ ...prev, country: text }))}
              />
            </View>
          </View>
        </View>

        {/* Shipping Options */}
        {shippingAddress.zip && shippingAddress.zip.length >= 5 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Options</Text>
            {loadingRates ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
                <Text style={styles.loadingText}>Loading shipping rates...</Text>
              </View>
            ) : ratesError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.error.DEFAULT} />
                <Text style={styles.errorText}>{ratesError}</Text>
              </View>
            ) : shippingRates.length > 0 ? (
              <View style={styles.shippingOptions}>
                {shippingRates.map((rate) => {
                  const tierName = rate.serviceName;
                  const isSelected = selectedShipping?.id === rate.id;
                  const isRecommended = tierName.toLowerCase().startsWith('standard');

                  let deliveryWindow = '';
                  if (tierName.toLowerCase().startsWith('economy')) {
                    deliveryWindow = '3–5 days';
                  } else if (tierName.toLowerCase().startsWith('standard')) {
                    deliveryWindow = '2–3 days';
                  } else if (tierName.toLowerCase().startsWith('express')) {
                    deliveryWindow = '1–2 days';
                  } else if (tierName.toLowerCase().startsWith('overnight')) {
                    deliveryWindow = '1 day';
                  } else if (rate.estimatedDays) {
                    deliveryWindow = `Estimated ${rate.estimatedDays} days`;
                  }

                  return (
                    <TouchableOpacity
                      key={rate.id}
                      style={[
                        styles.shippingOption,
                        isSelected && styles.shippingOptionSelected,
                      ]}
                      onPress={() => setSelectedShipping(rate)}
                    >
                      <View style={styles.shippingOptionContent}>
                        <View style={styles.shippingOptionLeft}>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={24}
                            color={isSelected ? colors.brand.DEFAULT : colors.text.muted}
                          />
                          <View style={styles.shippingOptionInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.shippingOptionName}>{tierName}</Text>
                              {isRecommended && (
                                <View style={styles.recommendedBadge}>
                                  <Text style={styles.recommendedBadgeText}>Recommended</Text>
                                </View>
                              )}
                            </View>
                            {!!deliveryWindow && (
                              <Text style={styles.shippingOptionDays}>{deliveryWindow}</Text>
                            )}
                          </View>
                        </View>
                        <Text style={styles.shippingOptionPrice}>${rate.price.toFixed(2)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noRatesText}>Enter a valid ZIP code to see shipping options</Text>
            )}
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({cartItems.length} items)</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (8%)</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Processing Fee</Text>
            <Text style={styles.summaryValue}>${fees.toFixed(2)}</Text>
          </View>

          {selectedShipping && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>${shipping.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.checkoutButton, processing && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={processing || !selectedShipping}
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <>
              <Text style={styles.checkoutButtonText}>
                Pay ${total.toFixed(2)}
              </Text>
              <Ionicons name="lock-closed" size={20} color={colors.text.primary} />
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.secureText}>Secure checkout powered by Stripe</Text>
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
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  shippingOptions: {
    gap: 12,
  },
  shippingOption: {
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    padding: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  shippingOptionCarrier: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  shippingOptionDays: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  shippingOptionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
  },
  noRatesText: {
    color: colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error.soft,
    borderWidth: 1,
    borderColor: colors.error.border,
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    flex: 1,
    color: colors.error.DEFAULT,
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.text.tertiary,
  },
  summaryValue: {
    fontSize: 15,
    color: colors.text.tertiary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.bg.glassHover,
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brand.DEFAULT,
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
    fontSize: 18,
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
