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
      {/* Logo Image */}
      <div className={`${iconSizes[size]} relative`}>
        <img
          src="/logo.jpg"
          alt="ALL VERSE GPT"
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
      
      {/* Text */}
      <div className={`flex flex-col ${sizeClasses[size]}`}>
        <span className="font-bold text-white leading-tight">ALL VERSE GPT</span>
      </div>
    </div>
  );
};
