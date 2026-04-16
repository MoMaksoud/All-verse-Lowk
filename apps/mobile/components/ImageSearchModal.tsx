import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { apiClient } from '../lib/api/client';
import { colors, spacing, radii, typography, palette } from '../constants/theme';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Mobile port of apps/web/src/components/search/ImageSearchModal.tsx.
 *
 * Flow:
 *  1. User taps "Take Photo" (camera) or "Upload Image" (media library).
 *  2. Expo Image Picker returns a local URI.
 *  3. On "Search", we POST the image as multipart/form-data to
 *     /api/search/image. The API responds with `{ extractedQuery, brand?,
 *     model?, category? }`, exactly like the web version.
 *  4. Navigate to the search tab with the extracted query + imageSearch flag.
 */
export default function ImageSearchModal({ isOpen, onClose }: ImageSearchModalProps) {
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSelectedImageUri(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleTakePhoto = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  }, []);

  const handlePickFromLibrary = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setSelectedImageUri(null);
    setError(null);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!selectedImageUri) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Build multipart form data. The API expects a field named "image".
      const formData = new FormData();
      // React Native FormData accepts { uri, name, type } shape.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formData.append('image', {
        uri: selectedImageUri,
        name: 'search-image.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await apiClient.post('/api/search/image', formData, false);

      if (!response.ok) {
        let message = 'Image search failed';
        try {
          const errorData = await response.json();
          message = errorData.error || message;
        } catch {
          // ignore parse error
        }
        throw new Error(message);
      }

      const data = await response.json();
      const query = data.extractedQuery || 'image search';

      const params = new URLSearchParams({ q: query, imageSearch: 'true' });
      if (data.brand) params.set('brand', data.brand);
      if (data.model) params.set('model', data.model);
      if (data.category) params.set('category', data.category);

      handleClose();
      router.push(`/(tabs)/search?${params.toString()}` as any);
    } catch (err: any) {
      console.error('Image search error:', err);
      setError(err?.message || 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImageUri, handleClose]);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.closeButton} />
          <Text style={styles.headerTitle}>Search with Image</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.subtitle}>
            Take a photo or choose an image to find matching products
          </Text>

          {/* Image preview */}
          {selectedImageUri && (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={handleRemoveImage}
                style={styles.removeButton}
                accessibilityLabel="Remove image"
              >
                <Ionicons name="close" size={18} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Upload options (hidden once an image is chosen) */}
          {!selectedImageUri && (
            <View style={styles.options}>
              <TouchableOpacity style={styles.optionCard} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={24} color={colors.brand.DEFAULT} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionDescription}>Use your camera</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionCard} onPress={handlePickFromLibrary}>
                <Ionicons name="cloud-upload-outline" size={24} color={colors.brand.DEFAULT} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Upload Image</Text>
                  <Text style={styles.optionDescription}>Choose from your library</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Footer actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.footerButton, styles.cancelButton]}
            disabled={isProcessing}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          {selectedImageUri && (
            <TouchableOpacity
              onPress={handleSearch}
              disabled={isProcessing}
              style={[
                styles.footerButton,
                styles.searchButton,
                isProcessing && styles.searchButtonDisabled,
              ]}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color={colors.text.primary} />
                  <Text style={styles.searchButtonText}>Processing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="search" size={18} color={colors.text.primary} />
                  <Text style={styles.searchButtonText}>Search</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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
    borderBottomColor: colors.border.subtle,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  body: {
    flex: 1,
    padding: spacing.xl,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    marginBottom: spacing.xl,
  },
  previewContainer: {
    aspectRatio: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.brand.ring,
    backgroundColor: colors.bg.surface,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.error.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  errorBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.error.soft,
    borderWidth: 1,
    borderColor: colors.error.border,
    borderRadius: radii.md,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: typography.size.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  cancelButton: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  searchButton: {
    backgroundColor: colors.brand.DEFAULT,
  },
  searchButtonDisabled: {
    backgroundColor: colors.brand.DEFAULT,
    opacity: 0.6,
  },
  searchButtonText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
});
