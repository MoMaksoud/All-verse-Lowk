'use client';

import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function VoiceInputButton({ 
  onResult, 
  onError,
  className = '',
  size = 'md',
  disabled = false
}: VoiceInputButtonProps) {
  const { isListening, isSupported, error, toggleListening } = useVoiceInput({
    onResult,
    onError,
    continuous: false,
    interimResults: true
  });

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = () => {
    if (!disabled) {
      toggleListening();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-full transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
        ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 animate-pulse'
            : 'bg-gray-600 hover:bg-gray-500 text-gray-200 focus:ring-gray-500'
        }
      `}
      title={isListening ? 'Stop listening' : 'Start voice input'}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
    >
      {isListening ? (
        <MicOff className={iconSizes[size]} />
      ) : (
        <Mic className={iconSizes[size]} />
      )}
    </button>
  );
}

// Voice input status indicator component
export function VoiceInputStatus({ 
  isListening, 
  transcript, 
  error 
}: { 
  isListening: boolean; 
  transcript: string; 
  error: string | null; 
}) {
  if (error) {
    return (
      <div className="text-red-400 text-sm mt-2 flex items-center gap-2">
        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
        {error}
      </div>
    );
  }

  if (isListening) {
    return (
      <div className="text-blue-400 text-sm mt-2 flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        Listening... {transcript && `"${transcript}"`}
      </div>
    );
  }

  return null;
}
