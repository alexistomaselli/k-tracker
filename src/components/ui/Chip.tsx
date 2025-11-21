import { HTMLAttributes } from 'react';

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export default function Chip({ priority = 'medium', className = '', children, ...props }: ChipProps) {
  const priorities = {
    low: 'bg-gray-200 text-gray-700',
    medium: 'bg-[#F0AD4E] text-white',
    high: 'bg-orange-500 text-white',
    critical: 'bg-[#D9534F] text-white',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${priorities[priority]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
