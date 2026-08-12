import React, { useId } from 'react';

/**
 * شارات كتبي الحصرية — تصميم خاص بالموقع بروح أيقونات "كلاش أوف كلانز":
 * درع بحواف سميكة، تدرجات معدنية، بروز وبريق، وجوهرة/نجوم تحدد الندرة.
 * كل الشارات SVG خالص (بلا صور) لتكبير لانهائي وأداء عالٍ.
 */

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

interface CrestProps {
  size?: number;
  className?: string;
  title?: string;
  /** ألوان الدرع: [فاتح، أساسي، غامق] */
  palette: [string, string, string];
  /** لون الحد المعدني الخارجي */
  rim: [string, string];
  rarity: BadgeRarity;
  children?: React.ReactNode;
  /** لون الرمز الداخلي */
  emblem?: string;
}

const RARITY_STARS: Record<BadgeRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

const Star: React.FC<{ cx: number; cy: number; r: number; fill: string; stroke: string }> = ({
  cx,
  cy,
  r,
  fill,
  stroke,
}) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />;
};

/** قاعدة الدرع المشتركة لكل شارات كتبي */
export const KotobiCrest: React.FC<CrestProps> = ({
  size = 24,
  className = '',
  title,
  palette,
  rim,
  rarity,
  children,
}) => {
  // معرّف فريد لكل نسخة (يمنع تعارض التدرجات عند وجود عدة شارات في نفس الصفحة)
  const uid = useId().replace(/:/g, '') + '-' + palette.join('').replace(/#/g, '') + rarity;
  const gBody = `kb-body-${uid}`;
  const gRim = `kb-rim-${uid}`;
  const gGloss = `kb-gloss-${uid}`;
  const clip = `kb-clip-${uid}`;

  // درع بحواف ناعمة (100x100)
  const shield =
    'M50 5 C66 5 80 9 90 14 C90 44 88 66 76 80 C68 89 59 94 50 97 C41 94 32 89 24 80 C12 66 10 44 10 14 C20 9 34 5 50 5 Z';

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
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gBody} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="52%" stopColor={palette[1]} />
          <stop offset="100%" stopColor={palette[2]} />
        </linearGradient>
        <linearGradient id={gRim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={rim[0]} />
          <stop offset="50%" stopColor={rim[1]} />
          <stop offset="100%" stopColor={rim[0]} />
        </linearGradient>
        <linearGradient id={gGloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
        <clipPath id={clip}>
          <path d={shield} />
        </clipPath>
      </defs>

      {/* ظل خارجي */}
      <path d={shield} fill="#0b1020" opacity="0.35" transform="translate(0,3)" />
      {/* الحد المعدني */}
      <path d={shield} fill={`url(#${gRim})`} stroke="#1b2338" strokeWidth="3.5" strokeLinejoin="round" />
      {/* جسم الدرع */}
      <path
        d={shield}
        fill={`url(#${gBody})`}
        stroke="#1b2338"
        strokeWidth="2"
        transform="translate(50 50) scale(0.855) translate(-50 -50)"
      />
      {/* بريق زجاجي */}
      <g clipPath={`url(#${clip})`}>
        <path d={shield} fill={`url(#${gGloss})`} />
        <path d="M14 12 C34 6 66 6 86 12 C70 26 30 26 14 12 Z" fill="#ffffff" opacity="0.18" />
      </g>

      {/* مسامير معدنية */}
      {(RARITY_STARS[rarity] > 0
        ? [
            [17, 20],
            [83, 20],
          ]
        : [
            [17, 20],
            [83, 20],
            [50, 92],
          ]
      ).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={3.1} fill={rim[1]} stroke="#1b2338" strokeWidth="1.4" />
      ))}

      {/* الرمز الداخلي — مرفوع قليلاً ومصغّر ليبقى داخل الدرع بعيداً عن النجوم */}
      <g transform={`translate(50 ${RARITY_STARS[rarity] > 0 ? 44 : 47}) scale(0.88) translate(-50 -50)`}>
        {children}
      </g>

      {/* نجوم الندرة */}
      {Array.from({ length: RARITY_STARS[rarity] }).map((_, i, arr) => {
        const spread = 16;
        const cx = 50 + (i - (arr.length - 1) / 2) * spread;
        const cy = 91 - (arr.length > 1 && i === (arr.length - 1) / 2 ? 6 : 0);
        return <Star key={i} cx={cx} cy={cy} r={7.5} fill="#ffd45e" stroke="#7a4a08" />;
      })}
    </svg>
  );
};

type IconProps = { size?: number; className?: string; title?: string };
const E = '#fffdf5'; // لون الرمز

/* ============ دودة كتب ============ */
export const BookwormBadge: React.FC<IconProps> = (p) => (
  <KotobiCrest {...p} palette={['#7ee787', '#2ea043', '#146c2e']} rim={['#c9f7d0', '#4ad06a']} rarity="common">
    <path d="M27 36 L50 30 L73 36 L73 66 L50 60 L27 66 Z" fill={E} stroke="#0f3d1c" strokeWidth="3" strokeLinejoin="round" />
    <path d="M50 30 L50 60" stroke="#0f3d1c" strokeWidth="3" />
    <circle cx="66" cy="30" r="7.5" fill="#ffe36e" stroke="#0f3d1c" strokeWidth="2.6" />
    <circle cx="68.5" cy="28.5" r="1.8" fill="#0f3d1c" />
    <path d="M60 26 Q56 20 50 22" stroke="#0f3d1c" strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </KotobiCrest>
);

/* ============ ناقد أدبي ============ */
export const CriticBadge: React.FC<IconProps> = (p) => (
  <KotobiCrest {...p} palette={['#ffe9a8', '#e2a828', '#8f5f0b']} rim={['#fff6d6', '#f2c14e']} rarity="rare">
    <path d="M50 24 L50 66" stroke={E} strokeWidth="4.5" strokeLinecap="round" />
    <path d="M26 36 L74 36" stroke={E} strokeWidth="4.5" strokeLinecap="round" />
    <path d="M18 36 L34 36 L26 52 Z" fill={E} stroke="#6b430a" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M66 36 L82 36 L74 52 Z" fill={E} stroke="#6b430a" strokeWidth="2.4" strokeLinejoin="round" />
    <rect x="38" y="64" width="24" height="6" rx="3" fill={E} stroke="#6b430a" strokeWidth="2" />
    <circle cx="50" cy="22" r="5" fill="#fff" stroke="#6b430a" strokeWidth="2.4" />
  </KotobiCrest>
);

/* ============ شاعر كتبي ============ */
export const PoetBadge: React.FC<IconProps> = (p) => (
  <KotobiCrest {...p} palette={['#e9d5ff', '#8b5cf6', '#4c1d95']} rim={['#f4ecff', '#b794f6']} rarity="rare">
    <path
      d="M74 22 C56 26 38 42 30 62 L26 74 L38 70 C58 62 72 44 74 22 Z"
      fill={E}
      stroke="#3b1178"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M66 30 C52 40 42 52 34 68" stroke="#3b1178" strokeWidth="2.4" fill="none" />
    <path d="M24 76 L20 82" stroke={E} strokeWidth="4.5" strokeLinecap="round" />
  </KotobiCrest>
);

/* ============ مستكشف المكتبات ============ */
export const ExplorerBadge: React.FC<IconProps> = (p) => (
  <KotobiCrest {...p} palette={['#a5f3fc', '#0891b2', '#0e4f63']} rim={['#e0fbff', '#5fd8ef']} rarity="rare">
    <circle cx="45" cy="43" r="17" fill="none" stroke={E} strokeWidth="5" />
    <circle cx="45" cy="43" r="17" fill="#ffffff" opacity="0.18" />
    <path d="M57 55 L72 70" stroke={E} strokeWidth="7" strokeLinecap="round" />
    <path d="M38 46 L45 34 L52 46 L45 42 Z" fill={E} stroke="#083c4c" strokeWidth="2" strokeLinejoin="round" />
  </KotobiCrest>
);

/* ============ فيلسوف الموقع ============ */
export const PhilosopherBadge: React.FC<IconProps> = (p) => (
  <KotobiCrest {...p} palette={['#c7d2fe', '#4f46e5', '#26216b']} rim={['#eaefff', '#8ea2ff']} rarity="epic">
    <path
      d="M34 40 C34 30 42 24 50 24 C58 24 66 30 66 40 C72 44 72 54 66 58 L66 68 L36 68 L36 58 C30 54 30 44 34 40 Z"
      fill={E}
      stroke="#1c1856"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M50 26 L50 66 M42 34 Q52 42 42 50 M58 34 Q48 42 58 50" stroke="#1c1856" strokeWidth="2.4" fill="none" />
  </KotobiCrest>
);

/* ============ عالِم النصوص ============ */
export const ScholarBadge: React.FC<IconProps> = (p) => (
  <KotobiCrest {...p} palette={['#fed7aa', '#c2410c', '#6b2005']} rim={['#ffe9cf', '#f59e5b']} rarity="epic">
    <path d="M50 24 L82 38 L50 52 L18 38 Z" fill={E} stroke="#4a1704" strokeWidth="3" strokeLinejoin="round" />
    <path d="M30 44 L30 62 C36 68 64 68 70 62 L70 44" fill={E} stroke="#4a1704" strokeWidth="3" strokeLinejoin="round" />
    <path d="M74 42 L74 60" stroke="#ffe36e" strokeWidth="3.6" strokeLinecap="round" />
    <circle cx="74" cy="64" r="4.2" fill="#ffe36e" stroke="#4a1704" strokeWidth="2.2" />
  </KotobiCrest>
);

/* ============ قارئ VIP ============ */
export const VipBadge: React.FC<IconProps> = (p) => (
  <KotobiCrest {...p} palette={['#fff1b8', '#f5b40a', '#8a5504']} rim={['#fffaf0', '#ffd764']} rarity="legendary">
    <path
      d="M24 62 L20 30 L36 42 L50 22 L64 42 L80 30 L76 62 Z"
      fill={E}
      stroke="#6d4204"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <rect x="24" y="62" width="52" height="8" rx="4" fill={E} stroke="#6d4204" strokeWidth="2.6" />
    <circle cx="50" cy="40" r="4.4" fill="#ef4444" stroke="#6d4204" strokeWidth="2" />
    <circle cx="33" cy="48" r="3.2" fill="#38bdf8" stroke="#6d4204" strokeWidth="1.8" />
    <circle cx="67" cy="48" r="3.2" fill="#22c55e" stroke="#6d4204" strokeWidth="1.8" />
  </KotobiCrest>
);

/* ============ أسطورة كتبي ============ */
export const LegendBadge: React.FC<IconProps> = (p) => (
  <KotobiCrest {...p} palette={['#ffd0a1', '#ea580c', '#7a1d05']} rim={['#ffe9d0', '#ff9d4d']} rarity="legendary">
    <path
      d="M50 14 C56 25 66 27 66 38 C66 46 59 52 50 52 C41 52 34 46 34 38 C34 27 44 25 50 14 Z"
      fill="#ffe36e"
      stroke="#5b1704"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M50 27 C53 33 57 35 57 40 C57 44 54 47 50 47 C46 47 43 44 43 40 C43 35 47 33 50 27 Z" fill="#fff6d6" />
    <path d="M28 56 L50 50 L72 56 L72 68 L50 62 L28 68 Z" fill={E} stroke="#5b1704" strokeWidth="3" strokeLinejoin="round" />
    <path d="M50 50 L50 62" stroke="#5b1704" strokeWidth="2.6" />
  </KotobiCrest>
);
