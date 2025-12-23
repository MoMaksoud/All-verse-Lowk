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
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#60a5fa" />
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
              placeholderTextColor="#666"
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
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#666"
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
              placeholderTextColor="#666"
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
              placeholderTextColor="#666"
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
    backgroundColor: '#0f1b2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

