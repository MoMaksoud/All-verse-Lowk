/**
 * Normalize image files for upload to ensure browser-compatible MIME types.
 * Converts HEIC, HEIF, and other unsupported formats to JPEG so images display correctly.
 */

const WEB_SAFE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence'];

function isWebSafeType(type: string): boolean {
  return WEB_SAFE_IMAGE_TYPES.includes(type?.toLowerCase?.() || '');
}

function isHeicType(type: string): boolean {
  return HEIC_TYPES.includes(type?.toLowerCase?.() || '') || type?.toLowerCase?.().includes('heic');
}


/**
 * Convert a File to JPEG using canvas (works for any format the browser can decode).
 */
async function convertToJpegViaCanvas(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'));
              return;
            }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.92
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image failed to load - format may not be supported'));
    };

    img.src = url;
  });
}

/**
 * Normalize an image file for upload. Converts unsupported formats (HEIC, etc.)
 * to JPEG so they display correctly in all browsers.
 * Only runs in browser environment.
 */
export async function normalizeImageForUpload(file: File): Promise<File> {
  if (typeof window === 'undefined') {
    // Server-side: use as-is but ensure we pass a valid contentType
    const safeType = isWebSafeType(file.type) ? file.type : 'image/jpeg';
    return new File([file], file.name, { type: safeType });
  }

  if (isWebSafeType(file.type)) {
    return file;
  }

  // HEIC: cannot convert in-browser without heic2any (causes Next.js build issues)
  if (isHeicType(file.type)) {
    throw new Error('HEIC format not supported. Please convert to JPEG before uploading (e.g. use your phone\'s share/edit to save as JPEG).');
  }

  // For other unsupported types (x-adobe-dng, etc.), try canvas conversion
  try {
    return await convertToJpegViaCanvas(file);
  } catch (err) {
    console.warn('Canvas conversion failed, using original with forced JPEG type:', err);
    // Last resort: create new File with JPEG type (may not display if format is truly unsupported)
    return new File([file], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  }
}
