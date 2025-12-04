'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Image, Video, File, AlertCircle } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import StorageService from '@/lib/storage';

interface FileUploadProps {
  onUploadComplete: (result: { url: string; path: string }) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  uploadType?: 'profile-picture';
  userId?: string;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  accept = 'image/*,video/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 1,
  uploadType = 'profile-picture',
  userId,
  className = '',
  disabled = false,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const { uploadProfilePicture, isUploading, progress, error, clearError } = useFileUpload({
    onSuccess: (result) => {
      onUploadComplete({ url: result.url, path: result.path });
      setSelectedFiles([]);
    },
    onError: (errorMessage) => {
      onUploadError?.(errorMessage);
    },
  });

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate files
    for (const file of fileArray) {
      const validation = StorageService.validateFile(file, {
        maxSize,
        allowedTypes: accept.split(',').map(type => type.trim()),
      });

      if (!validation.isValid) {
        onUploadError?.(validation.error || 'Invalid file');
        return;
      }
    }

    setSelectedFiles(fileArray);
    clearError();

    // Upload files
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      try {
        if (!userId) throw new Error('User ID is required for profile picture upload');
        const result = await uploadProfilePicture(file, userId, 'user@example.com'); // TODO: Get actual user email

        if (result) {
          onUploadComplete({ url: result.url, path: result.path });
        }
      } catch (err: any) {
        onUploadError?.(err.message || 'Upload failed');
      }
    }
  }, [uploadProfilePicture, maxSize, accept, userId, onUploadComplete, onUploadError, clearError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect, disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  const openFileDialog = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-accent-500 bg-accent-500/10'
            : 'border-gray-600 hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-300 mb-1">
          {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-gray-500">
          {accept.includes('image/') && 'Images'} {accept.includes('video/') && 'Videos'} 
          up to {formatFileSize(maxSize)}
        </p>
      </div>

      {/* Progress Bar */}
      {isUploading && progress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-300">
            <span>Processing files...</span>
            <span>{progress.percentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-accent-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={clearError}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
