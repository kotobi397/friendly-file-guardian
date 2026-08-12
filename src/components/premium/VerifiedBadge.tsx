import KotobiVerifiedIcon from '@/components/icons/KotobiVerifiedIcon';
import { useIsVerified } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface Props {
  userId?: string | null;
  size?: number;
  className?: string;
}

export function VerifiedBadge({ userId, size = 16, className }: Props) {
  const verified = useIsVerified(userId);
  if (!verified) return null;
  return (
    <span
      title="حساب موثّق"
      aria-label="حساب موثّق"
      className={cn('inline-flex items-center align-middle', className)}
    >
      <KotobiVerifiedIcon size={size} />
    </span>
  );
}

export default VerifiedBadge;
