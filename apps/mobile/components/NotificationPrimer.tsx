import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api/client';
import { registerForPushNotifications, Notifications } from '../lib/notifications';
import { colors, spacing, radii, typography } from '../constants/theme';

const PROMPT_SHOWN_KEY = 'notif-prompt-shown';

/**
 * Custom pre-permission priming. Instead of firing the OS notification prompt
 * cold on login (which gets denied and can never be re-asked on iOS), we show a
 * themed modal explaining the value first, and only call the system prompt when
 * the user opts in. If permission is already granted, we silently refresh the
 * push token.
 */
export function NotificationPrimer() {
  const { currentUser } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setVisible(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (cancelled) return;

        if (status === 'granted') {
          // Already allowed — just keep the token fresh.
          const token = await registerForPushNotifications();
          if (token) apiClient.post('/api/notifications/token', { token }, true).catch(() => {});
          return;
        }
        if (status === 'denied') return;

        // Undetermined — show priming once.
        const shown = await AsyncStorage.getItem(PROMPT_SHOWN_KEY);
        if (!shown && !cancelled) setVisible(true);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  const dismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem(PROMPT_SHOWN_KEY, '1').catch(() => {});
  };

  const enable = async () => {
    setVisible(false);
    await AsyncStorage.setItem(PROMPT_SHOWN_KEY, '1').catch(() => {});
    const token = await registerForPushNotifications();
    if (token) apiClient.post('/api/notifications/token', { token }, true).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications" size={26} color={colors.brand.DEFAULT} />
          </View>
          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.body}>
            Get notified when someone messages you, makes an offer, or buys your item. No spam —
            just the stuff that matters.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={enable} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Enable notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={dismiss} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bg.raised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.brand.softer,
    borderWidth: 1,
    borderColor: colors.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: typography.weight.bold,
  },
  secondaryButton: {
    paddingVertical: 12,
    marginTop: 4,
  },
  secondaryButtonText: {
    color: colors.text.muted,
    fontSize: 14,
    fontWeight: typography.weight.semibold,
  },
});
