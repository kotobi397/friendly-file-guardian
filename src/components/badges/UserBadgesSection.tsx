import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserBadges } from '@/hooks/useUserBadges';
import { getBadgeMeta, RARITY_LABEL, RARITY_STYLE } from './KotobiBadge';
import { BADGE_REGISTRY } from './KotobiBadge';
import { cn } from '@/lib/utils';

interface Props {
  userId?: string | null;
  /** هل هذه صفحة صاحب الحساب؟ لعرض دعوة الشراء */
  isOwner?: boolean;
  title?: string;
  className?: string;
}

/** قسم «الشارات الحصرية» — يظهر في صفحة المستخدم وصفحة المؤلف */
export const UserBadgesSection: React.FC<Props> = ({
  userId,
  isOwner = false,
  title = 'الشارات الحصرية',
  className,
}) => {
  const { data: badges, isLoading } = useUserBadges(userId);

  if (!userId) return null;
  if (isLoading) return null;
  const owned = badges ?? [];

  if (owned.length === 0 && !isOwner) return null;

  return (
    <Card className={cn('overflow-hidden border-border/50', className)} dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="inline-flex">
            {BADGE_REGISTRY.badge_vip.Icon({ size: 22, title: 'الشارات الحصرية' })}
          </span>
          {title}
          {owned.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({owned.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {owned.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              لا تملك أي شارة بعد — اشترِ شارتك الحصرية من المتجر لتظهر بجانب اسمك.
            </p>
            <Button asChild size="sm">
              <Link to="/shop">تسوّق الشارات</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {owned.map((b) => {
              const meta = getBadgeMeta(b.preview_value) ?? getBadgeMeta(b.code);
              return (
                <div
                  key={b.item_id}
                  className={cn(
                    'relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-transform hover:-translate-y-0.5',
                    meta ? RARITY_STYLE[meta.rarity] : 'border-border bg-muted/30'
                  )}
                >
                  {b.is_selected && (
                    <span className="absolute top-1.5 start-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                      معروضة
                    </span>
                  )}
                  {meta ? (
                    <meta.Icon size={54} title={meta.label} />
                  ) : (
                    <span className="text-4xl">{b.preview_value}</span>
                  )}
                  <span className="text-sm font-bold text-foreground leading-tight">
                    {meta?.label ?? b.title_ar}
                  </span>
                  <span className="text-[11px] font-medium">
                    {meta ? RARITY_LABEL[meta.rarity] : 'شارة'}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                    {meta?.description ?? b.description_ar}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserBadgesSection;
