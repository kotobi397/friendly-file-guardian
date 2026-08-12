import React from 'react';
import {
  BookwormBadge,
  CriticBadge,
  PoetBadge,
  ExplorerBadge,
  PhilosopherBadge,
  ScholarBadge,
  VipBadge,
  LegendBadge,
  type BadgeRarity,
} from './KotobiBadgeIcons';

export interface BadgeMeta {
  code: string;
  label: string;
  description: string;
  rarity: BadgeRarity;
  Icon: React.FC<{ size?: number; className?: string; title?: string }>;
}

export const RARITY_LABEL: Record<BadgeRarity, string> = {
  common: 'عادية',
  rare: 'نادرة',
  epic: 'ملحمية',
  legendary: 'أسطورية',
};

export const RARITY_STYLE: Record<BadgeRarity, string> = {
  common: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
  rare: 'border-sky-500/40 bg-sky-500/5 text-sky-600 dark:text-sky-400',
  epic: 'border-violet-500/40 bg-violet-500/5 text-violet-600 dark:text-violet-400',
  legendary: 'border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

export const BADGE_REGISTRY: Record<string, BadgeMeta> = {
  badge_bookworm: {
    code: 'badge_bookworm',
    label: 'دودة كتب',
    description: 'درع كتبي لمن لا يتوقف عن القراءة',
    rarity: 'common',
    Icon: BookwormBadge,
  },
  badge_critic: {
    code: 'badge_critic',
    label: 'ناقد أدبي',
    description: 'ميزان العدل لأصحاب المراجعات القوية',
    rarity: 'rare',
    Icon: CriticBadge,
  },
  badge_poet: {
    code: 'badge_poet',
    label: 'شاعر كتبي',
    description: 'ريشة الكلمة لعشاق الاقتباسات والشعر',
    rarity: 'rare',
    Icon: PoetBadge,
  },
  badge_explorer: {
    code: 'badge_explorer',
    label: 'مستكشف المكتبات',
    description: 'عدسة الباحث عن الكنوز الورقية',
    rarity: 'rare',
    Icon: ExplorerBadge,
  },
  badge_philosopher: {
    code: 'badge_philosopher',
    label: 'فيلسوف الموقع',
    description: 'عقل ملحمي لكثير السؤال والتأمل',
    rarity: 'epic',
    Icon: PhilosopherBadge,
  },
  badge_scholar: {
    code: 'badge_scholar',
    label: 'عالِم النصوص',
    description: 'قبعة المعرفة لحُفّاظ النصوص',
    rarity: 'epic',
    Icon: ScholarBadge,
  },
  badge_vip: {
    code: 'badge_vip',
    label: 'قارئ VIP',
    description: 'تاج القارئ المميّز في مكتبة كتبي',
    rarity: 'legendary',
    Icon: VipBadge,
  },
  badge_legend: {
    code: 'badge_legend',
    label: 'أسطورة كتبي',
    description: 'أعلى شارة في المكتبة — للأساطير فقط',
    rarity: 'legendary',
    Icon: LegendBadge,
  },
};

export const getBadgeMeta = (value?: string | null): BadgeMeta | null =>
  value ? BADGE_REGISTRY[value] ?? null : null;

interface KotobiBadgeProps {
  /** كود الشارة (badge_vip...) أو قيمة قديمة (إيموجي) */
  value?: string | null;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

/** يعرض شارة كتبي الحصرية، مع دعم القيم القديمة (إيموجي) */
export const KotobiBadge: React.FC<KotobiBadgeProps> = ({
  value,
  size = 20,
  className = '',
  showTooltip = true,
}) => {
  if (!value) return null;
  const meta = getBadgeMeta(value);
  if (!meta) {
    return (
      <span className={className} style={{ fontSize: size }} title="شارة">
        {value}
      </span>
    );
  }
  const { Icon, label } = meta;
  return (
    <Icon
      size={size}
      className={`inline-block shrink-0 align-middle drop-shadow-sm ${className}`}
      title={showTooltip ? `${label} — شارة ${RARITY_LABEL[meta.rarity]}` : label}
    />
  );
};

export default KotobiBadge;
