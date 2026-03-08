import { Badge } from '@/components/ui/badge';

interface TierBadgeProps {
  tier: 'FREE' | 'PRO' | 'PREMIUM';
  showUpgrade?: boolean;
}

const TIER_LABELS = {
  FREE:    { label: 'THE SEEKER',    variant: 'free'    as const },
  PRO:     { label: 'THE NAVIGATOR', variant: 'pro'     as const },
  PREMIUM: { label: 'THE ORACLE',    variant: 'premium' as const },
};

export function TierBadge({ tier, showUpgrade }: TierBadgeProps) {
  const { label, variant } = TIER_LABELS[tier];
  return (
    <div className="flex flex-col gap-1.5">
      <Badge variant={variant}>{label}</Badge>
      {showUpgrade && tier !== 'PREMIUM' && (
        <a href="/pricing" className="text-xs text-primary hover:text-primary/80 transition-colors">
          Upgrade plan →
        </a>
      )}
    </div>
  );
}
