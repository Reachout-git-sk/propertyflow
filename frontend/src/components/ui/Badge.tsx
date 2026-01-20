import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'primary' | 'gray';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', className = '' }) => {
  const variants = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    primary: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>{children}</span>;
};
