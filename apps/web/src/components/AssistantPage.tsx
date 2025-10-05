'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Plus, Search, Trash2, MessageCircle, ShoppingCart, Store } from 'lucide-react';

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

// Bubble component for chat messages
function Bubble({ children, ai }: { children: React.ReactNode; ai: boolean }) {
  return (
    <div className={`max-w-[75%] px-4 py-3 rounded-xl text-sm ${
      ai 
        ? 'bg-zinc-900/80 border border-zinc-800 text-zinc-100' 
        : 'bg-white text-black shadow ml-auto'
    }`}>
      {children}
    </div>
  );
}

// Container component for consistent max-width
function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {children}
    </div>
  );
}

// Card component for consistent styling
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-950/60 ${className}`}>
      {children}
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState('');
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
            text: msg.text || msg.content || '', // Handle both 'text' and 'content' properties
            role: msg.role || 'user' // Ensure role is defined
          }))
        }));
        setChatSessions(sessions);
        
        // Load the most recent session
        if (sessions.length > 0) {
          const latestSession = sessions[sessions.length - 1];
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
      // Clear corrupted data
      localStorage.removeItem('ai-chat-sessions');
      localStorage.removeItem('ai-user-mode');
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

  // Initialize textarea auto-grow
  useEffect(() => {
    autoGrow();
  }, []);

  // Prevent page scrolling when AI page is active
  useEffect(() => {
    // Add class to body and html to prevent scrolling
    document.body.classList.add('ai-page-active');
    document.documentElement.classList.add('ai-page-active');
    
    // Cleanup function to remove classes when component unmounts
    return () => {
      document.body.classList.remove('ai-page-active');
      document.documentElement.classList.remove('ai-page-active');
    };
  }, []);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setChatSessions(prev => [...prev, newSession]);
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
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        const latestSession = remainingSessions[remainingSessions.length - 1];
        setCurrentSessionId(latestSession.id);
        setMessages(latestSession.messages);
      } else {
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
  };

  const updateCurrentSession = (newMessages: Message[]) => {
    if (!currentSessionId) return;
    
    setChatSessions(prev => prev.map(session => 
      session.id === currentSessionId 
        ? { 
            ...session, 
            messages: newMessages,
            updatedAt: new Date(),
            title: newMessages.length > 0 && newMessages[0]?.text ? newMessages[0]?.text?.slice(0, 30) + '...' : 'New Chat'
          }
        : session
    ));
  };

  const handleModeSwitch = (mode: 'buyer' | 'seller') => {
    setUserMode(mode);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      ts: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateCurrentSession(newMessages);
    setSending(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          mode: userMode,
          conversationHistory: messages.slice(-10) // Last 10 messages for context
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

  // Filter sessions based on search query
  const filteredSessions = chatSessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some(msg => 
      msg.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="flex h-[calc(100vh-64px)]">
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
              className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors mb-2"
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
            </div>
          </div>
          
          {/* Chat Sessions */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0">
            {filteredSessions.length > 0 ? (
              filteredSessions.map(session => (
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
                    {currentSessionId !== session.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-600 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
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
        <div className="flex-1 flex flex-col">
          <Container>
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">AI Assistant</h1>
              </div>
            </div>

            {/* Chat card (no categories) */}
            <Card className="overflow-hidden flex flex-col min-h-[calc(100vh-220px)]">
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
                      <Bubble ai={m.role === "ai"}>{m.text}</Bubble>
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
                    placeholder="Ask about pricing, comps, or optimization…"
                    rows={1}
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
            </Card>
          </Container>
        </div>
      </main>
    </div>
  );
}
