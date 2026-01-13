import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-[#0A4D8C] text-white hover:bg-[#083d6f] focus-visible:outline-[#0A4D8C]',
      secondary: 'bg-[#1B6FB3] text-white hover:bg-[#155a92] focus-visible:outline-[#1B6FB3]',
      outline: 'border-2 border-[#0A4D8C] dark:border-blue-400 text-[#0A4D8C] dark:text-blue-400 hover:bg-[#0A4D8C] dark:hover:bg-blue-600 hover:text-white focus-visible:outline-[#0A4D8C]',
      ghost: 'text-[#0A4D8C] dark:text-blue-400 hover:bg-[#F5F7FA] dark:hover:bg-gray-800 focus-visible:outline-[#0A4D8C]',
      danger: 'bg-[#D9534F] text-white hover:bg-[#c44743] focus-visible:outline-[#D9534F]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
