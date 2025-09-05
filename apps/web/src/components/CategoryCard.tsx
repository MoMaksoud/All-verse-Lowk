'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@marketplace/types';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  // Fallback emojis for each category
  const getCategoryEmoji = (categoryId: string) => {
    switch (categoryId) {
      case 'electronics': return '📱';
      case 'fashion': return '👗';
      case 'home': return '🏠';
      case 'sports': return '⚽';
      case 'automotive': return '🚗';
      default: return '📦';
    }
  };

  return (
    <Link href={`/listings?category=${category.id}`} className="group">
      <div className="card hover:scale-105 transition-all duration-200 cursor-pointer text-center p-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4 group-hover:glow">
          {category.iconImage ? (
            <Image
              src={category.iconImage}
              alt={category.name}
              width={32}
              height={32}
              className="filter brightness-0 invert" // Makes the icon white
              onError={(e) => {
                // Fallback to emoji if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<span class="text-2xl">${getCategoryEmoji(category.id)}</span>`;
                }
              }}
            />
          ) : (
            <span className="text-2xl">{getCategoryEmoji(category.id)}</span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-400 transition-colors">
          {category.name}
        </h3>
      </div>
    </Link>
  );
}
