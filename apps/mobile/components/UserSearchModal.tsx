import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/api/client';
import { colors, spacing, radii, typography, palette } from '../constants/theme';

interface User {
  userId: string;
  username: string;
  displayName: string;
  profilePicture: string;
  bio?: string;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export default function UserSearchModal({ isOpen, onClose, onSelectUser }: UserSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    // Reset state when modal closes
    if (!isOpen) {
      setSearchTerm('');
      setUsers([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchUsers = async () => {
      const cleanTerm = searchTerm.replace(/^@/, '').trim();
      
      if (cleanTerm.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get(`/api/users/search?q=${encodeURIComponent(cleanTerm)}`, true);
        
        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (err: any) {
        setError('Failed to search users');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelectUser = (user: User) => {
    onSelectUser(user.userId);
    setSearchTerm('');
    setUsers([]);
    onClose();
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleSelectUser(item)}
    >
      <View style={styles.avatarContainer}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={colors.text.tertiary} />
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        {item.displayName !== item.username && (
          <Text style={styles.displayName}>{item.displayName}</Text>
        )}
        {item.bio && (
          <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Message</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.text.muted} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search by @username"
            placeholderTextColor={colors.text.muted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {loading && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={palette.primary[400]} />
            <Text style={styles.centerText}>Searching...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && users.length === 0 && searchTerm.length >= 2 && (
          <View style={styles.centerContent}>
            <Text style={styles.centerText}>No users found</Text>
          </View>
        )}

        {!loading && !error && searchTerm.length < 2 && (
          <View style={styles.centerContent}>
            <Text style={styles.centerText}>Type at least 2 characters to search</Text>
          </View>
        )}

        {!loading && !error && users.length > 0 && (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.raised,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.size.lg,
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  centerText: {
    color: colors.text.muted,
    fontSize: typography.size.base,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: typography.size.base,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.glass,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.bg.glassHover,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.bg.glassHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  displayName: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  bio: {
    fontSize: typography.size.sm,
    color: colors.text.muted,
  },
});

