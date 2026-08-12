import React from 'react';

interface BookRequestIconProps {
  className?: string;
  style?: React.CSSProperties;
}

/** كتاب مفتوح مع علامة طلب (+) — بأسلوب أيقونات كتبي */
const BookRequestIcon: React.FC<BookRequestIconProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
    <path d="M12 5.4C10.3 4.1 8.2 3.5 5.8 3.5c-.9 0-1.7.1-2.5.2-.5.1-.8.5-.8 1v13c0 .6.6 1.1 1.2 1 .7-.1 1.4-.2 2.1-.2 2.1 0 3.9.5 5.4 1.5.5.3 1.1.3 1.6 0 .6-.4 1.2-.7 1.9-.9-.2-.5-.3-1.1-.4-1.7-1 .2-1.9.6-2.8 1.1V7.2C11 6.4 9.6 5.9 8 5.7" opacity=".25" />
    <path d="M11.25 6.8C9.7 5.6 7.8 5 5.6 5c-.7 0-1.4 0-2 .1-.4.1-.7.4-.7.9v12.2c0 .5.5.9 1 .8.6-.1 1.2-.1 1.8-.1 2 0 3.7.5 5.1 1.5.3.2.7.2 1 0 .6-.4 1.3-.7 2-.9a6.6 6.6 0 0 1-.6-1.7c-.6.2-1.2.4-1.7.7V6.8Z" />
    <path d="M21.1 6c0-.5-.3-.8-.7-.9-.6-.1-1.3-.1-2-.1-2 0-3.8.5-5.4 1.6v2.2A6.5 6.5 0 0 1 21.1 12V6Z" />
    <path d="M17.5 10.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm.9 4.1h1.7v1.8h-1.7v1.7h-1.8v-1.7H15v-1.8h1.6V13h1.8v1.6Z" />
  </svg>
);

export default BookRequestIcon;
