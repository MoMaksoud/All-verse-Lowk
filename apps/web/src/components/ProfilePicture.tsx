'use client';

import React, { useState } from 'react';
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

export function ProfilePicture({
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

  // Convert storage path to URL if needed (handle both paths and URLs)
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
    
    // Convert storage path to URL, then normalize for Next.js Image
    const url = storagePathToUrl(profilePictureSource);
    return normalizeImageSrc(url) || '/default-avatar.png';
  }, [profilePictureSource]);

  // Reset error state when profile picture source changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [profilePictureSource]);

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

  // Use consistent 64x64 dimensions for all avatars (circle constraint)
  const avatarSize = 64;
  
  return (
    <div className={`${sizeClasses[size]} ${className} relative flex-shrink-0`}>
      <Image
        src={imageUrl}
        alt={alt}
        width={avatarSize}
        height={avatarSize}
        className="rounded-full object-cover"
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
        onLoad={() => {
          setImageLoading(false);
        }}
        unoptimized
      />
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-700 rounded-full animate-pulse" />
      )}
    </div>
  );
}

