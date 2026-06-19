import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image, Alert } from 'react-native';
import {colors} from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import UserSearchModal from '../../components/UserSearchModal';
import ProfilePicture from '../../components/ProfilePicture';

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    senderId: string;
    text: string;
    timestamp: any;
  };
  otherUser?: {
    id: string;
    name: string;
    username?: string;
    email: string;
    photoURL?: string;
  };
  unreadCount?: { [userId: string]: number };
  lastOpenedAt?: { [userId: string]: any }; // Timestamp when each user last opened this chat
  createdAt?: any;
  updatedAt?: any;
}

const LAST_OPENED_MESSAGES_PAGE_KEY = 'lastOpenedMessagesPageAt';

export default function MessagesScreen() {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [lastOpenedTimestamp, setLastOpenedTimestamp] = useState<number>(0);

  const fetchChats = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await apiClient.get('/api/chats', true);
      
      // Handle 404 or other non-OK responses
      if (response.status === 404) {
        setChats([]);
        setError(null); // 404 is OK for new users with no chats
        return;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        // Check if response is HTML (error page)
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
          setError('Server error: Please try again later');
        } else {
          try {
            const errorData = JSON.parse(errorText);
            setError(errorData.message || 'Failed to load chats');
          } catch {
            setError('Failed to load chats');
          }
        }
        setChats([]);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        setChats(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to load chats');
        setChats([]);
      }
    } catch (err: any) {
      // Handle JSON parse errors
      if (err?.message?.includes('JSON') || err?.message?.includes('<!DOCTYPE')) {
        setError('Server error: Invalid response. Please try again.');
      } else {
        setError(err?.message || 'Failed to load chats');
      }
      setChats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  // Load last opened timestamp from AsyncStorage
  useEffect(() => {
    const loadLastOpenedTimestamp = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const key = `${LAST_OPENED_MESSAGES_PAGE_KEY}_${currentUser.uid}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          setLastOpenedTimestamp(parseInt(stored, 10));
        }
      } catch (error) {
        console.error('Error loading last opened timestamp:', error);
      }
    };
    
    loadLastOpenedTimestamp();
  }, [currentUser?.uid]);

  // Don't update timestamp when messages page opens - only update when user opens a specific chat
  // This keeps unread indicators visible until user actually views the chat

  useEffect(() => {
    if (currentUser) {
      fetchChats();

      // Single 5s polling interval; cleanup on unmount or when currentUser changes
      const interval = setInterval(() => {
        fetchChats();
      }, 5000);

      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [currentUser, fetchChats]);

  // Refresh chats when screen comes into focus (e.g., when returning from a chat)
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        // Reload last opened timestamp from AsyncStorage (don't update it - only update when chat is opened)
        const loadTimestamp = async () => {
          try {
            const key = `${LAST_OPENED_MESSAGES_PAGE_KEY}_${currentUser.uid}`;
            const stored = await AsyncStorage.getItem(key);
            if (stored) {
              setLastOpenedTimestamp(parseInt(stored, 10));
            }
          } catch (error) {
            // Ignore errors
          }
        };
        
        loadTimestamp();
        
        // Refresh chats when screen comes into focus
        fetchChats();
        
        // Also refresh after a delay to catch any server-side updates
        const timeout = setTimeout(() => {
          fetchChats();
        }, 500);
        
        return () => {
          clearTimeout(timeout);
        };
      }
    }, [currentUser, fetchChats])
  );

  // Prevents concurrent onPress executions from stacking async handles in the GC scope
  const navigatingRef = useRef(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchChats();
  }, [currentUser]);

  const handleSelectUser = async (userId: string) => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to start a conversation.');
      return;
    }
    
    if (!userId || userId === currentUser.uid) {
      Alert.alert('Invalid User', 'Cannot start a chat with yourself.');
      return;
    }
    
    try {
      // Create or get existing chat
      const response = await apiClient.post('/api/chats', { otherUserId: userId }, true);
      
      if (!response.ok) {
        let errorMessage = 'Failed to create chat';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          const errorText = await response.text().catch(() => '');
          if (errorText) {
            try {
              const parsed = JSON.parse(errorText);
              errorMessage = parsed.message || parsed.error || errorMessage;
            } catch {
              errorMessage = errorText.substring(0, 100) || errorMessage;
            }
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const chatId = data.chatId || data.id;
      
      if (!chatId) {
        throw new Error('No chat ID returned from server');
      }
      
      // Refresh chats list to include the new chat
      await fetchChats();
      
      // Navigate to the chat
      router.push(`/chat/${chatId}` as any);
    } catch (err: any) {
      Alert.alert(
        'Error Creating Chat',
        err?.message || 'Failed to start chat. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    // Handle Firestore Timestamp
    let date: Date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderChatItem = useCallback(({ item }: { item: Chat }) => {
    // Calculate unread status based on timestamps
    let lastMessageTime = 0;
    const timestamp = item.lastMessage?.timestamp;
    if (timestamp) {
      if (typeof timestamp === 'object' && 'seconds' in timestamp) {
        lastMessageTime = timestamp.seconds * 1000;
      } else if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
        lastMessageTime = timestamp.toDate().getTime();
      } else if (timestamp instanceof Date) {
        lastMessageTime = timestamp.getTime();
      } else if (typeof timestamp === 'number') {
        lastMessageTime = timestamp;
      }
    }

    let chatLastOpenedTime = 0;
    const chatLastOpenedAt = currentUser?.uid ? item.lastOpenedAt?.[currentUser.uid] : undefined;
    if (chatLastOpenedAt) {
      if (typeof chatLastOpenedAt === 'object' && 'seconds' in chatLastOpenedAt) {
        chatLastOpenedTime = chatLastOpenedAt.seconds * 1000;
      } else if (typeof chatLastOpenedAt === 'object' && 'toDate' in chatLastOpenedAt && typeof chatLastOpenedAt.toDate === 'function') {
        chatLastOpenedTime = chatLastOpenedAt.toDate().getTime();
      } else if (chatLastOpenedAt instanceof Date) {
        chatLastOpenedTime = chatLastOpenedAt.getTime();
      } else if (typeof chatLastOpenedAt === 'number') {
        chatLastOpenedTime = chatLastOpenedAt;
      }
    }

    const isLastMessageFromMe = item.lastMessage?.senderId === currentUser?.uid;
    const comparisonTime = Math.max(lastOpenedTimestamp, chatLastOpenedTime);
    const hasUnread = !!currentUser?.uid && lastMessageTime > 0 && !isLastMessageFromMe && lastMessageTime > comparisonTime;
    const displayName = item.otherUser?.name || 'Unknown User';
    const photoURL = item.otherUser?.photoURL;

    return (
      <TouchableOpacity
        style={[styles.chatItem, hasUnread && styles.chatItemUnread]}
        onPress={async () => {
          // Guard against concurrent taps stacking async handles in the GC scope
          if (navigatingRef.current) return;
          navigatingRef.current = true;
          try {
            if (currentUser?.uid) {
              const now = Date.now();
              const key = `${LAST_OPENED_MESSAGES_PAGE_KEY}_${currentUser.uid}`;
              await AsyncStorage.setItem(key, now.toString());
              setLastOpenedTimestamp(now);
            }
            // Await instead of fire-and-forget to ensure GC scope is released cleanly
            if (hasUnread && currentUser?.uid) {
              await apiClient.put(`/api/chats/${item.id}/read`, {}, true).catch(() => {});
            }
            router.push(`/chat/${item.id}` as any);
          } finally {
            navigatingRef.current = false;
          }
        }}
      >
        {hasUnread && <View style={styles.unreadAccent} />}
        <View style={styles.avatarContainer}>
          <ProfilePicture src={photoURL} name={displayName} customSize={48} />
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {displayName}
            </Text>
            {item.lastMessage?.timestamp && (
              <Text style={styles.timestamp}>
                {formatTimestamp(item.lastMessage.timestamp)}
              </Text>
            )}
          </View>
          <View style={styles.chatFooter}>
            <Text style={[styles.lastMessage, hasUnread && styles.unreadMessage]} numberOfLines={1}>
              {isLastMessageFromMe ? 'You: ' : ''}
              {item.lastMessage?.text || 'No messages yet'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <View style={styles.unreadDot} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [currentUser, lastOpenedTimestamp, formatTimestamp, navigatingRef]);

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={80} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>Sign In to Chat</Text>
          <Text style={styles.emptyText}>
            Sign in to start conversations with buyers and sellers
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/auth/signin')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading messages..." />;
  }

  if (error && chats.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={80} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>Error Loading Messages</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.signInButton} onPress={fetchChats}>
            <Text style={styles.signInButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.pageHeader}>
      <View>
        <Text style={styles.pageTitle}>Messages</Text>
        {chats.length > 0 && (
          <Text style={styles.pageSubtitle}>
            {chats.length} conversation{chats.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.composeButton}
        onPress={() => setShowUserSearch(true)}
        accessibilityLabel="New message"
      >
        <Ionicons name="create-outline" size={20} color={colors.text.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={80} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>No Messages</Text>
            <Text style={styles.emptyText}>
              Start a conversation by searching for a user or messaging a seller from a listing
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.DEFAULT} />
        }
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        initialNumToRender={15}
      />

      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleSelectUser}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  composeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  signInButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
  },
  signInButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  listContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.bg.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    alignItems: 'center',
    position: 'relative',
  },
  chatItemUnread: {
    backgroundColor: colors.bg.raised,
  },
  unreadAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.brand.DEFAULT,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  avatarContainer: {
    marginRight: 14,
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: colors.text.muted,
    marginLeft: 10,
    flexShrink: 0,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 13,
    color: colors.text.muted,
    flex: 1,
  },
  unreadMessage: {
    color: colors.text.secondary,
    fontWeight: '500',
  },
  unreadBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    minWidth: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.DEFAULT,
  },
});
