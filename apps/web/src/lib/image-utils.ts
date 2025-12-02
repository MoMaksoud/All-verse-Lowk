/**
 * Utility functions for normalizing image sources for Next.js Image component
 * Ensures database/storage paths are properly formatted
 */

/**
 * Normalize image source for Next.js Image component
 * - External URLs (http/https) are returned as-is
 * - Relative paths from database/storage are prefixed with "/" if needed
 * - Empty/null values return empty string
 * - Ensures all local/DB paths have leading "/" for Next.js Image
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
  // This is required for Next.js Image component to work correctly
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Prefix with "/" to make it a valid relative path for Next.js Image
  return `/${trimmed}`;
}

