'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { X, Image as ImageIcon, Camera, Upload, AlertCircle } from 'lucide-react';
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
  const hasUploadingItems = items.some(i => i.status === 'uploading');
  const hasErrorItems = items.some(i => i.status === 'error');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {remainingSlots > 0 && (
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500'}
            ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple={type === 'listing'}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex flex-col items-center space-y-3">
            {type === 'profile' ? (
              <Camera className="w-10 h-10 text-zinc-400" />
            ) : (
              <ImageIcon className="w-10 h-10 text-zinc-400" />
            )}
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-zinc-100">
                {isUploading ? (
                  <span className="text-blue-400">Uploading photos...</span>
                ) : (
                  <>
                    <span className="text-blue-400">Click to upload</span>
                    {' '}or drag and drop
                  </>
                )}
              </div>
              
              <div className="text-xs text-zinc-500">
                {type === 'profile' ? 'Profile picture' : `Up to ${remainingSlots} photos`}
                {' '}(PNG, JPG, WebP up to 5MB each)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {hasErrorItems && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Some photos failed to upload. Please try again.</span>
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
                  alt={`Upload ${index + 1}`}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover rounded-xl overflow-hidden"
                  priority={false}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                />
                
                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  {item.status === 'uploading' && (
                    <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <Upload className="w-3 h-3 animate-spin" />
                      Uploading
                    </div>
                  )}
                  {item.status === 'uploaded' && (
                    <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                      ✓ Uploaded
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Error
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error Message */}
              {item.status === 'error' && item.error && (
                <div className="text-xs text-red-400 mt-1 truncate" title={item.error}>
                  {item.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {hasUploadingItems && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-zinc-300">
            <span>Uploading photos to cloud storage...</span>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-300 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
};
