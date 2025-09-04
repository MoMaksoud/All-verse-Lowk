'use client';

import React from 'react';
import Link from 'next/link';
import { Category } from '@marketplace/types';

interface CategoryCardProps {
  category: Category;
  className?: string;
}

export function CategoryCard({ category, className = '' }: CategoryCardProps) {
  return (
    <Link href={`/listings?category=${category.slug}`}>
      <div className={`group bg-white rounded-lg border border-gray-200 p-6 text-center hover:border-primary-300 hover:shadow-md transition-all duration-200 ${className}`}>
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
          {category.icon}
        </div>
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
          {category.name}
        </h3>
      </div>
    </Link>
  );
}
