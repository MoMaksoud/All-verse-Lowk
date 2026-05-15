import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, palette } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../lib/api/client';
import LoadingSpinner from '../../../components/LoadingSpinner';

interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  photos?: string[];
  sellerId?: string;
  sold?: boolean;
  inventory?: number;
}

const normalizeImageUrl = (url?: string | null) => {
  if (!url) return 'https://via.placeholder.com/400';
  if (url.startsWith('http')) return url;
  return 'https://via.placeholder.com/400';
};

const getResponseMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    return data?.message || data?.error || data?.details || fallback;
  } catch {
    return fallback;
  }
};

export default function EditListingPriceScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const { currentUser, loading: authLoading } = useAuth();
  const listingId = useMemo(() => {
    const value = Array.isArray(idParam) ? idParam[0] : idParam;
    return typeof value === 'string' ? value.trim() : '';
  }, [idParam]);

  const [listing, setListing] = useState<Listing | null>(null);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      setLoading(false);
      setError('Please sign in to edit this listing.');
      return;
    }

    fetchListing();
  }, [authLoading, currentUser, listingId]);

  const fetchListing = async () => {
    if (!listingId) {
      setError('Listing is unavailable.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/api/listings/${listingId}`, false);
      if (!response.ok) {
        const message = await getResponseMessage(response, 'Failed to load listing.');
        throw new Error(message);
      }

      const data = await response.json();
      const listingData = data.data || data;

      if (!listingData?.id) {
        throw new Error('Listing data is unavailable.');
      }

      if (listingData.sellerId !== currentUser?.uid) {
        setListing(null);
        setError('You can only edit your own listings.');
        return;
      }

      setListing(listingData);
      setPrice(String(listingData.price ?? ''));
    } catch (err: any) {
      setError(err?.message || 'Failed to load listing.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!listingId || !listing) return;

    const normalizedPrice = price.replace(/[$,]/g, '').trim();
    const priceNumber = Number.parseFloat(normalizedPrice);

    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      Alert.alert('Invalid Price', 'Please enter a price greater than 0.');
      return;
    }

    try {
      setSaving(true);
      const roundedPrice = Math.round(priceNumber * 100) / 100;
      const response = await apiClient.put(`/api/listings/${listingId}`, { price: roundedPrice }, true);

      if (!response.ok) {
        const message = await getResponseMessage(response, 'Failed to update listing price.');
        throw new Error(message);
      }

      const data = await response.json().catch(() => ({}));
      const updatedListing = data.data || data;
      if (updatedListing?.price !== undefined) {
        setListing(updatedListing);
        setPrice(String(updatedListing.price));
      }

      Alert.alert('Price Updated', 'Your listing price has been updated.', [
        {
          text: 'OK',
          onPress: () => router.replace(`/listing/${listingId}` as any),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update listing price.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Loading listing..." />;
  }

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.error.DEFAULT} />
          <Text style={styles.errorTitle}>Unable to Edit Listing</Text>
          <Text style={styles.errorText}>{error || 'Listing not found.'}</Text>
          {!currentUser ? (
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/auth/signin')}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const isSold = (listing.sold ?? false) || listing.inventory === 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.previewCard}>
            <Image
              source={{ uri: normalizeImageUrl(listing.photos?.[0]) }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <View style={styles.previewInfo}>
              <Text style={styles.previewLabel}>Editing price for</Text>
              <Text style={styles.previewTitle} numberOfLines={2}>{listing.title}</Text>
              <Text style={styles.currentPrice}>Current price: ${listing.price.toFixed(2)}</Text>
            </View>
          </View>

          {isSold && (
            <View style={styles.warningBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.warning.text} />
              <Text style={styles.warningText}>
                This item is marked sold. Price changes are intended for active listings.
              </Text>
            </View>
          )}

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Update Price</Text>
            <Text style={styles.label}>New Price</Text>
            <View style={styles.priceInput}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.text.muted}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.cancelButton]}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color={colors.text.primary} />
                <Text style={styles.saveButtonText}>Save Price</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  previewImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.bg.raised,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  previewLabel: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 15,
    color: colors.brand.DEFAULT,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning.soft,
    borderWidth: 1,
    borderColor: colors.warning.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    color: colors.warning.text,
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currency: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 14,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  footerButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.brand.DEFAULT,
  },
  saveButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
