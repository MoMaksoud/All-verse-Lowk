'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendHorizonal, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  /** When set, populates the input with this text (e.g. from AI suggestion) */
  suggestedText?: string;
  onSuggestedTextConsumed?: () => void;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Message…',
  suggestedText,
  onSuggestedTextConsumed,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When a suggestion arrives, populate the input and focus it.
  useEffect(() => {
    if (suggestedText) {
      setText(suggestedText);
      onSuggestedTextConsumed?.();
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      });
    }
  }, [suggestedText, onSuggestedTextConsumed]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const submit = useCallback(async () => {
    if (!text.trim() || sending || disabled) return;
    const msg = text.trim();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      setSending(true);
      await onSendMessage(msg);
    } catch {
      setText(msg);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [text, sending, disabled, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSend = !!text.trim() && !sending && !disabled;

  return (
    <div className="flex items-end gap-2 px-4 py-3 border-t border-zinc-800 bg-zinc-950">
      <div className="flex-1 min-w-0 bg-zinc-800 rounded-2xl px-4 py-2.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); adjustHeight(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none text-sm leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '22px', maxHeight: '120px' }}
        />
      </div>

      <button
        onClick={submit}
        disabled={!canSend}
        aria-label="Send"
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          canSend ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
        }`}
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
      </button>
    </div>
  );
}
