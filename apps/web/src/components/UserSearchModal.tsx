'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User } from 'lucide-react';
import { apiGet } from '@/lib/api-client';

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

export function UserSearchModal({ isOpen, onClose, onSelectUser }: UserSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    // Reset state when modal opens/closes
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
        const response = await apiGet(`/api/users/search?q=${encodeURIComponent(cleanTerm)}`);
        
        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Error searching users:', err);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-surface rounded-lg border border-dark-border w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white">New Message</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-dark-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by @username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-950 border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-gray-400">Searching...</div>
          )}
          
          {error && (
            <div className="p-8 text-center text-red-400">{error}</div>
          )}

          {!loading && !error && users.length === 0 && searchTerm.length >= 2 && (
            <div className="p-8 text-center text-gray-400">
              No users found
            </div>
          )}

          {!loading && !error && searchTerm.length < 2 && (
            <div className="p-8 text-center text-gray-400">
              Type at least 2 characters to search
            </div>
          )}

          {users.map((user) => (
            <button
              key={user.userId}
              onClick={() => handleSelectUser(user)}
              className="w-full p-4 hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-dark-border last:border-0"
            >
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 text-left">
                <div className="text-white font-medium">@{user.username}</div>
                {user.displayName !== user.username && (
                  <div className="text-sm text-gray-400">{user.displayName}</div>
                )}
                {user.bio && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">{user.bio}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

