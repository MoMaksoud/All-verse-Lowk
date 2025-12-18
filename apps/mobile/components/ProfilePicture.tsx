import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';

interface ProfilePictureProps {
  src?: string | null;
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

const fontSizeMap = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
};

export default function ProfilePicture({
  src,
  name,
  email,
  size = 'md',
  style,
}: ProfilePictureProps) {
  const [imageError, setImageError] = useState(false);
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];

  const normalizeImageUrl = (url?: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url === '/logo.png') {
      // Return a placeholder for now since we can't use Next.js public folder
      return null;
    }
    return null;
  };

  const getInitials = (): string => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const imageUrl = normalizeImageUrl(src);
  const showFallback = !imageUrl || imageError;

  if (showFallback) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          },
          style,
        ]}
      >
        <Text style={[styles.initials, { fontSize }]}>{getInitials()}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
        style,
      ]}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        }}
        onError={() => setImageError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#0E1526',
  },
  fallback: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
});

