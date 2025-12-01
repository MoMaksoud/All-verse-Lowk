import React from 'react';
import Image from 'next/image';

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
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 48, height: 48 }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Image */}
      <div className={`relative`}>
        <Image
          src="/logo.png"
          alt="ALL VERSE GPT"
          width={iconSizes[size].width}
          height={iconSizes[size].height}
          className="object-cover rounded-lg"
          priority={size === 'lg'} // Priority for large logos
          {...(size === 'lg' && {
            placeholder: "blur",
            blurDataURL: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          })}
        />
      </div>
      
      {/* Text */}
      <div className={`flex flex-col ${sizeClasses[size]}`}>
        <span className="font-bold text-white leading-tight">ALL VERSE GPT</span>
      </div>
    </div>
  );
};
