import React from 'react';

interface DefaultAvatarProps {
  name?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function DefaultAvatar({ name, email, size = 'md', className = '' }: DefaultAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl',
  };

  // Get initials from name or email
  const getInitials = () => {
    if (name) {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  // Generate a consistent color based on name/email
  const getAvatarColor = () => {
    const text = name || email || 'default';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      'bg-red-500',
      'bg-blue-500', 
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${getAvatarColor()} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
      title={name || email || 'User'}
    >
      {getInitials()}
    </div>
  );
}
