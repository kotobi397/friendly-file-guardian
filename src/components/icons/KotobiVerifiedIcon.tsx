import React, { useId } from 'react';

interface KotobiVerifiedIconProps {
  className?: string;
  size?: number;
  title?: string;
}

/**
 * شارة التوثيق الخاصة بموقع كتبي
 * ختم نجمي متموج بتدرج أزرق + كتاب مفتوح وعلامة صح
 */
export const KotobiVerifiedIcon: React.FC<KotobiVerifiedIconProps> = ({
  className = '',
  size = 20,
  title = 'حساب موثّق في كتبي',
}) => {
  const uid = useId().replace(/:/g, '');
  const grad = `kvGrad-${uid}`;
  const gradInner = `kvInner-${uid}`;
  const shine = `kvShine-${uid}`;

  // ختم بـ 12 فصًا (scalloped seal)
  const lobes = 12;
  const rOuter = 46;
  const rInner = 39;
  let d = '';
  for (let i = 0; i < lobes; i++) {
    const a1 = ((i * 2 - 0.5) * Math.PI) / lobes;
    const a2 = ((i * 2 + 0.5) * Math.PI) / lobes;
    const a3 = ((i * 2 + 1.5) * Math.PI) / lobes;
    const p = (r: number, a: number) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
    if (i === 0) d += `M ${p(rInner, a1)}`;
    d += ` Q ${p(rOuter + 4, (a1 + a2) / 2)} ${p(rInner, a2)}`;
    d += ` L ${p(rInner, a3)}`;
  }
  d += ' Z';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60d0ff" />
          <stop offset="55%" stopColor="#2f8ef5" />
          <stop offset="100%" stopColor="#1445c4" />
        </linearGradient>
        <linearGradient id={gradInner} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* الختم النجمي */}
      <path d={d} fill={`url(#${grad})`} />
      {/* لمعة علوية */}
      <path d={d} fill={`url(#${gradInner})`} />
      {/* حلقة داخلية */}
      <circle cx="50" cy="50" r="33" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2.5" />

      {/* كتاب مفتوح */}
      <g fill="none" opacity="0.4" stroke={`url(#${shine})`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 38.5c-3.6-3-8.2-4.4-13.5-4.4H29v25.2h7.5c5.3 0 9.9 1.4 13.5 4.4" />
        <path d="M50 38.5c3.6-3 8.2-4.4 13.5-4.4H71v25.2h-7.5c-5.3 0-9.9 1.4-13.5 4.4" />
        <path d="M50 38.5v25.2" strokeWidth="3" />
      </g>

      {/* علامة الصح */}
      <path
        d="M39.5 52.5 L47 60 L62.5 43"
        fill="none"
        stroke="#ffffff"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M39.5 52.5 L47 60 L62.5 43"
        fill="none"
        stroke="#1445c4"
        strokeOpacity="0.25"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default KotobiVerifiedIcon;
