import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'large',
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color="#60a5fa" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

