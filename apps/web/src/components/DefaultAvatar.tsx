import React from 'react';
import Image from 'next/image';

interface DefaultAvatarProps {
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function DefaultAvatar({ name, email, size = 'md', className = '' }: DefaultAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const sizeToPixels = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 80,
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-white overflow-hidden ${className}`}
      title={name || email || 'User'}
    >
      <Image
        src="/logo.png"
        alt="AllVerse Logo"
        width={sizeToPixels[size]}
        height={sizeToPixels[size]}
        className="object-contain p-1"
        unoptimized
      />
    </div>
  );
}
