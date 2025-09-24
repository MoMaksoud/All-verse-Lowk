import React from 'react';
import Image from 'next/image';

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

const avatarSizes = {
  sm: { width: 32, height: 32, fontSize: 'text-xs' },
  md: { width: 40, height: 40, fontSize: 'text-sm' },
  lg: { width: 48, height: 48, fontSize: 'text-base' },
  xl: { width: 64, height: 64, fontSize: 'text-lg' },
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  fallback,
  className = '',
}) => {
  const sizeConfig = avatarSizes[size];
  const initials = fallback ? getInitials(fallback) : (alt ? getInitials(alt) : '?');

  if (src) {
    return (
      <div className={`relative overflow-hidden rounded-full bg-gray-300 ${className}`}>
        <Image
          src={src}
          alt={alt || 'Avatar'}
          width={sizeConfig.width}
          height={sizeConfig.height}
          className="object-cover"
          priority={false}
        />
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-center rounded-full bg-gray-300 text-gray-700 font-medium ${sizeConfig.fontSize} ${className}`}
      style={{ width: sizeConfig.width, height: sizeConfig.height }}
    >
      {initials}
    </div>
  );
};
