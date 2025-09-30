'use client';

import { useState } from 'react';
import { Trash2, MoreVertical, Edit2 } from 'lucide-react';
import { Conversation } from '@/types/chat';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}

export function ConversationItem({ 
  conversation, 
  isActive, 
  onClick, 
  onDelete, 
  onRename 
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`p-2 rounded-lg mb-1 transition-colors cursor-pointer group relative ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyPress}
              className="w-full bg-transparent border-none outline-none text-sm font-medium"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{conversation.title}</p>
              {conversation.isDraft && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-600/20 text-blue-400 rounded-full">
                  Draft
                </span>
              )}
            </div>
          )}
          {conversation.lastMessagePreview && (
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {conversation.lastMessagePreview}
            </p>
          )}
        </div>
        
        {!isActive && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-600 rounded"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-6 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 min-w-[120px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 flex items-center gap-2"
                >
                  <Edit2 className="w-3 h-3" />
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
