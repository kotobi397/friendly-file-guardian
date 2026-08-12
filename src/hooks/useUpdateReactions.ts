import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface KotobiReaction {
  /** معرّف الأيقونة الخاصة بكتبي (وليس إيموجي نظام) */
  emoji: string;
  label: string;
}

/** ايموجيات كتبي الخاصة للتفاعل مع التحديثات */
export const KOTOBI_REACTIONS: KotobiReaction[] = [
  { emoji: 'kotobi_book', label: 'كتاب رائع' },
  { emoji: 'kotobi_love', label: 'أحببته' },
  { emoji: 'kotobi_fire', label: 'ملتهب' },
  { emoji: 'kotobi_quill', label: 'إبداع' },
  { emoji: 'kotobi_lantern', label: 'أنارني' },
  { emoji: 'kotobi_tea', label: 'قراءة ممتعة' },
  { emoji: 'kotobi_mind', label: 'أفادني' },
  { emoji: 'kotobi_medal', label: 'أحسنتم' },
  { emoji: 'kotobi_star', label: 'مميز' },
  { emoji: 'kotobi_thanks', label: 'شكراً' },
];

type CountsMap = Record<string, Record<string, number>>;
type MineMap = Record<string, Set<string>>;

export const useUpdateReactions = (updateIds: string[]) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<CountsMap>({});
  const [mine, setMine] = useState<MineMap>({});
  const key = updateIds.join(',');

  const fetchReactions = useCallback(async () => {
    if (updateIds.length === 0) return;
    const { data, error } = await supabase
      .from('site_update_reactions')
      .select('update_id, emoji, user_id')
      .in('update_id', updateIds);

    if (error || !data) return;

    const nextCounts: CountsMap = {};
    const nextMine: MineMap = {};
    for (const row of data) {
      nextCounts[row.update_id] = nextCounts[row.update_id] || {};
      nextCounts[row.update_id][row.emoji] = (nextCounts[row.update_id][row.emoji] || 0) + 1;
      if (user && row.user_id === user.id) {
        nextMine[row.update_id] = nextMine[row.update_id] || new Set();
        nextMine[row.update_id].add(row.emoji);
      }
    }
    setCounts(nextCounts);
    setMine(nextMine);
  }, [key, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const toggleReaction = useCallback(
    async (updateId: string, emoji: string) => {
      if (!user) return { needsAuth: true };
      const current = Array.from(mine[updateId] || []);
      const already = current.includes(emoji);

      // تحديث متفائل: تفاعل واحد فقط لكل مستخدم لكل تحديث
      setCounts(prev => {
        const forUpdate = { ...(prev[updateId] || {}) };
        // إزالة التفاعلات السابقة للمستخدم
        for (const prevEmoji of current) {
          const next = (forUpdate[prevEmoji] || 0) - 1;
          if (next <= 0) delete forUpdate[prevEmoji];
          else forUpdate[prevEmoji] = next;
        }
        if (!already) forUpdate[emoji] = (forUpdate[emoji] || 0) + 1;
        return { ...prev, [updateId]: forUpdate };
      });
      setMine(prev => ({
        ...prev,
        [updateId]: already ? new Set<string>() : new Set<string>([emoji]),
      }));

      // حذف أي تفاعل سابق للمستخدم على هذا التحديث
      if (current.length > 0) {
        await supabase
          .from('site_update_reactions')
          .delete()
          .eq('update_id', updateId)
          .eq('user_id', user.id);
      }

      if (!already) {
        await supabase
          .from('site_update_reactions')
          .insert({ update_id: updateId, user_id: user.id, emoji });
      }
      return { needsAuth: false };
    },
    [user, mine]
  );


  return { counts, mine, toggleReaction, refetch: fetchReactions };
};
