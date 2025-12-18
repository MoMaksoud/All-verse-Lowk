/**
 * Utility functions for normalizing image sources
 * Platform-agnostic - works for both web and mobile
 */

/**
 * Normalize image source
 * - External URLs (http/https) are returned as-is
 * - Relative paths from database/storage are prefixed with "/" if needed
 * - Empty/null values return empty string
 */
export function normalizeImageSrc(src: string | null | undefined): string {
  if (!src || typeof src !== 'string') {
    return '';
  }

  const trimmed = src.trim();
  
  if (trimmed === '') {
    return '';
  }
  
  // External URLs are returned as-is (no modification)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // For relative paths (local or from DB), ensure they start with "/"
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Prefix with "/" to make it a valid relative path
  return `/${trimmed}`;
}

/**
 * Get the correct profile picture source based on user type and available sources
 */
interface GetProfilePictureSourceOptions {
  photoURL?: string | null;
  userProfilePic?: string | null;
  profilePicture?: string | null;
}

export function getProfilePictureSource({
  photoURL,
  userProfilePic,
  profilePicture,
}: GetProfilePictureSourceOptions): string {
  // Prioritize photoURL from auth
  if (photoURL && isValidImageUrl(photoURL)) {
    return photoURL;
  }

  // Use stored profilePic from users collection if available
  if (userProfilePic && isValidImageUrl(userProfilePic)) {
    return userProfilePic;
  }

  // Fallback to profilePicture from profiles collection
  if (profilePicture && isValidImageUrl(profilePicture)) {
    return profilePicture;
  }

  // Final fallback to logo (platform-specific path)
  return '/logo.png';
}

/**
 * Validate if a string is a valid image URL
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '') return false;
  
  return (
    trimmed.startsWith('/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  );
}

