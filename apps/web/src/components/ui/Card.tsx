import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-4 ${className}`}>
      {children}
    </div>
  );
}
