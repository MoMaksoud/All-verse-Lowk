'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Plus, Trash2, MessageCircle, ShoppingCart, Store } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  ts: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// Format time helper
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [userMode, setUserMode] = useState<'buyer' | 'seller'>('buyer');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow textarea helper
  function autoGrow(el?: HTMLTextAreaElement) {
    const t = el || taRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 200) + "px";
  }

  // Load chat sessions from localStorage
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('ai-chat-sessions');
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        const sessions = parsedSessions.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: (session.messages || []).map((msg: any) => ({
            ...msg,
            ts: new Date(msg.ts),
            text: msg.text || msg.content || '',
            role: msg.role || 'user'
          }))
        }));

        sessions.sort((a: ChatSession, b: ChatSession) => b.updatedAt.getTime() - a.updatedAt.getTime());

        // ✅ Keep at most one empty session (no messages). Keep the newest.
        const seenEmpty = { kept: false };
        const deduped = sessions.filter(s => {
          const isEmpty = (s.messages?.length ?? 0) === 0;
          if (!isEmpty) return true;
          if (!seenEmpty.kept) {
            seenEmpty.kept = true; // keep the first empty (list is newest → oldest)
            return true;
          }
          return false; // drop older empties
        });

        const finalSessions = deduped;

        setChatSessions(finalSessions);

        if (finalSessions.length > 0) {
          const latestSession = finalSessions[0];
          setCurrentSessionId(latestSession.id);
          setMessages(latestSession.messages || []);
        }
      }

      // Load user mode
      const savedMode = localStorage.getItem('ai-user-mode');
      if (savedMode && (savedMode === 'buyer' || savedMode === 'seller')) {
        setUserMode(savedMode);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  }, []);

  // Save chat sessions to localStorage
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('ai-chat-sessions', JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Save user mode to localStorage
  useEffect(() => {
    localStorage.setItem('ai-user-mode', userMode);
  }, [userMode]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewSession = () => {
    // If the current session is already empty, just stay on it
    if (currentSessionId) {
      const current = chatSessions.find(s => s.id === currentSessionId);
      if (current && (current.messages?.length ?? 0) === 0) {
        setMessages([]);
        return;
      }
    }

    // Look for any existing empty session (no messages)
    const existingEmpty = chatSessions.find(s => (s.messages?.length ?? 0) === 0);
    if (existingEmpty) {
      setCurrentSessionId(existingEmpty.id);
      setMessages(existingEmpty.messages || []);
      return; // ✅ do not create a new one
    }

    // Otherwise create a new empty session and put it at the top
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const loadSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
    }
  };

  const deleteSession = (sessionId: string) => {
    const remaining = chatSessions.filter(s => s.id !== sessionId);
    // keep newest → oldest
    remaining.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // If we're not deleting the current chat, just update the list and keep view
    if (currentSessionId !== sessionId) {
      setChatSessions(remaining);
      return;
    }

    // We are deleting the active chat:
    // 1) Reuse an existing empty session if present
    const existingEmpty = remaining.find(s => (s.messages?.length ?? 0) === 0);

    if (existingEmpty) {
      setChatSessions(remaining);
      setCurrentSessionId(existingEmpty.id);
      setMessages(existingEmpty.messages || []);
      return;
    }

    // 2) Otherwise create a brand-new empty session and select it
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setChatSessions([newSession, ...remaining]); // put it at the top
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const updateCurrentSession = (newMessages: Message[]) => {
    if (!currentSessionId) return;
    
    setChatSessions(prev => {
      const updated = prev.map(session =>
        session.id === currentSessionId
          ? {
              ...session,
              messages: newMessages,
              updatedAt: new Date(),
              title:
                newMessages.length > 0 && newMessages[0]?.text
                  ? newMessages[0].text.slice(0, 30) + '...'
                  : 'New Chat'
            }
          : session
      );
      updated.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return updated;
    });
  };

  const handleModeSwitch = (mode: 'buyer' | 'seller') => {
    setUserMode(mode);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
  
    const content = input.trim();
  
    // clear UI now
    setInput('');
    autoGrow(); // will use taRef to reset height
  
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: content,
      ts: new Date()
    };
  
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateCurrentSession(newMessages);
    setSending(true);
  
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          mode: userMode,
          conversationHistory: messages.slice(-10)
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data.response,
        ts: new Date()
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } catch (err) {
      console.error('Error sending message:', err);
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Sorry, I encountered an error. Please try again.',
        ts: new Date()
      };
      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-zinc-950">
      <main className="grid grid-cols-[320px,1fr] h-full overflow-hidden">
        {/* Left Sidebar - Chat History */}
        <div className="hidden md:flex md:w-80 bg-zinc-900 border-r border-zinc-800 flex-col">
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
              onClick={createNewSession}
              className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </button>
          </div>
          
          {/* Chat Sessions */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {chatSessions.length > 0 ? (
              chatSessions.map(session => (
                <div
                  key={session.id}
                  className={`p-2 rounded-lg mb-1 transition-colors cursor-pointer group ${
                    currentSessionId === session.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  onClick={() => loadSession(session.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      {session.messages.length > 0 && session.messages[session.messages.length - 1]?.text && (
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {session.messages[session.messages.length - 1]?.text?.slice(0, 40)}...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-600 rounded"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-sm p-2">No chat sessions found.</p>
            )}
          </div>
          
          {/* Mode Toggle at bottom of sidebar */}
          <div className="p-4 border-t border-zinc-800">
            <div className="flex bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => handleModeSwitch('buyer')}
                className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                  ${userMode === 'buyer' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <ShoppingCart className="w-4 h-4" /> Buyer
              </button>
              <button
                onClick={() => handleModeSwitch('seller')}
                className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                  ${userMode === 'seller' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <Store className="w-4 h-4" /> Seller
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="mx-auto max-w-5xl w-full px-4 py-4 flex-1 min-h-0 flex flex-col">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center mb-2">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">AI Assistant</h1>
              </div>
            </div>

            {/* Chat card (no categories) */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden flex flex-col min-h-[calc(100vh-220px)]">
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                    <MessageCircle className="w-12 h-12 mb-4" />
                    <p className="text-lg font-medium">Start a conversation</p>
                    <p className="text-sm">Your AI assistant is ready to help!</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="space-y-1">
                      <div className={`max-w-[75%] px-4 py-3 rounded-xl text-sm ${
                        m.role === "ai"
                          ? 'bg-zinc-900/80 border border-zinc-800 text-zinc-100' 
                          : 'bg-white text-black shadow ml-auto'
                      }`}>
                        {m.text}
                      </div>
                      <div className={"text-[10px] text-zinc-500 " + (m.role === "ai" ? "pl-3" : "text-right pr-3")}>
                        {formatTime(m.ts)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-zinc-900/80 p-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    ref={taRef}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); autoGrow(e.currentTarget); }}
                    placeholder="What item are you hunting for?"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); // prevent newline
                        handleSend();       // send on Enter
                      }
                    }}
                    className="flex-1 resize-none rounded-xl bg-zinc-900 text-sm px-4 py-3 md:py-4 outline-none border border-zinc-800 focus:border-zinc-600 min-h-[48px] max-h-[200px] text-zinc-100 placeholder:text-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="h-[48px] md:h-[52px] inline-flex items-center gap-2 rounded-xl bg-white text-black text-sm font-medium px-5 hover:bg-zinc-100 disabled:opacity-70"
                  >
                    <Send size={16}/> Send
                  </button>
                </form>
                <p className="text-center text-[11px] text-zinc-500 mt-3">Tip: Press Enter to send • Shift+Enter for a new line</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
