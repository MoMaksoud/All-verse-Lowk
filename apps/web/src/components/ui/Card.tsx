import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#0B1220] p-4 md:p-6 shadow-lg ${className}`}>
      {children}
    </div>
  );
}
