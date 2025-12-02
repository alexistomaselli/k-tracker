import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'pending' | 'in_progress' | 'completed' | 'canceled' | 'permanent' | 'draft' | 'active' | 'overdue' | 'secondary';
}

export default function Badge({ variant = 'active', className = '', children, ...props }: BadgeProps) {
  const variants = {
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800',
    permanent: 'bg-purple-100 text-purple-800',
    draft: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    secondary: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
