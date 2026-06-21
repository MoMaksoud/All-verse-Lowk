import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from '../../lib/ui/alert';
import { colors, spacing, radii, typography } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api/client';
import { formatPrice } from '../../lib/format';

type Mode = 'buyer' | 'seller';

interface ListingItem {
  title: string;
  price: number;
  image: string;
  url: string;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  type?: 'listings';
  items?: ListingItem[];
}

const BUYER_SUGGESTIONS = [
  'Find me a Nike hoodie under $50',
  'Looking for a MacBook Pro',
  'Show me vintage clothing',
  'What gaming gear is available?',
];

const SELLER_SUGGESTIONS = [
  'How should I price my iPhone 13?',
  'Write a listing for my Jordan 1s',
  'What category fits a vintage lamp?',
  'Tips for selling electronics faster',
];

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const listingIdFromUrl = (url: string): string => {
  const clean = (url || '').split('?')[0];
  return clean.split('/').filter(Boolean).pop() || '';
};

const normalizeItems = (items: unknown): ListingItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
    .map((i) => ({
      title: typeof i.title === 'string' && i.title.trim() ? i.title : 'Untitled listing',
      price: typeof i.price === 'number' && Number.isFinite(i.price) ? i.price : 0,
      image: typeof i.image === 'string' ? i.image : '',
      url: typeof i.url === 'string' && i.url.trim() ? i.url : '/listings',
    }));
};

export default function AssistantScreen() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('buyer');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const hydratingRef = useRef(false);

  // Load persisted conversation when the mode changes.
  useEffect(() => {
    hydratingRef.current = true;
    AsyncStorage.getItem(`ai-chat-${mode}`)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setMessages(Array.isArray(parsed) ? parsed : []);
          } catch {
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
      })
      .finally(() => {
        hydratingRef.current = false;
      });
  }, [mode]);

  // Persist on change (skip while hydrating to avoid clobbering on mode switch).
  useEffect(() => {
    if (hydratingRef.current) return;
    AsyncStorage.setItem(`ai-chat-${mode}`, JSON.stringify(messages)).catch(() => {});
  }, [messages, mode]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || !currentUser) return;

      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const userMsg: Message = { id: newId(), role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);
      scrollToEnd();

      try {
        const res = await apiClient.post(
          '/api/ai/chat',
          { message: trimmed.slice(0, 2000), mode, conversationHistory: history },
          true
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.message || 'Failed to get a response');
        }

        const rd = data.response;
        let aiMsg: Message;
        if (rd && typeof rd === 'object' && rd.type === 'listings' && Array.isArray(rd.items)) {
          aiMsg = {
            id: newId(),
            role: 'ai',
            content: rd.message || 'Here are some items:',
            type: 'listings',
            items: normalizeItems(rd.items),
          };
        } else {
          aiMsg = {
            id: newId(),
            role: 'ai',
            content: typeof rd === 'string' ? rd : rd?.message || 'No response received.',
          };
        }
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: 'ai', content: err?.message || 'Sorry, I hit an error. Please try again.' },
        ]);
      } finally {
        setIsLoading(false);
        scrollToEnd();
      }
    },
    [messages, mode, isLoading, currentUser, scrollToEnd]
  );

  const clearChat = useCallback(() => {
    Alert.alert('Clear conversation', 'This permanently deletes this chat. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([]);
          AsyncStorage.removeItem(`ai-chat-${mode}`).catch(() => {});
        },
      },
    ]);
  }, [mode]);

  const suggestions = mode === 'buyer' ? BUYER_SUGGESTIONS : SELLER_SUGGESTIONS;

  // ── Signed-out gate ───────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.signedOut}>
          <View style={styles.signedOutIcon}>
            <Ionicons name="sparkles" size={32} color={colors.brand.DEFAULT} />
          </View>
          <Text style={styles.signedOutTitle}>AI Assistant</Text>
          <Text style={styles.signedOutText}>
            Sign in to chat with your AI shopping & selling assistant.
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth/signin')}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderBubble = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    if (item.type === 'listings' && item.items && item.items.length > 0) {
      return (
        <View style={[styles.bubbleRow, styles.bubbleRowAi]}>
          <View style={[styles.bubble, styles.bubbleAi]}>
            {!!item.content && <Text style={styles.bubbleAiText}>{item.content}</Text>}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.listingScroll}
              contentContainerStyle={styles.listingScrollContent}
            >
              {item.items.map((it, idx) => {
                const id = listingIdFromUrl(it.url);
                const hasImg = it.image && it.image.startsWith('http');
                return (
                  <TouchableOpacity
                    key={`${id}-${idx}`}
                    style={styles.listingCard}
                    activeOpacity={0.85}
                    onPress={() => id && router.push(`/listing/${id}` as any)}
                  >
                    {hasImg ? (
                      <Image source={{ uri: it.image }} style={styles.listingImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.listingImage, styles.listingImagePlaceholder]}>
                        <Ionicons name="image-outline" size={22} color={colors.text.muted} />
                      </View>
                    )}
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle} numberOfLines={2}>
                        {it.title}
                      </Text>
                      <Text style={styles.listingPrice}>{formatPrice(it.price)}</Text>
                      <Text style={styles.listingView}>View listing →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAi]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          <Text style={isUser ? styles.bubbleUserText : styles.bubbleAiText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={18} color={colors.text.primary} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {mode === 'buyer' ? 'Find anything on the marketplace' : 'Optimize your listings & pricing'}
            </Text>
          </View>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearChat} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        {(['buyer', 'seller'] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.modePill, active && styles.modePillActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={m === 'buyer' ? 'bag-handle-outline' : 'storefront-outline'}
                size={15}
                color={active ? colors.text.primary : colors.text.muted}
              />
              <Text style={[styles.modePillText, active && styles.modePillTextActive]}>
                {m === 'buyer' ? 'Buyer' : 'Seller'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderBubble}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles" size={28} color={colors.brand.DEFAULT} />
              </View>
              <Text style={styles.emptyTitle}>
                {mode === 'buyer' ? 'What are you looking for?' : 'How can I help you sell?'}
              </Text>
              <Text style={styles.emptySubtitle}>Try one of these or type your own</Text>
              <View style={styles.suggestionWrap}>
                {suggestions.map((s) => (
                  <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => send(s)} activeOpacity={0.8}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            isLoading ? (
              <View style={[styles.bubbleRow, styles.bubbleRowAi]}>
                <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={colors.text.muted} />
                  <Text style={styles.typingText}>Thinking…</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={mode === 'buyer' ? 'What are you looking for?' : 'How can I help you sell?'}
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={2000}
            onSubmitEditing={() => send(input)}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.brand.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary },
  headerSubtitle: { fontSize: 12, color: colors.text.muted, marginTop: 1 },
  clearButton: { padding: 6 },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 3,
    gap: 3,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  modePillActive: { backgroundColor: colors.brand.DEFAULT },
  modePillText: { fontSize: 13, fontWeight: typography.weight.semibold, color: colors.text.muted },
  modePillTextActive: { color: colors.text.primary },

  // Messages
  messagesContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, flexGrow: 1 },
  bubbleRow: { marginBottom: spacing.sm + 2, flexDirection: 'row' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAi: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: colors.brand.DEFAULT, borderBottomRightRadius: 6 },
  bubbleAi: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderBottomLeftRadius: 6,
  },
  bubbleUserText: { color: colors.text.primary, fontSize: 15, lineHeight: 21 },
  bubbleAiText: { color: colors.text.primary, fontSize: 15, lineHeight: 21 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { color: colors.text.muted, fontSize: 14 },

  // Listing cards
  listingScroll: { marginTop: 10, marginHorizontal: -4 },
  listingScrollContent: { paddingHorizontal: 4, gap: 10 },
  listingCard: {
    width: 150,
    backgroundColor: colors.bg.raised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  listingImage: { width: '100%', height: 100, backgroundColor: colors.bg.base },
  listingImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  listingInfo: { padding: 10 },
  listingTitle: { fontSize: 13, fontWeight: typography.weight.semibold, color: colors.text.primary, lineHeight: 17, marginBottom: 4 },
  listingPrice: { fontSize: 14, fontWeight: typography.weight.bold, color: colors.brand.DEFAULT, marginBottom: 6 },
  listingView: { fontSize: 12, fontWeight: typography.weight.semibold, color: colors.brand.DEFAULT },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: 40 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: radii.xl,
    backgroundColor: colors.brand.softer,
    borderWidth: 1,
    borderColor: colors.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold, color: colors.text.primary, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.text.muted, marginTop: 4, marginBottom: spacing.lg },
  suggestionWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.full,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  suggestionText: { fontSize: 13, color: colors.text.secondary, fontWeight: typography.weight.medium },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.base,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: colors.text.primary,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.brand.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.brand.hover, opacity: 0.5 },

  // Signed out
  signedOut: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'] },
  signedOutIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.brand.softer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  signedOutTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold, color: colors.text.primary, marginBottom: spacing.sm },
  signedOutText: { fontSize: 15, color: colors.text.tertiary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 21 },
  signInButton: { backgroundColor: colors.brand.DEFAULT, paddingVertical: 13, paddingHorizontal: 32, borderRadius: radii.lg },
  signInButtonText: { color: colors.text.primary, fontSize: 16, fontWeight: typography.weight.semibold },
});
