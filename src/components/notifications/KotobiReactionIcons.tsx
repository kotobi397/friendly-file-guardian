import React from 'react';

/**
 * أيقونات تفاعل خاصة بموقع كتبي — مرسومة يدوياً (SVG) وليست إيموجي نظام.
 * كل أيقونة مستوحاة من عالم الكتب والقراءة بأسلوب لوحة Clash الذهبية.
 */

type IconProps = { className?: string };

const base = 'block h-full w-full';

export const IconOpenBook: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path d="M4 7.5c4-1.8 7.5-1.6 11 .7v17c-3.5-2.3-7-2.5-11-.7z" fill="#D6E6F5" stroke="#1E3E5E" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M28 7.5c-4-1.8-7.5-1.6-11 .7v17c3.5-2.3 7-2.5 11-.7z" fill="#EAF3FB" stroke="#1E3E5E" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M16 8.2v17" stroke="#1E3E5E" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M7 12h5M7 15.5h5M20 12h5M20 15.5h5" stroke="#3A78B0" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const IconHeartBook: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <rect x="6" y="5" width="20" height="22" rx="3" fill="#D6E6F5" stroke="#1E3E5E" strokeWidth="1.6" />
    <rect x="6" y="5" width="5" height="22" rx="2" fill="#3A78B0" stroke="#1E3E5E" strokeWidth="1.4" />
    <path d="M19 21c-3.2-2.1-5-3.7-5-5.7 0-1.6 1.2-2.6 2.5-2.6 1 0 1.9.5 2.5 1.4.6-.9 1.5-1.4 2.5-1.4 1.3 0 2.5 1 2.5 2.6 0 2-1.8 3.6-5 5.7z" fill="#E04B4B" stroke="#7A1E1E" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

export const IconInkFlame: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path d="M16 3c3.5 4.6 8 7.4 8 13a8 8 0 1 1-16 0c0-3.4 1.7-5.5 3.4-7.6.7 1.3 1.6 2.2 2.6 2.6C13.4 8.5 14.4 5.7 16 3z" fill="#F2913A" stroke="#7A3A0E" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M16 14c1.9 2.2 3.4 3.4 3.4 5.6a3.4 3.4 0 1 1-6.8 0c0-2 1.3-3.3 3.4-5.6z" fill="#FFE08A" stroke="#B45F14" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

export const IconQuill: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path d="M26 5c-9 .5-15 5-16.5 12.5L7 24l6.4-2.6C21 19.6 25.4 13.8 26 5z" fill="#CFE2F2" stroke="#1E3E5E" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M22 9c-4.5 2.2-8.2 5.8-10.6 10.6" stroke="#3A78B0" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M8.5 22.5 5 27" stroke="#1E3E5E" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconLantern: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path d="M16 3v3" stroke="#1E3E5E" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M10 9h12l-2 12H12z" fill="#9EC9EA" stroke="#1E3E5E" strokeWidth="1.6" strokeLinejoin="round" />
    <rect x="8.5" y="6.5" width="15" height="3" rx="1.4" fill="#3A78B0" stroke="#1E3E5E" strokeWidth="1.4" />
    <rect x="11" y="21" width="10" height="3" rx="1.4" fill="#3A78B0" stroke="#1E3E5E" strokeWidth="1.4" />
    <path d="M16 11.5c1.6 1.8 2.6 2.9 2.6 4.4a2.6 2.6 0 1 1-5.2 0c0-1.5 1-2.6 2.6-4.4z" fill="#FFF3C4" stroke="#B45F14" strokeWidth="1.1" />
    <path d="M16 24v4" stroke="#1E3E5E" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const IconTeaCup: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path d="M6 12h16v7a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z" fill="#D6E6F5" stroke="#1E3E5E" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M22 14h2.5a3.5 3.5 0 0 1 0 7H22" fill="none" stroke="#1E3E5E" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M6 18h16" stroke="#3A78B0" strokeWidth="1.3" />
    <path d="M11 8c1-1.2 1-2.3 0-3.5M15 8c1-1.2 1-2.3 0-3.5M19 8c1-1.2 1-2.3 0-3.5" stroke="#3A78B0" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

export const IconBrainIdea: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path d="M16 6c3.7 0 6.7 2.8 6.7 6.2 0 1.3-.4 2.4-1.1 3.4.5.8.8 1.7.8 2.7 0 3-2.6 5.4-5.8 5.4H16z" fill="#EBB7C0" stroke="#7A3A4A" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M16 6c-3.7 0-6.7 2.8-6.7 6.2 0 1.3.4 2.4 1.1 3.4-.5.8-.8 1.7-.8 2.7 0 3 2.6 5.4 5.8 5.4H16z" fill="#F6D3D9" stroke="#7A3A4A" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M13 11c1.4-.3 2.2.4 2.4 1.6M19 11c-1.4-.3-2.2.4-2.4 1.6M13.5 17.5c1-.7 1.9-.5 2.5.3M18.5 17.5c-1-.7-1.9-.5-2.5.3" stroke="#7A3A4A" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M16 23.6V27" stroke="#7A3A4A" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconMedal: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path d="m11 3 4 8M21 3l-4 8" stroke="#3A78B0" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="16" cy="19" r="8" fill="#9EC9EA" stroke="#1E3E5E" strokeWidth="1.7" />
    <circle cx="16" cy="19" r="4.6" fill="#E6F2FB" stroke="#3A78B0" strokeWidth="1.2" />
    <path d="m16 16 .9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" fill="#3A78B0" />
  </svg>
);

export const IconStarInk: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path d="m16 4 3.3 7.4 8 .8-6 5.4 1.7 7.9L16 21.4 8.9 25.5l1.8-7.9-6-5.4 8-.8z" fill="#9EC9EA" stroke="#1E3E5E" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="m16 9.5 1.7 3.9 4.2.4-3.2 2.8.9 4.2-3.6-2.1-3.6 2.1.9-4.2-3.2-2.8 4.2-.4z" fill="#E6F2FB" />
  </svg>
);

export const IconHandsThanks: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className ?? base} aria-hidden>
    <path d="M15 27c-3.6 0-6.5-2.6-6.5-6V11c0-1 .8-1.8 1.7-1.8s1.8.8 1.8 1.8v4L15 4.8c.2-1 1-1.6 1.9-1.4.9.2 1.4 1 1.3 2L15 27z" fill="#D6E6F5" stroke="#1E3E5E" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M17 27c3.6 0 6.5-2.6 6.5-6V11c0-1-.8-1.8-1.7-1.8s-1.8.8-1.8 1.8v4L17 4.8c-.2-1-1-1.6-1.9-1.4-.9.2-1.4 1-1.3 2L17 27z" fill="#EAF3FB" stroke="#1E3E5E" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const KOTOBI_REACTION_ICONS: Record<string, React.FC<IconProps>> = {
  kotobi_book: IconOpenBook,
  kotobi_love: IconHeartBook,
  kotobi_fire: IconInkFlame,
  kotobi_quill: IconQuill,
  kotobi_lantern: IconLantern,
  kotobi_tea: IconTeaCup,
  kotobi_mind: IconBrainIdea,
  kotobi_medal: IconMedal,
  kotobi_star: IconStarInk,
  kotobi_thanks: IconHandsThanks,
};

export const ReactionIcon: React.FC<{ id: string; className?: string }> = ({ id, className }) => {
  const Cmp = KOTOBI_REACTION_ICONS[id];
  if (!Cmp) return null;
  return <Cmp className={className} />;
};
