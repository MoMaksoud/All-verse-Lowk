'use client';

import React, { useState, memo } from 'react';
import Image from 'next/image';
import { User } from 'firebase/auth';
import { DefaultAvatar } from './DefaultAvatar';
import { storagePathToUrl } from '@/lib/storage-utils';
import { normalizeImageSrc } from '@/lib/image-utils';
import { getProfilePictureSource, normalizeProfilePictureSrc } from '@/lib/profile-picture-utils';

interface ProfilePictureProps {
  src?: string | null;
  alt?: string;
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackOnly?: boolean; // If true, only show fallback (for testing)
  currentUser?: User | null; // Firebase Auth user (for Google photoURL)
  userProfilePic?: string | null; // From users collection profilePic field
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

const sizeToPixels: Record<NonNullable<ProfilePictureProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

const sizeToPx: Record<NonNullable<ProfilePictureProps['size']>, string> = {
  sm: '32px',
  md: '48px',
  lg: '64px',
  xl: '80px',
};

export const ProfilePicture = memo(function ProfilePicture({
  src,
  alt = 'Profile',
  name,
  email,
  size = 'md',
  className = '',
  fallbackOnly = false,
  currentUser,
  userProfilePic,
}: ProfilePictureProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  // Get the correct profile picture source using utility function
  const profilePictureSource = React.useMemo(() => {
    return getProfilePictureSource({
      currentUser,
      userProfilePic,
      profilePicture: src,
    });
  }, [currentUser, userProfilePic, src]);

  // Safe URL validation: enforce valid format for Next.js Image
  const imageUrl = React.useMemo(() => {
    if (!profilePictureSource) return '/default-avatar.png';
    
    // If it's already a URL (Google photo), use it as-is
    if (profilePictureSource.startsWith('http://') || profilePictureSource.startsWith('https://')) {
      return profilePictureSource;
    }
    
    // If it's a local path starting with "/", use it as-is
    if (profilePictureSource.startsWith('/')) {
      return profilePictureSource;
    }
    
    // For storage paths that don't start with "/" or "http", convert to full URL
    // This handles Firebase Storage paths like "users/.../profile/..."
    const url = storagePathToUrl(profilePictureSource);
    
    // If storagePathToUrl returns empty or invalid, fallback to default
    if (!url || url === '' || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/'))) {
      return '/default-avatar.png';
    }
    
    return url;
  }, [profilePictureSource]);

  // Reset error state when profile picture source changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [profilePictureSource]);

  // Memoize className normalization and dimensions to prevent render-phase computation
  const containerClasses = React.useMemo(() => {
    const normalizedCustomClass = (className || '')
      .replace(/\bflex-shrink-0\b/g, 'shrink-0')
      .replace(/\s+/g, ' ')
      .trim();
    return `shrink-0 relative overflow-hidden rounded-full ${normalizedCustomClass}`.trim();
  }, [className]);
  
  // Memoize pixel dimensions for Image component
  const dimensions = React.useMemo(() => ({
    width: sizeToPixels[size],
    height: sizeToPixels[size],
  }), [size]);

  // Show fallback if fallbackOnly is true, or if there's an error loading the image
  // If imageUrl is the default avatar path, try to load it as an image first
  const showFallback = fallbackOnly || (imageError && imageUrl !== '/default-avatar.png');

  // If no image URL or fallback only, show default avatar
  if (showFallback || !imageUrl || imageUrl === '') {
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
    <div 
      className={containerClasses}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <Image
        src={imageUrl}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        className="rounded-full object-cover"
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
        onLoad={() => {
          setImageLoading(false);
        }}
        unoptimized
        priority={size === 'sm' || size === 'md'}
      />
      {imageLoading && (
        <div 
          className="absolute inset-0 bg-gray-700 animate-pulse rounded-full" 
          style={{ width: dimensions.width, height: dimensions.height }}
        />
      )}
    </div>
  );
});

