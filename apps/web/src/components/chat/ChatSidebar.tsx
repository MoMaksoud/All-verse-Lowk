'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Bot, ShoppingCart, Store } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationItem } from './ConversationItem';
import { Conversation } from '@/types/chat';
import { createOrGetDraft } from '@/lib/db/chats';

interface ChatSidebarProps {
  currentConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  userMode: 'buyer' | 'seller';
  onModeSwitch: (mode: 'buyer' | 'seller') => void;
}

export function ChatSidebar({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  userMode,
  onModeSwitch
}: ChatSidebarProps) {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { 
    conversations, 
    loading, 
    error, 
    refresh, 
    addConversation, 
    updateConversation, 
    removeConversation 
  } = useConversations();

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!currentUser) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'x-user-id': currentUser.uid
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.conversations || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      // TODO: Implement delete API endpoint
      // await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
      removeConversation(conversationId);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    try {
      // TODO: Implement rename API endpoint
      // await fetch(`/api/conversations/${conversationId}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ title: newTitle })
      // });
      updateConversation(conversationId, { title: newTitle });
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  const handleNewChat = async () => {
    if (!currentUser) return;
    
    try {
      const draft = await createOrGetDraft(currentUser.uid);
      onConversationSelect(draft.id);
      // Scroll to top when selecting a chat
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Failed to create or get draft:', error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    onConversationSelect(conversationId);
    // Scroll to top when selecting a chat
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayedConversations = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    return conversations;
  }, [searchQuery, searchResults, conversations]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-base font-semibold text-white">AI Assistant</h2>
        </div>
        
        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          disabled={conversations.some(conv => conv.isDraft && conv.id === currentConversationId)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-zinc-300 hover:text-white transition-colors mb-2"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
        
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          {isSearching && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Sessions */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {loading && conversations.length === 0 ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-2 rounded-lg bg-zinc-800 animate-pulse">
                <div className="h-4 bg-zinc-700 rounded mb-1" />
                <div className="h-3 bg-zinc-700 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-2 text-red-400 text-sm">
            Error loading conversations
          </div>
        ) : displayedConversations.length > 0 ? (
          displayedConversations.map(conversation => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={currentConversationId === conversation.id}
              onClick={() => handleConversationSelect(conversation.id)}
              onDelete={() => handleDeleteConversation(conversation.id)}
              onRename={(newTitle) => handleRenameConversation(conversation.id, newTitle)}
            />
          ))
        ) : (
          <div className="p-2 text-zinc-500 text-sm">
            {searchQuery ? 'No conversations found' : 'No chat sessions found'}
          </div>
        )}
      </div>
      
      {/* Mode Toggle at bottom of sidebar */}
      <div className="p-3 border-t border-zinc-800 flex-shrink-0">
        <div className="flex bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => onModeSwitch('buyer')}
            className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5
              ${userMode === 'buyer' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Buyer
          </button>
          <button
            onClick={() => onModeSwitch('seller')}
            className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5
              ${userMode === 'seller' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            <Store className="w-3.5 h-3.5" /> Seller
          </button>
        </div>
      </div>
    </div>
  );
}
