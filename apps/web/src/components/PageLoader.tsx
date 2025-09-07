'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-dark-800 rounded-lg p-6 flex items-center space-x-3 shadow-xl border border-dark-600">
        <Loader2 className="w-6 h-6 text-accent-400 animate-spin" />
        <span className="text-white font-medium">{message}</span>
      </div>
    </div>
  );
}
