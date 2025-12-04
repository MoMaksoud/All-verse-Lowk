'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import { Send, Bot, ShoppingCart, Store, Trash2, Image as ImageIcon } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string; // Changed from Date to string for JSON serialization
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  type?: 'listings';
  items?: Array<{
    title: string;
    price: number;
    image: string;
    url: string;
  }>;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'buyer' | 'seller'>('buyer');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();
  const { showError, showSuccess } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation per mode - only on mount or mode change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ai-chat-${mode}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setMessages([]);
    }
  }, [mode]);

  // Debounced save to localStorage - only save after messages change
  useEffect(() => {
    if (messages.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(`ai-chat-${mode}`, JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [messages, mode]);

  // Auto-resize textarea
  useEffect(() => {
    if (!taRef.current) return;
    const el = taRef.current;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const handleClearChat = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteChat = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(`ai-chat-${mode}`);
    } catch {
      // Silently fail if localStorage is unavailable
    }
    setShowDeleteConfirm(false);
  }, [mode]);

  const cancelDeleteChat = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (!file || !currentUser) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      showError('Invalid File', 'Please select an image or video file');
      return;
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      showError('File Too Large', 'File must be smaller than 25MB');
      return;
    }

    setUploadingMedia(true);
    try {
      // Upload via server-side API endpoint (bypasses security rules)
      const formData = new FormData();
      formData.append('file', file);
      
      // Get auth token for the request
      if (auth) {
        await auth.authStateReady();
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          await firebaseUser.getIdToken(true);
        }
      }
      
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Use fetch directly - browser will set Content-Type automatically for FormData
      const response = await fetch('/api/upload/ai-chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Do NOT set Content-Type - browser will set it with boundary for FormData
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const data = await response.json();
      setPendingMedia({ url: data.url, type: data.type });
      showSuccess('File Uploaded', 'Your file is ready to send');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      showError('Upload Failed', error?.message || 'Please try again.');
    } finally {
      setUploadingMedia(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [currentUser, showError, showSuccess]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleSearch = useCallback(async (searchQuery: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if ((!searchQuery.trim() && !mediaUrl) || isLoading || !currentUser) return;

    // Ensure auth is ready and force token refresh before making API call
    if (auth) {
      await auth.authStateReady();
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        // Force refresh token to ensure it's valid
        await firebaseUser.getIdToken(true);
        // Small delay to ensure token is propagated
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const userMessage = searchQuery.trim().slice(0, 2000);
    setInput('');
    setIsLoading(true);
    setPendingMedia(null); // Clear pending media after sending

    // Add user message immediately
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(), // Store as ISO string
      mediaUrl,
      mediaType,
    };
    
    setMessages(prev => [...prev, userMsg]);

    try {
      const { apiPost } = await import('@/lib/api-client');
      const requestBody: any = {
        message: userMessage,
        mode,
        conversationHistory: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
        })),
      };

      // Include media if present
      if (mediaUrl && mediaType) {
        requestBody.mediaUrl = mediaUrl;
        requestBody.mediaType = mediaType;
      }

      const response = await apiPost('/api/ai/chat', requestBody);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Failed to get response';
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('Authentication failed. Please refresh the page and try again.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(errorMessage);
        }
      }

      const data = await response.json();

      // Check if response is a listings format
      let aiMsg: Message;
      const responseData = data.response;
      
      // Check if response is already in listings format
      if (responseData && typeof responseData === 'object' && responseData.type === 'listings' && Array.isArray(responseData.items)) {
        aiMsg = {
          id: crypto.randomUUID(),
          role: 'ai',
          content: responseData.message || 'Here are some items:',
          timestamp: new Date().toISOString(),
          type: 'listings',
          items: responseData.items,
        };
      } else {
        // Regular text response
        const responseText = typeof responseData === 'string' ? responseData : (responseData?.message || 'No response received');
        aiMsg = {
          id: crypto.randomUUID(),
          role: 'ai',
          content: responseText,
          timestamp: new Date().toISOString(),
        };
      }
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Error:', error);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentUser, mode, messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !pendingMedia) || isLoading || !currentUser) return;
    handleSearch(input.trim() || 'User submitted image/video', pendingMedia?.url, pendingMedia?.type);
  }, [input, isLoading, currentUser, handleSearch, pendingMedia]);

  // Read query from URL and auto-trigger search
  useEffect(() => {
    const query = searchParams.get('query');
    if (query && !hasAutoTriggered && currentUser) {
      const decodedQuery = decodeURIComponent(query);
      setInput(decodedQuery);
      setHasAutoTriggered(true);
      // Auto-trigger search after a small delay to ensure state is set
      const timeoutId = setTimeout(() => {
        handleSearch(decodedQuery);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, hasAutoTriggered, currentUser, handleSearch]);

  // Show sign-in notice if user is not authenticated
  if (!currentUser) {
    return (
      <div className="h-[calc(100vh-64px)] overflow-hidden bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 text-lg mb-6">
            Sign up to start chatting with your AI assistant.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] overflow-hidden bg-zinc-950">
      <main className="flex flex-col h-full max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Header */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">AI Assistant</h1>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-1 w-full sm:w-fit mx-auto">
            <button
              onClick={() => setMode('buyer')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
                mode === 'buyer' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" /> <span>Buyer</span>
            </button>
            <button
              onClick={() => setMode('seller')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
                mode === 'seller' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Store className="w-3 h-3 sm:w-4 sm:h-4" /> <span>Seller</span>
            </button>
          </div>
        </div>

        {/* Chat Box Container */}
        <div className="flex-1 flex flex-col min-h-0 mb-4 bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
          {/* Messages Area with Scrollbar */}
          <div className="flex-1 overflow-y-auto p-4 chat-scrollbar">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                  <Bot className="w-12 h-12 mb-4" />
                  <p className="text-lg font-medium">Start a conversation</p>
                  <p className="text-sm">Your AI assistant is ready to help!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm break-words whitespace-pre-wrap ${
                        msg.role === 'ai'
                          ? 'bg-zinc-800/80 border border-zinc-700 text-zinc-100'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {/* Render media preview for user messages */}
                      {msg.role === 'user' && msg.mediaUrl && (
                        <div className="mb-2">
                          {msg.mediaType === 'image' ? (
                            <img 
                              src={msg.mediaUrl} 
                              alt="Uploaded" 
                              className="rounded-lg max-w-xs max-h-64 object-cover"
                            />
                          ) : (
                            <video 
                              src={msg.mediaUrl} 
                              controls 
                              className="rounded-lg max-w-xs max-h-64"
                            />
                          )}
                        </div>
                      )}
                      
                      {/* Render listings */}
                      {msg.type === 'listings' && msg.items ? (
                        <div>
                          {msg.content && <p className="mb-3">{msg.content}</p>}
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            {msg.items.map((item, index) => {
                              // Normalize URL: ensure it starts with / and uses /listings/ (plural) not /listing/
                              let listingUrl = item.url.startsWith('/') ? item.url : `/${item.url}`;
                              // Fix route: replace /listing/ with /listings/ if needed
                              listingUrl = listingUrl.replace(/^\/listing\//, '/listings/');
                              
                              // Use data URL SVG as fallback instead of external placeholder
                              const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23222" width="300" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                              
                              // Only use item.image if it's a valid HTTPS URL
                              let imageUrl = fallbackImage;
                              if (item.image && typeof item.image === 'string') {
                                const trimmed = item.image.trim();
                                if ((trimmed.startsWith('https://') || trimmed.startsWith('http://')) && trimmed.length > 10) {
                                  imageUrl = trimmed;
                                }
                              }
                              
                              return (
                                <div
                                  key={index}
                                  onClick={() => {
                                    console.log('Navigating to:', listingUrl);
                                    router.push(listingUrl);
                                  }}
                                  className="shrink-0 border border-zinc-800 bg-zinc-900 rounded-xl p-3 hover:bg-zinc-800 transition w-56 cursor-pointer"
                                >
                                  <img 
                                    src={imageUrl}
                                    alt={item.title}
                                    className="rounded-lg w-full h-32 object-cover mb-2"
                                    onError={(e) => {
                                      // Fallback to data URL if image fails
                                      (e.target as HTMLImageElement).src = fallbackImage;
                                    }}
                                  />
                                  <h3 className="text-sm font-medium text-zinc-100 mb-1 line-clamp-2">
                                    {item.title}
                                  </h3>
                                  <p className="text-xs text-zinc-400 mb-2">${item.price}</p>
                                  <span className="text-blue-400 text-xs">View Listing</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <>{msg.content}</>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800/80 border border-zinc-700 px-4 py-3 rounded-xl text-sm text-zinc-400">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </div>

          {/* Input Area */}
          <div 
            className={`shrink-0 border-t border-zinc-800 p-3 sm:p-4 safe-area-bottom ${isDragging ? 'bg-zinc-800/50' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) {
                uploadFile(file);
              }
            }}
          >
            {/* Pending media preview */}
            {pendingMedia && (
              <div className="mb-2 flex items-center gap-2">
                {pendingMedia.type === 'image' ? (
                  <img 
                    src={pendingMedia.url} 
                    alt="Preview" 
                    className="rounded-lg w-16 h-16 object-cover"
                  />
                ) : (
                  <video 
                    src={pendingMedia.url} 
                    className="rounded-lg w-16 h-16 object-cover"
                  />
                )}
                <button
                  onClick={() => setPendingMedia(null)}
                  className="text-zinc-400 hover:text-white text-xs"
                >
                  Remove
                </button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || uploadingMedia || !currentUser}
                className="px-2 sm:px-3 py-2 sm:py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0"
                title="Upload image or video"
              >
                {uploadingMedia ? (
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'buyer' ? 'What are you looking for?' : 'How can I help you sell?'}
                className="flex-1 resize-none rounded-xl bg-zinc-900/80 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 outline-none border border-zinc-700 focus:border-blue-600 min-h-[44px] sm:min-h-[48px] max-h-[120px] text-zinc-100 placeholder:text-zinc-500"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !pendingMedia) || !currentUser}
                className="px-3 sm:px-5 py-2 sm:py-3 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 sm:gap-2 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cancelDeleteChat}>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Clear Conversation</h3>
            <p className="text-sm sm:text-base text-zinc-400 mb-4 sm:mb-6">Are you sure you want to clear this conversation? This action cannot be undone.</p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
              <button
                onClick={cancelDeleteChat}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteChat}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors w-full sm:w-auto"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
