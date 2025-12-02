/**
 * Utility functions for converting Firebase Storage paths to URLs
 * Ensures consistent URL generation from stored paths
 */

/**
 * Get the Firebase Storage bucket name from environment or default
 */
function getStorageBucketName(): string {
  // Try environment variables first
  const envBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                    process.env.FIREBASE_STORAGE_BUCKET;
  
  if (envBucket) {
    return envBucket;
  }

  // Fallback: try to construct from project ID
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                    process.env.FIREBASE_PROJECT_ID;
  
  if (projectId) {
    return `${projectId}.appspot.com`;
  }

  // Last resort: return empty string (will be handled by caller)
  return '';
}

/**
 * Convert a Firebase Storage path to a public URL
 * @param storagePath - The storage path (e.g., "users/{userId}/profile/{filename}")
 * @param bucketName - Optional bucket name, defaults to extracting from env or using default
 * @returns Public URL for the stored file
 */
export function storagePathToUrl(storagePath: string, bucketName?: string): string {
  if (!storagePath || typeof storagePath !== 'string') {
    return '';
  }

  // If already a URL, return as-is
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }

  // Get bucket name (use provided or extract from env)
  const bucket = bucketName || getStorageBucketName();
  
  if (!bucket) {
    console.warn('Storage bucket name not found. Cannot convert path to URL:', storagePath);
    return '';
  }

  // Ensure path doesn't start with /
  const cleanPath = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath;
  
  // Construct public URL
  return `https://storage.googleapis.com/${bucket}/${cleanPath}`;
}

/**
 * Extract storage path from a Firebase Storage URL
 * @param url - The Firebase Storage URL
 * @returns The storage path or empty string if extraction fails
 */
export function urlToStoragePath(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // If already a path (not a URL), return as-is
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    // Handle both formats:
    // 1. https://storage.googleapis.com/{bucket}/{path}
    // 2. https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
    if (urlObj.hostname === 'storage.googleapis.com') {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        // Remove bucket name, return rest as path
        return pathParts.slice(1).join('/');
      }
    } else if (urlObj.hostname === 'firebasestorage.googleapis.com') {
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
      if (pathMatch) {
        return decodeURIComponent(pathMatch[1]);
      }
    }
  } catch (error) {
    console.warn('Failed to extract storage path from URL:', url, error);
  }

  return '';
}

