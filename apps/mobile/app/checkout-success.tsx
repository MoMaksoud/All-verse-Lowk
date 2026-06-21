import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../constants/theme';
import { apiClient } from '../lib/api/client';

export default function CheckoutSuccessScreen() {
  const { session_id, order_ids } = useLocalSearchParams<{
    session_id?: string;
    order_ids?: string;
  }>();
  const [verifying, setVerifying] = useState(true);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session_id) {
      verifyPayment();
    } else if (order_ids) {
      setOrderIds(order_ids.split(',').filter(Boolean));
      setVerifying(false);
    } else {
      setError('No verified payment was provided. Check Orders for the latest status.');
      setVerifying(false);
    }
  }, [session_id, order_ids]);

  const verifyPayment = async () => {
    try {
      const response = await apiClient.get(
        `/api/payments/confirm?session_id=${session_id}`,
        true
      );
      const data = await response.json();
      if (response.ok && data.success) {
        const orderId = data.order?.orderId || data.orderId || data.data?.orderId;
        if (orderId) setOrderIds([orderId]);
        else setError('Payment was verified, but the order could not be found.');
      } else {
        setError(data.message || 'Could not verify payment');
      }
    } catch {
      setError('Could not verify payment. Check your orders.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {verifying ? (
          <>
            <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
            <Text style={styles.verifyingText}>Confirming your order…</Text>
          </>
        ) : error ? (
          <>
            <View style={styles.iconWrap}>
              <Ionicons name="alert-circle" size={72} color={colors.warning.DEFAULT} />
            </View>
            <Text style={styles.title}>Payment received</Text>
            <Text style={styles.subtitle}>{error}</Text>
          </>
        ) : (
          <>
            <View style={styles.iconWrap}>
              <Ionicons name="checkmark-circle" size={88} color={colors.success.DEFAULT} />
            </View>
            <Text style={styles.title}>Order confirmed!</Text>
            <Text style={styles.subtitle}>
              Your payment went through. We'll notify you when your order ships.
            </Text>
            {orderIds.length > 0 && (
              <View style={styles.orderIdBadge}>
                <Text style={styles.orderIdLabel}>
                  {orderIds.length === 1 ? 'ORDER' : `${orderIds.length} ORDERS`}
                </Text>
                <Text style={styles.orderId}>
                  {orderIds.map((id) => `#${id.slice(-8).toUpperCase()}`).join('  ')}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {!verifying && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/' as any)}
          >
            <Text style={styles.primaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/orders' as any)}
          >
            <Text style={styles.secondaryButtonText}>View Orders</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  orderIdBadge: {
    marginTop: 8,
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  orderIdLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.muted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
    letterSpacing: 1,
  },
  verifyingText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.text.secondary,
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryButtonText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
