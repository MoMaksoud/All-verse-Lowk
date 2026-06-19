import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function VerifyEmailScreen() {
  const { currentUser, sendVerificationEmail, reloadUser, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-poll every 4s to detect when user clicks the email link
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      await reloadUser();
    }, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    setResending(true);
    const { error } = await sendVerificationEmail();
    setResending(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setCooldown(60);
      Alert.alert('Sent', 'Verification email resent. Check your inbox.');
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    await reloadUser();
    setChecking(false);
    // If still not verified after manual check
    if (!currentUser?.emailVerified) {
      Alert.alert('Not yet', "We haven't received your verification yet. Check your email and click the link.");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/signin' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-outline" size={48} color={colors.brand.DEFAULT} />
        </View>

        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to{'\n'}
          <Text style={styles.email}>{currentUser?.email}</Text>
        </Text>
        <Text style={styles.hint}>
          Click the link in the email to continue. This page will update automatically.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckNow}
          disabled={checking}
        >
          {checking
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.primaryButtonText}>I've verified my email</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, (resending || cooldown > 0) && styles.buttonDisabled]}
          onPress={handleResend}
          disabled={resending || cooldown > 0}
        >
          <Text style={styles.secondaryButtonText}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend email'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Use a different account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: 'rgba(59,130,246,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.text.primary, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.text.tertiary, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  email: { color: colors.text.primary, fontWeight: '600' },
  hint: { fontSize: 13, color: colors.text.muted, textAlign: 'center', lineHeight: 20, marginBottom: 36, paddingHorizontal: 16 },
  primaryButton: {
    width: '100%', backgroundColor: colors.brand.DEFAULT,
    borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryButton: {
    width: '100%', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border.subtle, marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  secondaryButtonText: { color: colors.text.secondary, fontSize: 15, fontWeight: '500' },
  signOutButton: { paddingVertical: 8 },
  signOutText: { color: colors.text.muted, fontSize: 13 },
});
