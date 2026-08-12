import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface SiteUpdate {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  created_at: string;
  is_active: boolean;
}

const CACHE_KEY = 'site_updates_cache_v1';
const FETCHED_KEY = 'site_updates_fetched_v1';
const UNREAD_KEY = 'site_updates_has_unread_v1';
const LOCAL_DISMISS_KEY = 'site_updates_dismissed_v1';

const loadCache = (): SiteUpdate[] => {
  try {
    const c = sessionStorage.getItem(CACHE_KEY);
    return c ? JSON.parse(c) : [];
  } catch { return []; }
};

export const useSiteUpdates = () => {
  const initial = typeof window !== 'undefined' ? loadCache() : [];
  const wasFetched = typeof window !== 'undefined' && sessionStorage.getItem(FETCHED_KEY) === '1';
  const [updates, setUpdates] = useState<SiteUpdate[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState<boolean>(
    typeof window !== 'undefined' ? sessionStorage.getItem(UNREAD_KEY) === '1' : false
  );
  const { user } = useAuth();

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('site_updates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      let list = data || [];

      // استبعاد التحديثات التي تخطاها المستخدم
      if (user) {
        const { data: dismissed } = await supabase
          .from('site_update_dismissals')
          .select('update_id')
          .eq('user_id', user.id);
        const dismissedIds = new Set((dismissed || []).map(d => d.update_id));
        list = list.filter(u => !dismissedIds.has(u.id));
      } else {
        const localJson = localStorage.getItem(LOCAL_DISMISS_KEY);
        const dismissedIds: string[] = localJson ? JSON.parse(localJson) : [];
        list = list.filter(u => !dismissedIds.includes(u.id));
      }

      setUpdates(list);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
        sessionStorage.setItem(FETCHED_KEY, '1');
      } catch {}

      if (user && list.length > 0) {
        const { data: readData, error: readError } = await supabase
          .from('site_update_reads')
          .select('update_id')
          .eq('user_id', user.id);

        if (!readError) {
          const readIds = new Set((readData || []).map(r => r.update_id));
          const hasUnreadUpdate = list.some(update => !readIds.has(update.id));
          setHasUnread(hasUnreadUpdate);
          try { sessionStorage.setItem(UNREAD_KEY, hasUnreadUpdate ? '1' : '0'); } catch {}
        }
      } else if (!user && list.length > 0) {
        const readIdsJson = localStorage.getItem('site_updates_read');
        const readIds = readIdsJson ? new Set(JSON.parse(readIdsJson)) : new Set();
        const hasUnreadUpdate = list.some(update => !readIds.has(update.id));
        setHasUnread(hasUnreadUpdate);
        try { sessionStorage.setItem(UNREAD_KEY, hasUnreadUpdate ? '1' : '0'); } catch {}
      } else {
        setHasUnread(false);
        try { sessionStorage.setItem(UNREAD_KEY, '0'); } catch {}
      }
    } catch (err) {
      console.error('Error fetching site updates:', err);
      setError('فشل في جلب التحديثات');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const ensureFetched = useCallback(async () => {
    const alreadyFetched = sessionStorage.getItem(FETCHED_KEY) === '1';
    if (!alreadyFetched) await fetchUpdates();
  }, [fetchUpdates]);

  const markAsRead = useCallback(async (updateIds: string[]) => {
    if (updateIds.length === 0) return;

    if (user) {
      const inserts = updateIds.map(update_id => ({ user_id: user.id, update_id }));
      try {
        await supabase.from('site_update_reads').upsert(inserts, {
          onConflict: 'user_id,update_id',
        });
      } catch (error) {
        console.error('Error marking updates as read:', error);
      }
    } else {
      const readIdsJson = localStorage.getItem('site_updates_read');
      const readIds = readIdsJson ? new Set(JSON.parse(readIdsJson)) : new Set();
      updateIds.forEach(id => readIds.add(id));
      localStorage.setItem('site_updates_read', JSON.stringify([...readIds]));
    }

    setHasUnread(false);
    try { sessionStorage.setItem(UNREAD_KEY, '0'); } catch {}
  }, [user]);

  const dismissUpdate = useCallback(async (updateId: string) => {
    setUpdates(prev => prev.filter(u => u.id !== updateId));
    try {
      const cached = loadCache().filter(u => u.id !== updateId);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {}

    if (user) {
      const { error: dismissError } = await supabase
        .from('site_update_dismissals')
        .upsert({ user_id: user.id, update_id: updateId }, { onConflict: 'user_id,update_id' });
      if (dismissError) console.error('Error dismissing update:', dismissError);
    } else {
      try {
        const localJson = localStorage.getItem(LOCAL_DISMISS_KEY);
        const ids: string[] = localJson ? JSON.parse(localJson) : [];
        if (!ids.includes(updateId)) ids.push(updateId);
        localStorage.setItem(LOCAL_DISMISS_KEY, JSON.stringify(ids));
      } catch {}
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    const updateIds = updates.map(u => u.id);
    await markAsRead(updateIds);
  }, [updates, markAsRead]);

  // لا نجلب تلقائياً عند تحميل الصفحة. يتم الجلب فقط عند فتح القائمة لأول مرة في الجلسة.
  return {
    updates,
    loading,
    error,
    hasUnread,
    refetch: fetchUpdates,
    ensureFetched,
    markAsRead,
    markAllAsRead,
    dismissUpdate,
  };
};
