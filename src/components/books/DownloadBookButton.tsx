import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface DownloadBookButtonProps {
  onDownload: () => void | Promise<void>;
  loading?: boolean;
  done?: boolean;
  className?: string;
  label?: string;
  labelLoading?: string;
  labelDone?: string;
}

const DownloadBookButton: React.FC<DownloadBookButtonProps> = ({
  onDownload,
  loading = false,
  done = false,
  className,
  label = 'تحميل',
  labelLoading = 'جاري التحميل',
  labelDone = 'تم التحميل',
}) => {
  const [burst, setBurst] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = useCallback(() => {
    setBurst(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBurst(false), 750);
    void onDownload();
  }, [onDownload]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={loading ? labelLoading : done ? labelDone : label}
      className={cn(
        'kotobi-dl-btn relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl font-cairo text-sm py-2 border-0 shadow-sm hover:shadow-md disabled:opacity-90',
        done ? 'bg-primary text-primary-foreground is-done' : 'bg-muted text-foreground hover:bg-muted/80',
        loading && 'is-loading',
        burst && 'is-bursting',
        className,
      )}
    >
      <span className="kotobi-dl-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path className="kotobi-dl-arrow" d="M12 3.5v10.5m0 0 3.6-3.6M12 14l-3.6-3.6" />
          <path className="kotobi-dl-tray" d="M4.5 16.5v2.2a1.3 1.3 0 0 0 1.3 1.3h12.4a1.3 1.3 0 0 0 1.3-1.3v-2.2" />
        </svg>
      </span>
      <span className="kotobi-dl-label">{loading ? labelLoading : done ? labelDone : label}</span>
      <span className="kotobi-dl-bar" aria-hidden="true" />
      <span className="kotobi-save-ring" aria-hidden="true" />
      <span className="kotobi-save-sparks" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </span>
    </button>
  );
};

export default DownloadBookButton;
