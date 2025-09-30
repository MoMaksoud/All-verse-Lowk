'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = "Ask about pricing, comps, or optimization…" }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  const autoGrow = (element?: HTMLTextAreaElement) => {
    const target = element || textareaRef.current;
    if (!target) return;
    
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  };

  useEffect(() => {
    autoGrow();
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || disabled) return;

    const message = input.trim();
    setInput('');
    setSending(true);

    try {
      await onSend(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input on error
      setInput(message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 p-3 flex-shrink-0">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoGrow(e.currentTarget);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled || sending}
          className="flex-1 resize-none rounded-xl bg-zinc-900 text-sm px-4 py-3 outline-none border border-zinc-700 focus:border-zinc-500 min-h-[48px] max-h-[120px] text-zinc-100 placeholder:text-zinc-500 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending || disabled}
          className="h-[48px] inline-flex items-center gap-2 rounded-xl bg-white text-black text-sm font-medium px-4 hover:bg-zinc-100 disabled:opacity-70 transition-colors"
        >
          <Send size={16} />
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
      <p className="text-center text-[10px] text-zinc-500 mt-2">
        Tip: Press Enter to send • Shift+Enter for a new line
      </p>
    </div>
  );
}
