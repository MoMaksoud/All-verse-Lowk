'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { DefaultAvatar } from './DefaultAvatar';
import { storagePathToUrl } from '@/lib/storage-utils';

interface ProfilePictureProps {
  src?: string | null;
  alt?: string;
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackOnly?: boolean; // If true, only show fallback (for testing)
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

export function ProfilePicture({
  src,
  alt = 'Profile',
  name,
  email,
  size = 'md',
  className = '',
  fallbackOnly = false,
}: ProfilePictureProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Convert storage path to URL if needed (handle both paths and URLs)
  const imageUrl = React.useMemo(() => {
    if (!src) return '';
    // If it's already a URL, use it; otherwise convert path to URL
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src;
    }
    // Convert storage path to URL
    return storagePathToUrl(src);
  }, [src]);

  // Reset error state when src changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [src]);

  // Show fallback if no src, error occurred, or fallbackOnly is true
  const showFallback = fallbackOnly || !imageUrl || imageError;

  if (showFallback) {
    return (
      <DefaultAvatar
        name={name}
        email={email}
        size={size}
        className={className}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className} relative flex-shrink-0`}>
      <Image
        src={imageUrl}
        alt={alt}
        width={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : 80}
        height={size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : 80}
        className="rounded-full object-cover w-full h-full"
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
        onLoad={() => {
          setImageLoading(false);
        }}
        unoptimized // Render original asset without Next.js optimization, cropping, or transparency forcing
        style={{ objectFit: 'cover' }} // Ensure no forced cropping
      />
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-700 rounded-full animate-pulse" />
      )}
    </div>
  );
}

