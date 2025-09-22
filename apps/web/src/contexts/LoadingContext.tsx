'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingContextType {
  isGlobalLoading: boolean;
  startLoading: (reason?: string) => void;
  stopLoading: () => void;
  loadingReason?: string;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingReason, setLoadingReason] = useState<string | undefined>();
  const [loadingCount, setLoadingCount] = useState(0);

  const startLoading = useCallback((reason?: string) => {
    setLoadingCount(prev => prev + 1);
    setIsGlobalLoading(true);
    if (reason) {
      setLoadingReason(reason);
    }
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingCount(prev => {
      const newCount = Math.max(0, prev - 1);
      if (newCount === 0) {
        setIsGlobalLoading(false);
        setLoadingReason(undefined);
      }
      return newCount;
    });
  }, []);

  return (
    <LoadingContext.Provider value={{
      isGlobalLoading,
      startLoading,
      stopLoading,
      loadingReason
    }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
