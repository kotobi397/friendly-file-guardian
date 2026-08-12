import React, { useState } from 'react';
import { Megaphone, Calendar } from '@/components/icons/kotobi-lucide';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSiteUpdates } from '@/hooks/useSiteUpdates';
import { cn } from '@/lib/utils';
import kotobiTeamLogo from '@/assets/kotobi-team-logo.png';
import UpdateReactions from './UpdateReactions';
import { useUpdateReactions } from '@/hooks/useUpdateReactions';

interface SiteUpdatesDropdownProps {
  children: React.ReactNode;
}

const SiteUpdatesDropdown: React.FC<SiteUpdatesDropdownProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { updates, loading, hasUnread, markAllAsRead, ensureFetched } = useSiteUpdates();
  const { counts, mine, toggleReaction } = useUpdateReactions(updates.map(u => u.id));

  const trigger = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{ className?: string; children?: React.ReactNode }>, {
        className: cn((children.props as { className?: string }).className, 'relative'),
        children: (
          <>
            {(children.props as { children?: React.ReactNode }).children}
            {hasUnread && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-destructive animate-pulse" />
            )}
          </>
        ),
      })
    : (
      <button type="button" className="relative bg-transparent border-0 p-0 cursor-pointer">
        {children}
        {hasUnread && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-destructive animate-pulse" />
        )}
      </button>
    );

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open) {
      await ensureFetched();
      if (hasUnread) await markAllAsRead();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysOfWeek = [
      'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
    ];
    const monthsOfYear = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const dayName = daysOfWeek[date.getDay()];
    const monthName = monthsOfYear[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${dayName}، ${day} ${monthName} ${year} - ${hours}:${minutes}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>

      {/* لوحة التحديثات بأسلوب Clash */}
      <PopoverContent
        className="w-[calc(100vw-1rem)] max-w-[26rem] p-0 rounded-2xl border-[3px] border-clash-gold-deep bg-clash-panel shadow-2xl overflow-hidden"
        align="end"
        sideOffset={8}
        collisionPadding={8}
      >
        <div className="bg-clash-deep border-b-[3px] border-clash-gold-deep px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-clash-gold-deep bg-clash-gold shadow-inner">
                <Megaphone className="h-4 w-4 text-clash-bubble-foreground" />
              </span>
              <div className="text-right leading-tight">
                <p className="text-sm font-extrabold tracking-wide !text-clash-gold drop-shadow">تحديثات الموقع</p>
                <p className="text-[10px] !text-clash-foreground/70">{updates.length} تحديث</p>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[26rem] bg-clash-panel">
          {loading ? (
            <div className="p-4 space-y-3">
              <div className="h-16 animate-pulse rounded-2xl bg-clash-deep/60" />
              <div className="h-16 animate-pulse rounded-2xl bg-clash-deep/60" />
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {updates.length === 0 && (
                <div className="p-6 text-center text-sm text-clash-foreground/80">لا توجد تحديثات حالياً</div>
              )}

              {updates.map((update) => (
                <div key={update.id} className="text-right">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Avatar className="h-10 w-10 border-2 border-clash-gold-deep shadow">
                      <AvatarImage src={kotobiTeamLogo} alt="فريق كتبي" />
                      <AvatarFallback>ك</AvatarFallback>
                    </Avatar>
                    <div className="leading-tight">
                      <p className="text-xs font-extrabold !text-clash-gold">فريق كتبي</p>
                      <p className="text-[10px] !text-clash-foreground/60">📢 {update.title}</p>
                    </div>
                  </div>

                  <div className="relative rounded-2xl border-2 border-clash-gold-deep/60 bg-clash-bubble px-3.5 py-3 text-clash-bubble-foreground shadow-[0_3px_0_hsl(var(--clash-panel-deep))]">
                    <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed !text-clash-bubble-foreground" dir="rtl">
                      {update.message}
                    </p>
                    {(update as any).image_url && (
                      <img
                        src={(update as any).image_url}
                        alt={update.title}
                        loading="lazy"
                        className="mt-2 w-full rounded-xl border-2 border-clash-gold-deep/60"
                      />
                    )}
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-clash-bubble-muted">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(update.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <UpdateReactions
                      updateId={update.id}
                      counts={counts[update.id] || {}}
                      mine={mine[update.id]}
                      onToggle={toggleReaction}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>

    </Popover>
  );
};

export default SiteUpdatesDropdown;