'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { X, ImagePlus, Camera, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { uploadListingPhotoFile } from '@/lib/storage';
import { PhotoItem, UploadStatus, isCloudUrl } from '@/types/photos';
import { v4 as uuidv4 } from 'uuid';

interface PhotoUploadProps {
  uid: string;
  listingId: string;
  max?: number;
  onChange?: (urls: string[]) => void;
  initial?: string[];
  className?: string;
  type?: 'profile' | 'listing';
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  uid,
  listingId,
  max = 6,
  onChange,
  initial = [],
  className = '',
  type = 'listing',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const prevUrlsRef = useRef<string[]>([]);

  // Initialize items from existing photos
  useEffect(() => {
    if (initial.length > 0) {
      const existingItems: PhotoItem[] = initial.map((url, index) => ({
        id: `existing-${index}`,
        preview: url,
        url: url,
        status: 'uploaded' as UploadStatus,
      }));
      setItems(existingItems);
    }
  }, [initial]);

  // Memoize the URLs to prevent unnecessary re-renders
  const cloudUrls = useMemo(() => {
    return items
      .filter(i => i.status === 'uploaded' && i.url && isCloudUrl(i.url))
      .map(i => i.url!);
  }, [items]);

  // Emit only HTTPS URLs upward when they actually change
  useEffect(() => {
    if (!onChange) return;
    
    // Only call onChange if URLs have actually changed
    const currentUrls = cloudUrls;
    const prevUrls = prevUrlsRef.current;
    
    if (currentUrls.length !== prevUrls.length || 
        currentUrls.some((url, index) => url !== prevUrls[index])) {
      prevUrlsRef.current = currentUrls;
      onChange(currentUrls);
    }
  }, [cloudUrls, onChange]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!uid || !listingId) {
      console.error('❌ Missing user ID or listing ID for photo upload');
      return;
    }

    const fileArray = Array.from(files);
    const validFiles = fileArray.slice(0, Math.max(0, max - items.length));

    if (validFiles.length === 0) {
      return;
    }

    // Add new items with uploading status
    const newItems: PhotoItem[] = validFiles.map(file => ({
      id: uuidv4(),
      file,
      preview: URL.createObjectURL(file),
      status: 'uploading' as UploadStatus,
    }));

    setItems(prev => [...prev, ...newItems]);
    setIsUploading(true);

    // Upload files sequentially
    for (const item of newItems) {
      try {
        const { url, storagePath } = await uploadListingPhotoFile({
          uid,
          listingId,
          file: item.file!,
        });
        
        setItems(prev => prev.map(p =>
          p.id === item.id 
            ? { ...p, url, storagePath, status: 'uploaded' as UploadStatus }
            : p
        ));
      } catch (error: any) {
        console.error('❌ Failed to upload photo:', error);
        setItems(prev => prev.map(p =>
          p.id === item.id 
            ? { ...p, status: 'error' as UploadStatus, error: error?.message ?? 'Upload failed' }
            : p
        ));
      }
    }

    setIsUploading(false);
  }, [uid, listingId, max, items.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  const handleRemovePhoto = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const remainingSlots = max - items.length;
    const hasErrorItems = items.some(i => i.status === 'error');

  // Listings: once a photo exists, adding more is a tile in the grid.
  const asTile = type === 'listing' && items.length > 0;
  const dropProps = { onDrop: handleDrop, onDragOver: handleDragOver, onDragLeave: handleDragLeave };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple={type === 'listing'}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Area */}
      {remainingSlots > 0 && !asTile && (
        <div
          className={`
            relative border border-dashed rounded-2xl px-8 ${type === 'listing' ? 'py-12' : 'py-8'} text-center cursor-pointer transition-colors
            ${dragOver ? 'border-primary-600 bg-primary-50' : 'border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50'}
            ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <div className="flex flex-col items-center space-y-3">
            {type === 'profile' ? (
              <Camera strokeWidth={1.5} className="w-8 h-8 text-zinc-500" />
            ) : (
              <ImagePlus strokeWidth={1.5} className="w-8 h-8 text-zinc-500" />
            )}
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-zinc-900">
                {isUploading ? (
                  <span className="text-primary-700">Uploading…</span>
                ) : (
                  <>
                    <span className="text-primary-700">Choose photos</span>
                    {' '}or drag and drop
                  </>
                )}
              </div>
              
              <div className="text-xs text-zinc-500">
                {type === 'profile' ? 'Profile picture' : `${remainingSlots} more allowed`}
                {' '}· PNG, JPG or WebP, up to 5MB each
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {hasErrorItems && (
        <div className="text-sm text-red-800 bg-red-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Some photos didn’t upload. Remove them and try again.</span>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item, index) => (
            <div key={item.id} className="relative group">
              <div className="relative aspect-square">
                <Image
                  src={item.preview}
                  alt={`Photo ${index + 1}`}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover rounded-xl overflow-hidden"
                  priority={false}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                />
                
                {item.status === 'uploading' && (
                  <div className="absolute inset-0 grid place-items-center rounded-xl bg-white/60">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-700" aria-label="Uploading" />
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="absolute inset-0 grid place-items-center rounded-xl bg-red-50/80">
                    <AlertCircle className="w-5 h-5 text-red-700" aria-label="Upload failed" />
                  </div>
                )}
                {index === 0 && item.status === 'uploaded' && type === 'listing' && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-zinc-950/70 px-2 py-0.5 text-xs text-white">Cover</span>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-sm transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error Message */}
              {item.status === 'error' && item.error && (
                <div className="text-xs text-red-700 mt-1 truncate" title={item.error}>
                  {item.error}
                </div>
              )}
            </div>
          ))}
          {asTile && remainingSlots > 0 && (
            <button
              type="button"
              onClick={handleClick}
              disabled={isUploading}
              {...dropProps}
              className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-sm font-medium transition-colors disabled:opacity-60 ${
                dragOver ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:bg-zinc-50'
              }`}
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus strokeWidth={1.5} className="h-6 w-6" />}
              {isUploading ? 'Uploading…' : 'Add photo'}
              <span className="text-xs font-normal text-zinc-500">{remainingSlots} left</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
