'use client';

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

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card">
          <div className="p-6 text-center space-y-2">
            <Skeleton height="2.5rem" width="4rem" className="mx-auto" />
            <Skeleton height="1.125rem" width="8rem" className="mx-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <section className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6">
          <Skeleton height="1.5rem" width="12rem" className="mx-auto rounded-full" />
          <Skeleton height="4rem" width="24rem" className="mx-auto" />
          <Skeleton height="1.5rem" width="32rem" className="mx-auto" />
          <Skeleton height="3rem" width="32rem" className="mx-auto rounded-2xl" />
        </div>
      </div>
    </section>
  );
}
