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
} from 'react-native';
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
    const fees = subtotal * 0.029 + 0.30; // Stripe fees
    const shipping = selectedShipping?.price || 0;
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

      // Create payment intent
      const response = await apiClient.post(
        '/api/payments/create-intent',
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
        throw new Error(data.error || data.message || 'Failed to create payment intent');
      }

      // For mobile, we'll redirect to a web checkout or use Stripe's payment sheet
      // For now, show success and redirect
      Alert.alert(
        'Payment Intent Created',
        'Redirecting to payment...',
        [
          {
            text: 'OK',
            onPress: () => {
              // TODO: Integrate Stripe Payment Sheet for mobile
              // For now, redirect to orders page
              router.push('/(tabs)/profile');
            },
          },
        ]
      );
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
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
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={shippingAddress.name}
              onChangeText={(text) => setShippingAddress(prev => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter street address"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={shippingAddress.city}
                onChangeText={(text) => setShippingAddress(prev => ({ ...prev, city: text }))}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
                <ActivityIndicator size="small" color="#60a5fa" />
                <Text style={styles.loadingText}>Loading shipping rates...</Text>
              </View>
            ) : ratesError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{ratesError}</Text>
              </View>
            ) : shippingRates.length > 0 ? (
              <View style={styles.shippingOptions}>
                {shippingRates.map((rate) => (
                  <TouchableOpacity
                    key={rate.id}
                    style={[
                      styles.shippingOption,
                      selectedShipping?.id === rate.id && styles.shippingOptionSelected,
                    ]}
                    onPress={() => setSelectedShipping(rate)}
                  >
                    <View style={styles.shippingOptionContent}>
                      <View style={styles.shippingOptionLeft}>
                        <Ionicons
                          name={selectedShipping?.id === rate.id ? 'radio-button-on' : 'radio-button-off'}
                          size={24}
                          color={selectedShipping?.id === rate.id ? '#60a5fa' : 'rgba(255, 255, 255, 0.5)'}
                        />
                        <View style={styles.shippingOptionInfo}>
                          <Text style={styles.shippingOptionName}>{rate.serviceName}</Text>
                          <Text style={styles.shippingOptionCarrier}>{rate.carrier}</Text>
                          {rate.estimatedDays && (
                            <Text style={styles.shippingOptionDays}>
                              Estimated {rate.estimatedDays} days
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.shippingOptionPrice}>${rate.price.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
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
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.checkoutButtonText}>
                Pay ${total.toFixed(2)}
              </Text>
              <Ionicons name="lock-closed" size={20} color="#fff" />
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
    backgroundColor: '#0f1b2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#fff',
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
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  shippingOptions: {
    gap: 12,
  },
  shippingOption: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  shippingOptionSelected: {
    borderColor: '#60a5fa',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
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
    color: '#fff',
    marginBottom: 4,
  },
  shippingOptionCarrier: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  shippingOptionDays: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  shippingOptionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#60a5fa',
  },
  noRatesText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  summaryValue: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  footer: {
    backgroundColor: '#1a2332',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    paddingBottom: 32,
  },
  checkoutButton: {
    backgroundColor: '#60a5fa',
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
    backgroundColor: 'rgba(96, 165, 250, 0.5)',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secureText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
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
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  browseButton: {
    backgroundColor: '#60a5fa',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

