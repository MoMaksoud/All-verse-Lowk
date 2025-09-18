'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';

interface PhotoUploadProps {
  onUpload: (urls: string[]) => void;
  onRemove?: (index: number) => void;
  maxPhotos?: number;
  existingPhotos?: string[];
  className?: string;
  type?: 'profile' | 'listing';
  listingId?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onUpload,
  onRemove,
  maxPhotos = 1,
  existingPhotos = [],
  className = '',
  type = 'profile',
  listingId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { uploading, error, uploadProfilePhoto, uploadListingPhotos, clearError } = usePhotoUpload();

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.slice(0, maxPhotos - existingPhotos.length);

    if (validFiles.length === 0) {
      return;
    }

    clearError();

    try {
      let urls: string[] = [];

      if (type === 'profile' && validFiles.length === 1) {
        const result = await uploadProfilePhoto(validFiles[0]);
        if (result) {
          urls = [result.url];
        }
      } else if (type === 'listing') {
        // For listing photos, convert to data URLs locally
        console.log('Converting listing photos to data URLs:', validFiles.length);
        urls = await Promise.all(
          validFiles.map(file => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
          })
        );
        console.log('Photos converted to data URLs:', urls.length);
      }

      if (urls.length > 0) {
        onUpload([...existingPhotos, ...urls]);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  }, [existingPhotos, maxPhotos, type, uploadProfilePhoto, onUpload, clearError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemovePhoto = useCallback((index: number) => {
    if (onRemove) {
      onRemove(index);
    }
  }, [onRemove]);

  const remainingSlots = maxPhotos - existingPhotos.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {remainingSlots > 0 && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-accent-500 bg-accent-500/10' : 'border-gray-600 hover:border-gray-500'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={type === 'listing'}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={uploading}
          />

          <div className="flex flex-col items-center space-y-2">
            {type === 'profile' ? (
              <Camera className="w-8 h-8 text-gray-400" />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            )}
            
            <div className="text-sm text-gray-400">
              {uploading ? (
                <span className="text-accent-500">Uploading...</span>
              ) : (
                <>
                  <span className="text-accent-500 hover:text-accent-400">Click to upload</span>
                  {' '}or drag and drop
                </>
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              {type === 'profile' ? 'Profile picture' : `Up to ${remainingSlots} photos`}
              {' '}(PNG, JPG, WebP up to 5MB)
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Existing Photos */}
      {existingPhotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {existingPhotos.map((photo, index) => (
            <div key={index} className="relative group">
              <img
                src={photo}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-600"
              />
              <button
                onClick={() => handleRemovePhoto(index)}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-accent-500 h-2 rounded-full transition-all duration-300"
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  );
};
