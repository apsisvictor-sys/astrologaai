import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputOvalProps extends InputHTMLAttributes<HTMLInputElement> {
  onSend?: () => void;
  isLoading?: boolean;
}

export const InputOval = forwardRef<HTMLInputElement, InputOvalProps>(
  ({ className, onSend, isLoading, disabled, ...props }, ref) => {
    return (
      <div className={cn(
        'relative flex items-center w-full',
        'bg-white/5 border border-white/10 rounded-full',
        'focus-within:border-primary/50 focus-within:shadow-glow-primary',
        'transition-all duration-300',
        className
      )}>
        <input
          ref={ref}
          disabled={disabled}
          className="flex-1 bg-transparent px-6 py-4 text-text-primary placeholder-text-muted outline-none text-sm"
          {...props}
        />
        <button
          onClick={onSend}
          disabled={isLoading || disabled}
          className="mr-2 w-9 h-9 rounded-full gradient-button flex items-center justify-center shrink-0 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    );
  }
);

InputOval.displayName = 'InputOval';
