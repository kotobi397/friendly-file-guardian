import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OwnedBadge {
  item_id: string;
  code: string;
  title_ar: string;
  description_ar: string | null;
  preview_value: string | null;
  price_coins: number;
  sort_order: number;
  purchased_at: string;
  is_selected: boolean;
}

/** شارات المستخدم الحصرية (عامة — تظهر في صفحة المستخدم والمؤلف) */
export function useUserBadges(userId?: string | null) {
  return useQuery({
    queryKey: ['user-badges', userId],
    queryFn: async (): Promise<OwnedBadge[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('gam_get_user_badges', {
        _user_id: userId,
      });
      if (error) throw error;
      return (data ?? []) as OwnedBadge[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
