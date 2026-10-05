import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-4 md:p-6 shadow-lg ${className}`}>
      {children}
    </div>
  );
}
