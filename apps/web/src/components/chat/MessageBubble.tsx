'use client';

import { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-1">
      <div className={`max-w-[75%] px-4 py-3 rounded-xl text-sm ${
        message.role === 'assistant' 
          ? 'bg-white border border-zinc-200 text-zinc-900' 
          : 'bg-white text-black shadow ml-auto'
      }`}>
        {message.content}
      </div>
      <div className={`text-[10px] text-zinc-500 ${
        message.role === 'assistant' ? 'pl-3' : 'text-right pr-3'
      }`}>
        {formatTime(message.createdAt)}
      </div>
    </div>
  );
}
