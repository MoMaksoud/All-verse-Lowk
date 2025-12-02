/**
 * Utility functions for getting the correct profile picture source
 * Handles Google users, stored profile pictures, and fallbacks
 */

import { User } from 'firebase/auth';

interface GetProfilePictureSourceOptions {
  currentUser?: User | null;
  userProfilePic?: string | null; // From users collection profilePic field
  profilePicture?: string | null; // From profiles collection profilePicture field
}

/**
 * Get the correct profile picture source based on user type and available sources
 * Priority for Google users: user.photoURL > userProfilePic > profilePicture > default
 * Priority for non-Google users: userProfilePic > profilePicture > default
 */
export function getProfilePictureSource({
  currentUser,
  userProfilePic,
  profilePicture,
}: GetProfilePictureSourceOptions): string | null {
  // Always prioritize currentUser.photoURL from auth.currentUser (always latest)
  // This ensures we always read directly from Firebase Auth, not cached state
  if (currentUser?.photoURL) {
    const photoURL = currentUser.photoURL;
    // Validate URL format: must start with "/" or "http"
    if (photoURL.startsWith('/') || photoURL.startsWith('http://') || photoURL.startsWith('https://')) {
      return photoURL;
    }
    // If invalid format, fall through to other sources
  }

  // Use stored profilePic from users collection if available
  if (userProfilePic) {
    // Validate URL format
    if (userProfilePic.startsWith('/') || userProfilePic.startsWith('http://') || userProfilePic.startsWith('https://')) {
      return userProfilePic;
    }
    // If invalid format, fall through to other sources
  }

  // Fallback to profilePicture from profiles collection
  if (profilePicture) {
    // Validate URL format
    if (profilePicture.startsWith('/') || profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
      return profilePicture;
    }
    // If invalid format, fall through to default
  }

  // Final fallback to default avatar
  return '/default-avatar.png';
}

/**
 * Normalize profile picture source for Next.js Image component
 * Ensures external URLs are returned as-is, local paths are prefixed with "/"
 */
export function normalizeProfilePictureSrc(src: string | null | undefined): string {
  if (!src || typeof src !== 'string') {
    return '/default-avatar.png';
  }

  const trimmed = src.trim();
  
  if (trimmed === '') {
    return '/default-avatar.png';
  }
  
  // External URLs (Google photos) are returned as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // For relative paths, ensure they start with "/"
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Prefix with "/" to make it a valid relative path
  return `/${trimmed}`;
}

