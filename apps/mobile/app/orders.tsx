import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { apiClient } from '../lib/api/client';
import LoadingSpinner from '../components/LoadingSpinner';

interface OrderItem {
  listingId: string;
  title: string;
  price: number;
  qty: number;
  sellerId?: string;
  photos?: string[];
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  subtotal?: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string | null;
  paidAt?: string | null;
  shippingAddress?: {
    city?: string;
    state?: string;
    country?: string;
  };
  trackingNumber?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: '#f59e0b' },
  paid:      { label: 'Paid',      color: '#3b82f6' },
  shipped:   { label: 'Shipped',   color: '#8b5cf6' },
  delivered: { label: 'Delivered', color: '#10b981' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
};

function OrderCard({ order }: { order: Order }) {
  const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
  const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }) : null;

  const firstItem = order.items?.[0];
  const extraCount = (order.items?.length ?? 1) - 1;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>#{order.id.slice(-8).toUpperCase()}</Text>
          {date ? <Text style={styles.orderDate}>{date}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '22' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {firstItem?.title ?? 'Order'}
          </Text>
          {extraCount > 0 && (
            <Text style={styles.extraItems}>+{extraCount} more item{extraCount > 1 ? 's' : ''}</Text>
          )}
        </View>
        <Text style={styles.total}>${(order.total / 100).toFixed(2)}</Text>
      </View>

      {order.trackingNumber ? (
        <View style={styles.trackingRow}>
          <Ionicons name="cube-outline" size={14} color={colors.text.muted} />
          <Text style={styles.trackingText}>Tracking: {order.trackingNumber}</Text>
        </View>
      ) : null}

      {order.shippingAddress?.city ? (
        <View style={styles.trackingRow}>
          <Ionicons name="location-outline" size={14} color={colors.text.muted} />
          <Text style={styles.trackingText}>
            {order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/orders', true);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  if (loading) return <LoadingSpinner message="Loading orders..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.DEFAULT}
          />
        }
        renderItem={({ item }) => <OrderCard order={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={64} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>Items you buy will show up here</Text>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() => router.push('/(tabs)' as any)}
            >
              <Text style={styles.shopBtnText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  listContent: { padding: 16, gap: 12, flexGrow: 1 },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: { fontSize: 13, fontWeight: '700', color: colors.text.primary, letterSpacing: 0.5 },
  orderDate: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  extraItems: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  total: { fontSize: 16, fontWeight: '700', color: colors.brand.DEFAULT },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackingText: { fontSize: 12, color: colors.text.muted },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  emptySubtitle: { fontSize: 14, color: colors.text.muted },
  shopBtn: {
    backgroundColor: colors.brand.DEFAULT,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  shopBtnText: { color: colors.text.primary, fontSize: 15, fontWeight: '700' },
});
