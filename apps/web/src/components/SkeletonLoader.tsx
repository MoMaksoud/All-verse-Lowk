import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

export function Skeleton({ 
  className = '', 
  width = '100%', 
  height = '1rem', 
  rounded = true,
  animate = true 
}: SkeletonProps) {
  return (
    <div
      className={`bg-gray-700/50 ${rounded ? 'rounded-lg' : ''} ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <Skeleton height="200px" className="rounded-t-2xl" />
      <div className="p-4 space-y-3">
        <Skeleton height="1.25rem" width="80%" />
        <Skeleton height="0.875rem" width="100%" />
        <Skeleton height="0.875rem" width="60%" />
        <div className="flex justify-between items-center mt-4">
          <Skeleton height="1rem" width="4rem" />
          <Skeleton height="2rem" width="2rem" className="rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonCategoryCard() {
  return (
    <div className="card h-32 flex items-center justify-center">
      <div className="text-center space-y-2">
        <Skeleton height="3rem" width="3rem" className="rounded-full mx-auto" />
        <Skeleton height="1rem" width="5rem" className="mx-auto" />
      </div>
    </div>
  );
}

export function SkeletonSearchBar() {
  return (
    <div className="relative max-w-2xl mx-auto">
      <Skeleton height="3rem" className="rounded-2xl" />
    </div>
  );
}

export function SkeletonAIWidget() {
  return (
    <div className="card h-64">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton height="2rem" width="2rem" className="rounded-full" />
          <Skeleton height="1.25rem" width="8rem" />
        </div>
        <div className="space-y-3">
          <Skeleton height="0.875rem" width="100%" />
          <Skeleton height="0.875rem" width="90%" />
          <Skeleton height="0.875rem" width="75%" />
        </div>
        <div className="flex gap-2 mt-6">
          <Skeleton height="2.5rem" width="6rem" className="rounded-lg" />
          <Skeleton height="2.5rem" width="6rem" className="rounded-lg" />
        </div>
      </div>
    </div>
  );
}

