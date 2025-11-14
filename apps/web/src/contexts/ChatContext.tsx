'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ChatContextType {
  currentChatId: string | null;
  setCurrentChatId: (chatId: string | null) => void;
}

const ChatContext = createContext<ChatContextType>({} as ChatContextType);

export function useChatContext() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [currentChatId, setCurrentChatIdState] = useState<string | null>(null);

  const setCurrentChatId = useCallback((chatId: string | null) => {
    setCurrentChatIdState(chatId);
  }, []);

  const value = {
    currentChatId,
    setCurrentChatId,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

