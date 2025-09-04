import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Blue stylized "A" icon */}
      <div className={`${iconSizes[size]} relative`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Left side of the A */}
          <path
            d="M8 24L16 8L24 24"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Horizontal line in the A */}
          <path
            d="M12 18H20"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      {/* Text */}
      <div className={`flex flex-col ${sizeClasses[size]}`}>
        <span className="font-bold text-white leading-tight">ALLVERSE</span>
        <span className="font-bold text-white leading-tight">GPT</span>
      </div>
    </div>
  );
};
