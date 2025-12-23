import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../lib/api/client';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  sender?: {
    id: string;
    name: string;
    username?: string;
    email: string;
    photoURL?: string;
  };
}

interface ChatInfo {
  otherUser?: {
    id: string;
    name: string;
    username?: string;
    email: string;
    photoURL?: string;
  };
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async () => {
    if (!id || !currentUser) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get(`/api/chats/${id}/messages`, true);
      
      if (!response.ok) {
        if (response.status === 404) {
          Alert.alert('Chat Not Found', 'This chat does not exist.');
          router.back();
          return;
        }
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Ensure sender data is properly formatted with username
        const formattedMessages = data.data.map((msg: any) => ({
          ...msg,
          sender: {
            ...msg.sender,
            username: msg.sender?.username || null, // Ensure username is null if not present
          },
        }));
        setMessages(formattedMessages);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatInfo = async () => {
    if (!id || !currentUser) return;

    try {
      const response = await apiClient.get('/api/chats', true);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const chat = data.data.find((c: any) => c.id === id);
          if (chat) {
            setChatInfo({ otherUser: chat.otherUser });
          }
        }
      }
    } catch (err) {
      // Silently fail - chat info is not critical
    }
  };

  const markChatAsRead = async () => {
    if (!id || !currentUser) return;

    try {
      // Mark chat as opened (updates lastOpenedAt timestamp)
      await apiClient.put(`/api/chats/${id}/read`, {}, true);
    } catch (error) {
      // Silently fail - marking as read is not critical
      console.error('Error marking chat as read:', error);
    }
  };

  useEffect(() => {
    if (id && currentUser) {
      fetchChatInfo();
      fetchMessages();
      markChatAsRead(); // Mark as read when chat is opened
      
      // Poll for new messages every 2 seconds for real-time updates
      const interval = setInterval(() => {
        fetchMessages();
        // Only mark as read if user is actively viewing (not in background)
        markChatAsRead();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [id, currentUser]);

  // Mark as read when screen loses focus (user navigates away)
  useFocusEffect(
    React.useCallback(() => {
      // When screen comes into focus, mark as read
      if (id && currentUser) {
        markChatAsRead();
      }
      
      // When screen loses focus (user navigates away), mark as read one more time
      // This ensures the read status is updated before navigating back
      return () => {
        if (id && currentUser) {
          // Use a small delay to ensure the API call completes before navigation
          const timeoutId = setTimeout(() => {
            markChatAsRead();
          }, 100);
          return () => clearTimeout(timeoutId);
        }
      };
    }, [id, currentUser])
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure layout has updated
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!messageText.trim() || sending || !id || !currentUser) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      // Send message via API
      const response = await apiClient.post(
        `/api/chats/${id}/messages`,
        { text: textToSend },
        true
      );

      if (!response.ok) {
        let errorMessage = 'Failed to send message';
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = `Status: ${response.status}`;
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
          errorDetails = `Status: ${response.status}, Response: ${errorText.substring(0, 50)}`;
        }
        throw new Error(`${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`);
      }

      const responseData = await response.json();
      
      // Refresh messages to get the actual message from server
      await fetchMessages();
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (err: any) {
      Alert.alert(
        'Error Sending Message', 
        err?.message || 'Failed to send message. Please try again.',
        [{ text: 'OK' }]
      );
      setMessageText(textToSend); // Restore message text on error
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
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
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === currentUser?.uid;
    // Use otherUser.username from chatInfo if available (more reliable)
    const otherUser = chatInfo?.otherUser;
    const username = !isMyMessage && otherUser?.username 
      ? otherUser.username 
      : item.sender?.username;
    const hasUsername = username && typeof username === 'string' && username.trim().length > 0;
    const displayName = hasUsername
      ? `@${username.trim()}`
      : (!isMyMessage && otherUser?.name 
          ? otherUser.name 
          : (item.sender?.name || 'Unknown User'));
    const photoURL = (!isMyMessage && otherUser?.photoURL) || item.sender?.photoURL;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {!isMyMessage && (
          <View style={styles.avatarContainer}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={16} color="rgba(255, 255, 255, 0.6)" />
              </View>
            )}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {!isMyMessage && (
            <Text style={styles.senderName}>{displayName}</Text>
          )}
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, isMyMessage && styles.myTimestamp]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading messages..." />;
  }

  const otherUser = chatInfo?.otherUser;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {otherUser?.photoURL ? (
            <Image source={{ uri: otherUser.photoURL }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={20} color="rgba(255, 255, 255, 0.6)" />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser?.username ? `@${otherUser.username}` : otherUser?.name || 'Unknown User'}
            </Text>
            {otherUser?.username && otherUser?.name && otherUser.name !== otherUser.username && (
              <Text style={styles.headerUsername} numberOfLines={1}>
                {otherUser.name}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted={false}
          onContentSizeChange={() => {
            // Auto-scroll to bottom when content size changes (new messages)
            if (messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 50);
            }
          }}
          onLayout={() => {
            // Auto-scroll to bottom when layout is ready (initial load)
            if (messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={2000}
            editable={!sending}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <Ionicons name="hourglass-outline" size={24} color="rgba(255, 255, 255, 0.5)" />
            ) : (
              <Ionicons name="send" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1b2e',
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#1a2332',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerUsername: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: '#60a5fa',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#1a2332',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#1a2332',
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#60a5fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(96, 165, 250, 0.3)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
  },
});

