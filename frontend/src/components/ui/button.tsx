import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full',
          {
            'bg-primary text-white hover:bg-primary/90 hover:shadow-glow-primary':
              variant === 'primary',
            'bg-transparent text-text-secondary hover:text-white hover:bg-white/5':
              variant === 'ghost',
            'border border-border-subtle text-text-secondary hover:border-primary/40 hover:text-white':
              variant === 'outline',
            'gradient-button text-white':
              variant === 'gradient',
          },
          {
            'text-sm px-4 py-2':   size === 'sm',
            'text-sm px-6 py-2.5': size === 'md',
            'text-base px-8 py-3': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
