import React, { useCallback, useEffect, useRef, useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface KotobiFollowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isFollowing: boolean;
  loading?: boolean;
  hideText?: boolean;
  onPress: () => void;
}

/**
 * زر متابعة/إلغاء متابعة بأنميشن خاص بكتبي.
 * كل الحركات CSS على transform/opacity فقط (GPU) — بلا لاغ.
 */
const KotobiFollowButton = forwardRef<HTMLButtonElement, KotobiFollowButtonProps>(
  ({ isFollowing, loading = false, hideText = false, onPress, className, ...rest }, ref) => {
    const [burst, setBurst] = useState<'in' | 'out' | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => () => clearTimeout(timer.current), []);

    const handleClick = useCallback(() => {
      setBurst(isFollowing ? 'out' : 'in');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setBurst(null), 700);
      onPress();
    }, [isFollowing, onPress]);

    const label = isFollowing ? 'إلغاء المتابعة' : 'متابعة';

    return (
      <button
        type="button"
        ref={ref}
        onClick={handleClick}
        disabled={loading}
        title={hideText ? label : undefined}
        aria-label={label}
        aria-pressed={isFollowing}
        className={cn(
          'kotobi-follow-btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-cairo text-sm h-9 px-4 border whitespace-nowrap disabled:opacity-80',
          isFollowing
            ? 'is-following bg-primary/12 text-primary border-primary/40'
            : 'bg-muted text-foreground border-border hover:bg-muted/70',
          hideText && 'px-3',
          loading && 'is-loading',
          burst === 'in' && 'is-bursting is-in',
          burst === 'out' && 'is-bursting is-out',
          className,
        )}
        {...rest}
      >
        <span className="kotobi-follow-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <circle className="kotobi-follow-head" cx="10" cy="8" r="3.4" />
            <path className="kotobi-follow-body" d="M4 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
            <path className="kotobi-follow-plus" d="M18.5 6.2v5m2.5-2.5h-5" />
            <path className="kotobi-follow-check" d="M17 9.4l1.8 1.8 3.1-3.4" />
          </svg>
        </span>
        {!hideText && <span className="kotobi-follow-label">{label}</span>}
        <span className="kotobi-follow-ring" aria-hidden="true" />
        <span className="kotobi-follow-sparks" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </span>
      </button>
    );
  },
);

KotobiFollowButton.displayName = 'KotobiFollowButton';

export default KotobiFollowButton;
