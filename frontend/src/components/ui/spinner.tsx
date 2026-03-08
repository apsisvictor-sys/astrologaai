import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin',
        className
      )}
    />
  );
}
