import React from 'react';

/**
 * أيقونات التصويت الخاصة بكتبي (إعجاب / عدم إعجاب) — مرسومة يدوياً بأسلوب لوحة Clash الذهبية،
 * وليست إيموجي نظام. مستوحاة من عالم الكتب: يد تحمل كتاباً مفتوحاً.
 */

type IconProps = { className?: string };

const base = 'block h-full w-full';

/** إعجاب: يد مرفوعة تحمل كتاباً */
export const IconBookThumbUp: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path
      d="M12.5 13.5c2.6-2 4-4.4 4.4-7.3.2-1.4 1.2-2.2 2.3-2 1.2.2 1.9 1.2 1.8 2.6l-.5 4.7h4.9c1.7 0 2.9 1.4 2.6 3l-1.6 8.2c-.3 1.6-1.6 2.7-3.2 2.7H12.5z"
      fill="#F2D9A8"
      stroke="#7A4A1E"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <rect x="3.5" y="13" width="9" height="14.5" rx="2.4" fill="#C9873A" stroke="#7A4A1E" strokeWidth="1.7" />
    <path d="M6 16.5h4M6 20h4" stroke="#FFF0CE" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M17 17h6M17 20.5h5" stroke="#C9873A" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/** عدم الإعجاب: يد مقلوبة مع كتاب مغلق */
export const IconBookThumbDown: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path
      d="M12.5 18.5c2.6 2 4 4.4 4.4 7.3.2 1.4 1.2 2.2 2.3 2 1.2-.2 1.9-1.2 1.8-2.6l-.5-4.7h4.9c1.7 0 2.9-1.4 2.6-3l-1.6-8.2C26.1 7.7 24.8 6.6 23.2 6.6H12.5z"
      fill="#EBD6C4"
      stroke="#7A3A1E"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <rect x="3.5" y="4.5" width="9" height="14.5" rx="2.4" fill="#A85B4A" stroke="#7A3A1E" strokeWidth="1.7" />
    <path d="M6 8h4M6 11.5h4" stroke="#FFF0CE" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M17 11h6M17 14.5h5" stroke="#A85B4A" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export default { IconBookThumbUp, IconBookThumbDown };
