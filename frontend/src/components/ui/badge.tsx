import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'free' | 'pro' | 'premium' | 'locked';
}

export function Badge({ className, variant = 'free', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border',
        {
          'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10':             variant === 'free',
          'text-pro-gold border-pro-gold/40 bg-pro-gold/10':                     variant === 'pro',
          'text-premium-purple border-premium-purple/40 bg-premium-purple/10':   variant === 'premium',
          'text-text-muted border-white/10 bg-white/5':                          variant === 'locked',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
