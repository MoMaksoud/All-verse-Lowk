import { SkeletonCard } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div className="min-h-screen bg-dark-950">
      <div className="h-16 bg-dark-800 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-12 bg-gray-700 rounded-lg mb-8 max-w-md animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
