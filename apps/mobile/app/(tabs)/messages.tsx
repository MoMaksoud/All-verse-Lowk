import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api/client';
import LoadingSpinner from '../../components/LoadingSpinner';

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
  createdAt?: any;
  updatedAt?: any;
}

export default function MessagesScreen() {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = async () => {
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
      console.error('Error fetching chats:', err);
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
  };

  useEffect(() => {
    if (currentUser) {
      fetchChats();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchChats();
  }, [currentUser]);

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
    const unreadCount = item.unreadCount?.[currentUser?.uid || ''] || 0;
    const isLastMessageFromMe = item.lastMessage?.senderId === currentUser?.uid;
    const displayName = item.otherUser?.name || 'Unknown User';
    const photoURL = item.otherUser?.photoURL;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          // Navigate to chat detail (you'll need to create this screen)
          router.push(`/chat/${item.id}`);
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
            <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
              {isLastMessageFromMe ? 'You: ' : ''}
              {item.lastMessage?.text || 'No messages yet'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {chats.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyTitle}>No Messages</Text>
          <Text style={styles.emptyText}>
            Start a conversation by messaging a seller from a listing
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
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
    backgroundColor: '#60a5fa',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
