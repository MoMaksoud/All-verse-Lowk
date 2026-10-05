'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendHorizonal, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
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

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return;
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = textareaRef.current;
      if (!el || el.disabled) return;
      el.focus();
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const canSend = !!text.trim() && !sending && !disabled;

  return (
    <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: '#ffffff' }}>
      <div className="flex items-end gap-2.5 rounded-2xl px-4 py-2.5"
        style={{ background: '#fafafa', border: '1px solid rgba(255,255,255,0.08)' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); adjustHeight(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className="flex-1 bg-transparent text-sm leading-relaxed resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: '#27272a',
            minHeight: '22px',
            maxHeight: '120px',
            caretColor: '#3b82f6',
          }}
          onFocus={() => {
            const el = textareaRef.current?.closest('div') as HTMLElement | null;
            if (el) el.style.borderColor = 'rgba(59,130,246,0.4)';
          }}
          onBlur={() => {
            const el = textareaRef.current?.closest('div') as HTMLElement | null;
            if (el) el.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        />
        <button
          onClick={submit}
          disabled={!canSend}
          aria-label="Send"
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: canSend ? '#3b82f6' : '#f4f4f5',
            color: canSend ? '#fff' : '#d4d4d8',
          }}
          onMouseEnter={e => { if (canSend) e.currentTarget.style.background = '#2563eb'; }}
          onMouseLeave={e => { if (canSend) e.currentTarget.style.background = '#3b82f6'; }}
        >
          {sending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <SendHorizonal className="w-3.5 h-3.5" />
          }
        </button>
      </div>
      <p className="text-[10px] text-center mt-2" style={{ color: '#e4e4e7' }}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
