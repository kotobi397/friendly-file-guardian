import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SaveBookButtonProps {
  saved: boolean;
  onToggle: () => void | Promise<void>;
  className?: string;
  labelSaved?: string;
  labelSave?: string;
  size?: 'sm' | 'lg';
}

/**
 * زر «حفظ» بأنميشن خاص بموقع كتبي.
 * الأنميشن كله CSS (transform/opacity فقط) لذا لا يستهلك الرام ولا يوقف المتصفح،
 * ويتوقف تلقائياً على الأجهزة الضعيفة أو مع تفضيل تقليل الحركة.
 */
const SaveBookButton: React.FC<SaveBookButtonProps> = ({
  saved,
  onToggle,
  className,
  labelSaved = 'محفوظ',
  labelSave = 'حفظ',
  size = 'sm',
}) => {
  const [burst, setBurst] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const handleClick = useCallback(() => {
    if (!saved) {
      setBurst(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setBurst(false), 700);
    }
    void onToggle();
  }, [saved, onToggle]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? labelSaved : labelSave}
      className={cn(
        'kotobi-save-btn relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl font-cairo font-bold border-0 shadow-sm hover:shadow-md',
        size === 'lg' ? 'h-12 px-5 text-base' : 'py-2 text-sm',
        saved
          ? 'bg-primary text-primary-foreground is-saved'
          : 'bg-muted text-foreground hover:bg-muted/80',
        burst && 'is-bursting',
        className,
      )}
    >
      <span className="kotobi-save-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v15.2L12 16.6 4.5 20.2V5A1.5 1.5 0 0 1 6 3.5Z" />
          <path className="kotobi-save-check" d="M8.6 9.9l2.5 2.4 4.3-4.4" />
        </svg>
      </span>
      <span className="kotobi-save-label">{saved ? labelSaved : labelSave}</span>
      <span className="kotobi-save-ring" aria-hidden="true" />
      <span className="kotobi-save-sparks" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </span>
    </button>
  );
};

export default SaveBookButton;
