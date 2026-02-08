'use client';

import React, { useState, useRef, useCallback } from 'react';
import { X, Camera, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageSearchModal({ isOpen, onClose }: ImageSearchModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const handleCameraCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const handleSearch = useCallback(async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Convert data URL to blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const file = new File([blob], 'search-image.jpg', { type: 'image/jpeg' });

      // Create FormData
      const formData = new FormData();
      formData.append('image', file);

      // Send to API
      const apiResponse = await fetch('/api/universal-search', {
        method: 'POST',
        body: formData,
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Image search failed');
      }

      const data = await apiResponse.json();
      
      // Navigate to search results with image query
      const query = data.extractedQuery || 'image search';
      router.push(`/search?query=${encodeURIComponent(query)}&imageSearch=true`);
      onClose();
    } catch (err) {
      console.error('Image search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, router, onClose]);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative bg-dark-900 border border-white/20 rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Search with Image</h2>
          <p className="text-gray-400 text-sm">
            Take a photo or upload an image to find matching products
          </p>
        </div>

        {/* Image Preview */}
        {selectedImage && (
          <div className="mb-4 relative">
            <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-accent-500/50">
              <Image
                src={selectedImage}
                alt="Selected image"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 rounded-full transition-colors"
              aria-label="Remove image"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Upload Options */}
        {!selectedImage && (
          <div className="space-y-3 mb-6">
            {/* Camera Option */}
            <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all">
              <Camera className="w-6 h-6 text-accent-400" />
              <div className="flex-1">
                <div className="text-white font-medium">Take Photo</div>
                <div className="text-gray-400 text-sm">Use your camera</div>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
            </label>

            {/* Upload Option */}
            <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all">
              <Upload className="w-6 h-6 text-accent-400" />
              <div className="flex-1">
                <div className="text-white font-medium">Upload Image</div>
                <div className="text-gray-400 text-sm">Choose from device</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          {selectedImage && (
            <button
              onClick={handleSearch}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
