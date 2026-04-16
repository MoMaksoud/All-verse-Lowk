import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/api/client';
import { colors, spacing, radii, typography, palette } from '../constants/theme';

interface Profile {
  userId: string;
  username?: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  email?: string;
  gender?: 'male' | 'female' | 'prefer-not-to-say';
  age?: number;
  phoneNumber?: string;
  interestCategories?: string[];
  userActivity?: 'browse-only' | 'buy-only' | 'sell-only' | 'both-buy-sell';
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  shoppingFrequency?: 'daily' | 'weekly' | 'monthly' | 'occasionally' | 'rarely';
  itemConditionPreference?: 'new-only' | 'second-hand-only' | 'both';
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

interface EditProfileModalProps {
  profile: Profile | null;
  onClose: () => void;
  onUpdate: (updatedProfile: Profile) => void;
}

export default function EditProfileModal({ profile, onClose, onUpdate }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    age: '',
    phoneNumber: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        age: profile.age?.toString() || '',
        phoneNumber: profile.phoneNumber || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!formData.username || formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (formData.age && (parseInt(formData.age) < 13 || parseInt(formData.age) > 120)) {
      setError('Age must be between 13 and 120');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const profileData: any = {
        username: formData.username.trim().replace(/^@/, '').replace(/\s+/g, ''),
        displayName: formData.displayName.trim() || formData.username.trim(),
        bio: formData.bio.trim(),
      };

      if (formData.age) {
        profileData.age = parseInt(formData.age);
      }

      if (formData.phoneNumber) {
        profileData.phoneNumber = formData.phoneNumber.trim();
      }

      const response = await apiClient.put('/api/profile', profileData, true);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to update profile');
      }

      const result = await response.json();
      
      if (result.success) {
        onUpdate(result.data);
        Alert.alert('Success', 'Profile updated successfully');
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={palette.primary[400]} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              placeholder="username"
              placeholderTextColor={colors.text.disabled}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helpText}>Must be at least 3 characters, unique</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={formData.displayName}
              onChangeText={(text) => setFormData({ ...formData, displayName: text })}
              placeholder="Your display name"
              placeholderTextColor={colors.text.disabled}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={4}
              maxLength={280}
            />
            <Text style={styles.helpText}>{formData.bio.length}/280 characters</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(text) => setFormData({ ...formData, age: text.replace(/[^0-9]/g, '') })}
              placeholder="Age (13-120)"
              placeholderTextColor={colors.text.disabled}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              placeholder="Phone number"
              placeholderTextColor={colors.text.disabled}
              keyboardType="phone-pad"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.raised,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
  },
  closeButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  saveButton: {
    padding: spacing.sm,
  },
  saveButtonText: {
    color: palette.primary[400],
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  errorContainer: {
    backgroundColor: colors.error.soft,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xl,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: typography.size.base,
  },
  formGroup: {
    marginBottom: spacing['2xl'],
  },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: typography.size.lg,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: typography.size.sm,
    color: colors.text.disabled,
    marginTop: spacing.xs,
  },
});

