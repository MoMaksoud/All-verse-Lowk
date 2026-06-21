import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Alert } from '../../lib/ui/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') ?? 'https://www.allversegpt.com';

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SetupProfileScreen() {
  const { currentUser, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [saving, setSaving] = useState(false);

  const debouncedUsername = useDebouncedValue(username.trim().toLowerCase(), 500);

  // Check username availability
  useEffect(() => {
    if (!debouncedUsername) { setUsernameStatus('idle'); return; }
    if (debouncedUsername.length < 3) { setUsernameStatus('invalid'); return; }
    if (!/^[a-z0-9_]+$/.test(debouncedUsername)) { setUsernameStatus('invalid'); return; }

    setUsernameStatus('checking');
    fetch(`${API_BASE}/api/users/check-username?username=${encodeURIComponent(debouncedUsername)}`)
      .then(r => r.json())
      .then(data => {
        setUsernameStatus(data.available ? 'available' : 'taken');
      })
      .catch(() => setUsernameStatus('idle'));
  }, [debouncedUsername]);

  const handleSave = async () => {
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!trimmedUsername) { Alert.alert('Required', 'Please choose a username.'); return; }
    if (trimmedUsername.length < 3) { Alert.alert('Too short', 'Username must be at least 3 characters.'); return; }
    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert('Invalid', 'Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (!trimmedName) { Alert.alert('Required', 'Please enter your display name.'); return; }
    if (usernameStatus === 'taken') { Alert.alert('Taken', 'That username is already taken.'); return; }

    setSaving(true);
    try {
      const { getIdToken } = await import('../../lib/firebase/auth');
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: trimmedUsername, displayName: trimmedName }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Error', data.details || data.error || 'Failed to save profile.');
        return;
      }

      await refreshProfile();
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const usernameIcon = () => {
    if (usernameStatus === 'checking') return <ActivityIndicator size="small" color={colors.text.muted} />;
    if (usernameStatus === 'available') return <Ionicons name="checkmark-circle" size={20} color="#22c55e" />;
    if (usernameStatus === 'taken') return <Ionicons name="close-circle" size={20} color="#ef4444" />;
    if (usernameStatus === 'invalid') return <Ionicons name="alert-circle" size={20} color="#f59e0b" />;
    return null;
  };

  const usernameHint = () => {
    if (usernameStatus === 'available') return { text: 'Username is available', color: '#22c55e' };
    if (usernameStatus === 'taken') return { text: 'Username is already taken', color: '#ef4444' };
    if (usernameStatus === 'invalid') return { text: 'Only letters, numbers, and underscores (min 3)', color: '#f59e0b' };
    return null;
  };

  const hint = usernameHint();
  const canSubmit = usernameStatus === 'available' && displayName.trim().length > 0 && !saving;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>This is how other users will see you on AllVerse</Text>
          </View>

          <View style={styles.form}>
            {/* Display Name */}
            <View>
              <Text style={styles.label}>Display Name</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor={colors.text.muted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Username */}
            <View>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputRow}>
                <Text style={styles.atSign}>@</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="your_username"
                  placeholderTextColor={colors.text.muted}
                  value={username}
                  onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                <View style={styles.statusIcon}>{usernameIcon()}</View>
              </View>
              {hint && <Text style={[styles.hint, { color: hint.color }]}>{hint.text}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!canSubmit}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.buttonText}>Continue</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text.primary, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.text.tertiary, lineHeight: 22 },
  form: { gap: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  atSign: { fontSize: 16, color: colors.text.muted, marginRight: 4 },
  input: { fontSize: 16, color: colors.text.primary, flex: 1 },
  statusIcon: { marginLeft: 8, width: 24, alignItems: 'center' },
  hint: { fontSize: 12, marginTop: 6, marginLeft: 4 },
  button: {
    backgroundColor: colors.brand.DEFAULT, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
