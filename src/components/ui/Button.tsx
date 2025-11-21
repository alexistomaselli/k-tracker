import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-[#0A4D8C] text-white hover:bg-[#083d6f] focus-visible:outline-[#0A4D8C]',
      secondary: 'bg-[#1B6FB3] text-white hover:bg-[#155a92] focus-visible:outline-[#1B6FB3]',
      outline: 'border-2 border-[#0A4D8C] text-[#0A4D8C] hover:bg-[#0A4D8C] hover:text-white focus-visible:outline-[#0A4D8C]',
      ghost: 'text-[#0A4D8C] hover:bg-[#F5F7FA] focus-visible:outline-[#0A4D8C]',
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
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
