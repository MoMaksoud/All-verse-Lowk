import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import UserSearchModal from '../../components/UserSearchModal';

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

  // Update lastOpenedMessagesPageAt when Messages page is opened (clears global badge)
  useEffect(() => {
    const updateLastOpenedTimestamp = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const now = Date.now();
        const key = `${LAST_OPENED_MESSAGES_PAGE_KEY}_${currentUser.uid}`;
        await AsyncStorage.setItem(key, now.toString());
        setLastOpenedTimestamp(now);
      } catch (error) {
        console.error('Error updating last opened timestamp:', error);
      }
    };
    
    if (currentUser?.uid) {
      updateLastOpenedTimestamp();
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (currentUser) {
      fetchChats();
      
      // Poll for new messages every 5 seconds
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
        // Force refresh by setting loading state first
        setRefreshing(true);
        
        // Refresh immediately when screen comes into focus
        fetchChats();
        
        // Also refresh after delays to catch any server-side updates
        const timeout1 = setTimeout(() => {
          fetchChats();
        }, 500);
        const timeout2 = setTimeout(() => {
          fetchChats();
        }, 1000);
        
        return () => {
          clearTimeout(timeout1);
          clearTimeout(timeout2);
        };
      }
    }, [currentUser, fetchChats])
  );

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

  const renderChatItem = ({ item }: { item: Chat }) => {
    // Calculate unread status based on timestamps (matching web version)
    const hasUnread = (() => {
      if (!currentUser?.uid || !item.lastMessage?.timestamp) return false;
      
      // Convert Firestore Timestamp to milliseconds
      let lastMessageTime = 0;
      const timestamp = item.lastMessage.timestamp;
      
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
      
      if (lastMessageTime === 0) return false;
      
      // Get when this chat was last opened
      let chatLastOpenedTime = 0;
      const chatLastOpenedAt = item.lastOpenedAt?.[currentUser.uid];
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
      
      // Chat is unread if last message is newer than when it was last opened
      // AND the last message is from the other user (not from me)
      const isLastMessageFromMe = item.lastMessage?.senderId === currentUser.uid;
      const comparisonTime = Math.max(lastOpenedTimestamp, chatLastOpenedTime);
      
      // Only show unread if message is from other user and newer than last opened time
      const isUnread = !isLastMessageFromMe && lastMessageTime > comparisonTime;
      
      return isUnread;
    })();
    
    // Keep unreadCount for display (legacy support, but we use hasUnread for logic)
    const unreadCount = item.unreadCount?.[currentUser?.uid || ''] || 0;
    const isLastMessageFromMe = item.lastMessage?.senderId === currentUser?.uid;
    const displayName = item.otherUser?.name || 'Unknown User';
    const photoURL = item.otherUser?.photoURL;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={async () => {
          // Mark chat as read before navigating (optimistic update)
          if (hasUnread && currentUser?.uid) {
            try {
              // Fire and forget - don't wait for response
              apiClient.put(`/api/chats/${item.id}/read`, {}, true).catch(() => {});
            } catch (error) {
              // Silently fail - not critical
            }
          }
          // Navigate to chat detail
          router.push(`/chat/${item.id}` as any);
        }}
      >
        <View style={styles.avatarContainer}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="rgba(255, 255, 255, 0.6)" />
            </View>
          )}
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
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
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
          <Ionicons name="alert-circle-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
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
    <>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Messages</Text>
      </View>
      
      {/* New Message Button */}
      <TouchableOpacity
        style={styles.newMessageButton}
        onPress={() => setShowUserSearch(true)}
      >
        <Ionicons name="create-outline" size={24} color="#fff" />
        <Text style={styles.newMessageText}>New Message</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {chats.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyTitle}>No Messages</Text>
            <Text style={styles.emptyText}>
              Start a conversation by searching for a user or messaging a seller from a listing
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />
          }
        />
      )}

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
    backgroundColor: '#0f1b2e',
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 8,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
  },
  unreadMessage: {
    color: '#fff',
    fontWeight: '500',
  },
  unreadBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#60a5fa',
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  newMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#60a5fa',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  newMessageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
