'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import { Send, Bot, ShoppingCart, Store, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
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

const normalizeListingItems = (items: unknown): Message['items'] => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const title = typeof item.title === 'string' && item.title.trim().length > 0 ? item.title : 'Untitled listing';
      const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0;
      const image = typeof item.image === 'string' ? item.image : '';
      const url = typeof item.url === 'string' && item.url.trim().length > 0 ? item.url : '/listings';
      return { title, price, image, url };
    });
};

const BUYER_SUGGESTIONS = [
  'Find me a Nike hoodie under $50',
  'Looking for a MacBook Pro',
  'Show me vintage clothing',
  'What gaming gear is available?',
];

const SELLER_SUGGESTIONS = [
  'How should I price my iPhone 13?',
  'Write a listing for my Jordan 1s',
  'What category fits a vintage lamp?',
  'Tips for selling electronics faster',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current opacity-60"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'buyer' | 'seller'>('buyer');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ai-chat-${mode}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalizedMessages: Message[] = parsed
            .filter((msg): msg is Partial<Message> => !!msg && typeof msg === 'object')
            .map((msg): Message => ({
              id: typeof msg.id === 'string' ? msg.id : crypto.randomUUID(),
              role: (msg.role === 'user' ? 'user' : 'ai') as Message['role'],
              content: typeof msg.content === 'string' ? msg.content : '',
              timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date().toISOString(),
              mediaUrl: typeof msg.mediaUrl === 'string' ? msg.mediaUrl : undefined,
              mediaType: msg.mediaType === 'image' || msg.mediaType === 'video' ? msg.mediaType : undefined,
              type: msg.type === 'listings' ? 'listings' as const : undefined,
              items: msg.type === 'listings' ? normalizeListingItems(msg.items) : undefined,
            }))
            .filter((msg) => msg.content || msg.mediaUrl || (msg.type === 'listings' && msg.items && msg.items.length > 0));
          setMessages(normalizedMessages);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setMessages([]);
    }
  }, [mode]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(`ai-chat-${mode}`, JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [messages, mode]);

  useEffect(() => {
    if (!taRef.current) return;
    const el = taRef.current;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const handleClearChat = useCallback(() => setShowDeleteConfirm(true), []);

  const confirmDeleteChat = useCallback(() => {
    setMessages([]);
    try { localStorage.removeItem(`ai-chat-${mode}`); } catch {}
    setShowDeleteConfirm(false);
  }, [mode]);

  const cancelDeleteChat = useCallback(() => setShowDeleteConfirm(false), []);

  const uploadFile = useCallback(async (file: File) => {
    if (!file || !currentUser) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) { showError('Invalid File', 'Please select an image or video file'); return; }
    if (file.size > 25 * 1024 * 1024) { showError('File Too Large', 'File must be smaller than 25MB'); return; }

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (auth) {
        await auth.authStateReady();
        const firebaseUser = auth.currentUser;
        if (firebaseUser) await firebaseUser.getIdToken(true);
      }
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/upload/ai-chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [currentUser, showError, showSuccess]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleSearch = useCallback(async (searchQuery: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if ((!searchQuery.trim() && !mediaUrl) || isLoading || !currentUser) return;

    if (auth) {
      await auth.authStateReady();
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        await firebaseUser.getIdToken(true);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const userMessage = searchQuery.trim().slice(0, 2000);
    setInput('');
    setIsLoading(true);
    setPendingMedia(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
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
      if (mediaUrl && mediaType) {
        requestBody.mediaUrl = mediaUrl;
        requestBody.mediaType = mediaType;
      }

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 35000);
      let response: Response;
      try {
        response = await apiPost('/api/ai/chat', requestBody, { signal: abortController.signal });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Failed to get response';
        if (response.status === 401) throw new Error('Authentication failed. Please refresh the page and try again.');
        else if (response.status === 429) throw new Error('Rate limit exceeded. Please try again later.');
        else throw new Error(errorMessage);
      }

      const data = await response.json();
      let aiMsg: Message;
      const responseData = data.response;

      if (responseData && typeof responseData === 'object' && responseData.type === 'listings' && Array.isArray(responseData.items)) {
        aiMsg = {
          id: crypto.randomUUID(),
          role: 'ai',
          content: responseData.message || 'Here are some items:',
          timestamp: new Date().toISOString(),
          type: 'listings',
          items: normalizeListingItems(responseData.items),
        };
      } else {
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
      const errorMessage = error instanceof Error && error.name === 'AbortError'
        ? 'The AI response is taking longer than expected. Please try again.'
        : error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.';
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'ai',
        content: errorMessage,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentUser, mode, messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !pendingMedia) || isLoading || !currentUser) return;
    handleSearch(input.trim() || 'User submitted image/video', pendingMedia?.url, pendingMedia?.type);
  }, [input, isLoading, currentUser, handleSearch, pendingMedia]);

  useEffect(() => {
    const query = searchParams.get('query');
    if (query) setInput(decodeURIComponent(query));
  }, [searchParams]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--accent)' }}>
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>AI Assistant</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Sign in to start chatting with your AI assistant.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'var(--accent)' }}
          >
            Get started
          </Link>
        </div>
      </div>
    );
  }

  const suggestions = mode === 'buyer' ? BUYER_SUGGESTIONS : SELLER_SUGGESTIONS;

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden" style={{ background: 'var(--bg)' }}>
      <main className="flex flex-col h-full max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>AI Assistant</h1>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                {mode === 'buyer' ? 'Find anything on the marketplace' : 'Optimize your listings & pricing'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mode toggle */}
            <div
              className="flex rounded-lg p-0.5 gap-0.5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              {(['buyer', 'seller'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 capitalize"
                  style={mode === m
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text-muted)' }
                  }
                >
                  {m === 'buyer' ? <ShoppingCart className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-dim)' }}
                title="Clear conversation"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chat container */}
        <div
          className="flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 chat-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.20)' }}
                >
                  <Sparkles className="w-7 h-7" style={{ color: 'var(--accent)' }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                  {mode === 'buyer' ? 'What are you looking for?' : 'How can I help you sell?'}
                </p>
                <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                  Try one of these or type your own
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSearch(s)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                      style={{
                        background: 'var(--surface-2)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-med)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-med)';
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[85%] sm:max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm break-words whitespace-pre-wrap"
                      style={msg.role === 'ai'
                        ? { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }
                        : { background: 'var(--accent)', color: '#fff' }
                      }
                    >
                      {msg.role === 'user' && msg.mediaUrl && (
                        <div className="mb-2">
                          {msg.mediaType === 'image'
                            ? <img src={msg.mediaUrl} alt="Uploaded" className="rounded-xl max-w-xs max-h-64 object-cover" />
                            : <video src={msg.mediaUrl} controls className="rounded-xl max-w-xs max-h-64" />
                          }
                        </div>
                      )}

                      {msg.type === 'listings' && msg.items ? (
                        <div>
                          {msg.content && <p className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>{msg.content}</p>}
                          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                            {msg.items.map((item, index) => {
                              let listingUrl = item.url.startsWith('/') ? item.url : `/${item.url}`;
                              listingUrl = listingUrl.replace(/^\/listing\//, '/listings/');
                              const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect fill="%231e293b" width="300" height="200"/%3E%3Ctext fill="%2364748b" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo image%3C/text%3E%3C/svg%3E';
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
                                  onClick={() => router.push(listingUrl)}
                                  className="shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-150 w-44"
                                  style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border-med)',
                                  }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-med)'}
                                >
                                  <img
                                    src={imageUrl}
                                    alt={item.title}
                                    className="w-full h-28 object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
                                  />
                                  <div className="p-2.5">
                                    <p className="text-xs font-medium line-clamp-2 mb-1" style={{ color: 'var(--text)' }}>{item.title}</p>
                                    <p className="text-xs font-bold mb-2" style={{ color: 'var(--accent)' }}>{formatPrice(item.price)}</p>
                                    <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>View listing →</span>
                                  </div>
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
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div
                      className="px-4 py-3 rounded-2xl text-sm"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    >
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div
            className={`shrink-0 p-3 safe-area-bottom transition-colors ${isDragging ? 'opacity-70' : ''}`}
            style={{ borderTop: '1px solid var(--border)' }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) uploadFile(file); }}
          >
            {pendingMedia && (
              <div className="mb-2 flex items-center gap-2">
                {pendingMedia.type === 'image'
                  ? <img src={pendingMedia.url} alt="Preview" className="rounded-lg w-14 h-14 object-cover" />
                  : <video src={pendingMedia.url} className="rounded-lg w-14 h-14 object-cover" />
                }
                <button
                  onClick={() => setPendingMedia(null)}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Remove
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || uploadingMedia || !currentUser}
                className="p-2.5 rounded-xl transition-colors shrink-0 disabled:opacity-40"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                title="Upload image or video"
              >
                {uploadingMedia
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <ImageIcon className="w-4 h-4" />
                }
              </button>

              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'buyer' ? 'What are you looking for?' : 'How can I help you sell?'}
                className="flex-1 resize-none rounded-xl text-sm px-3.5 py-2.5 outline-none min-h-[44px] max-h-[120px] transition-colors"
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  border: '1px solid var(--border-med)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-med)')}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
              />

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !pendingMedia) || !currentUser}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)' }}
                onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = '#2563eb'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={cancelDeleteChat}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-med)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Clear conversation</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              This will permanently delete your chat history. You can&apos;t undo this.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelDeleteChat}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteChat}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
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
