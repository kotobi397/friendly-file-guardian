import React, { useState } from 'react';
import { SmilePlus } from '@/components/icons/kotobi-lucide';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { KOTOBI_REACTIONS } from '@/hooks/useUpdateReactions';
import { ReactionIcon, KOTOBI_REACTION_ICONS } from './KotobiReactionIcons';

interface UpdateReactionsProps {
  updateId: string;
  counts: Record<string, number>;
  mine: Set<string> | undefined;
  onToggle: (updateId: string, emoji: string) => Promise<{ needsAuth: boolean }>;
}

const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

const UpdateReactions: React.FC<UpdateReactionsProps> = ({ updateId, counts, mine, onToggle }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleToggle = async (emoji: string) => {
    const res = await onToggle(updateId, emoji);
    if (res.needsAuth) {
      toast.error('سجّل الدخول للتفاعل مع التحديثات');
    }
    setPickerOpen(false);
  };

  const active = Object.entries(counts || {})
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" dir="rtl">
      {active.filter(([emoji]) => KOTOBI_REACTION_ICONS[emoji]).map(([emoji, count]) => {
        const isMine = mine?.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleToggle(emoji)}
            className={cn(
              'flex items-center gap-1 rounded-xl border-2 px-2 py-1 text-[11px] font-extrabold transition-transform active:scale-95',
              'border-clash-gold-deep/70 bg-clash-deep shadow-[0_2px_0_hsl(var(--clash-panel-deep))]',
              isMine ? '!text-clash-gold ring-2 ring-clash-gold/70' : '!text-clash-foreground/90'
            )}
            aria-label={`تفاعل ${emoji}`}
          >
            <span>+{formatCount(count)}</span>
            <span className="h-4 w-4"><ReactionIcon id={emoji} /></span>
          </button>
        );
      })}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-xl border-2 border-clash-gold-deep/70 bg-clash-gold shadow-[0_2px_0_hsl(var(--clash-panel-deep))] transition-transform active:scale-95"
            aria-label="أضف تفاعلاً"
          >
            <SmilePlus className="h-4 w-4 text-clash-bubble-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-auto max-w-[17rem] rounded-2xl border-[3px] border-clash-gold-deep bg-clash-panel p-2"
        >
          <p className="mb-1.5 text-center text-[10px] font-extrabold !text-clash-gold">اختر تفاعلك</p>
          <div className="grid grid-cols-5 gap-1.5" dir="rtl">
            {KOTOBI_REACTIONS.map(({ emoji, label }) => (
              <button
                key={emoji}
                type="button"
                title={label}
                onClick={() => handleToggle(emoji)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border-2 text-lg transition-transform hover:scale-110 active:scale-95',
                  mine?.has(emoji)
                    ? 'border-clash-gold bg-clash-gold/25'
                    : 'border-clash-gold-deep/60 bg-clash-deep'
                )}
              >
                <span className="h-6 w-6"><ReactionIcon id={emoji} /></span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default UpdateReactions;
