import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../../lib/ui/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '../../../constants/theme';
import { apiClient } from '../../../lib/api/client';
import { useAuth } from '../../../contexts/AuthContext';
import LoadingSpinner from '../../../components/LoadingSpinner';

const CATEGORIES = ['Electronics', 'Fashion', 'Home', 'Sports', 'Automotive', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'];

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');

  useEffect(() => {
    if (!currentUser) {
      router.back();
      return;
    }
    if (id) fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const res = await apiClient.get(`/api/listings/${id}`);
      const data = await res.json();
      if (res.ok) {
        const l = data.data || data;
        setTitle(l.title || '');
        setDescription(l.description || '');
        setPrice(String(l.price || ''));
        setCategory(l.category || '');
        setCondition(l.condition || '');
      } else {
        Alert.alert('Error', 'Failed to load listing');
        router.back();
      }
    } catch {
      Alert.alert('Error', 'Failed to load listing');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing field', 'Title is required');
      return;
    }
    const priceNum = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (!priceNum || priceNum <= 0) {
      Alert.alert('Invalid price', 'Enter a valid price greater than $0');
      return;
    }

    try {
      setSaving(true);
      const res = await apiClient.put(
        `/api/listings/${id}`,
        {
          title: title.trim(),
          description: description.trim(),
          price: priceNum,
          category,
          condition,
        },
        true
      );
      if (res.ok) {
        router.back();
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.message || 'Failed to save changes');
      }
    } catch {
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading listing..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Item title"
            placeholderTextColor={colors.text.muted}
            returnKeyType="next"
          />
        </View>

        {/* Price */}
        <View style={styles.field}>
          <Text style={styles.label}>Price (USD)</Text>
          <View style={styles.priceWrap}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
              >
                {category === c && <Ionicons name="checkmark" size={12} color="#fff" />}
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Condition */}
        <View style={styles.field}>
          <Text style={styles.label}>Condition</Text>
          <View style={styles.chipRow}>
            {CONDITIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, condition === c && styles.chipActive]}
                onPress={() => setCondition(c)}
              >
                {condition === c && <Ionicons name="checkmark" size={12} color="#fff" />}
                <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your item..."
            placeholderTextColor={colors.text.muted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  saveButton: {
    minWidth: 50,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text.primary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingLeft: 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginRight: 2,
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingLeft: 0,
  },
  textArea: {
    minHeight: 130,
    paddingTop: 13,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  chipActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.muted,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
