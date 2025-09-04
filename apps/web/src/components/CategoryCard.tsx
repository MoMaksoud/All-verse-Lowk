'use client';

import React from 'react';
import Link from 'next/link';
import { Category } from '@marketplace/types';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/listings?category=${category.id}`} className="group">
      <div className="card hover:scale-105 transition-all duration-200 cursor-pointer text-center p-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4 group-hover:glow">
          <span className="text-2xl">{category.icon}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-400 transition-colors">
          {category.name}
        </h3>
        <p className="text-gray-400 text-sm">
          {category.itemCount} items
        </p>
      </div>
    </Link>
  );
}
