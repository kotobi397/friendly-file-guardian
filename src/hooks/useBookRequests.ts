import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface BookRequestProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

export interface BookRequest {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  language: string;
  reason: string | null;
  status: string;
  admin_note: string | null;
  votes_count: number;
  created_at: string;
  profile?: BookRequestProfile;
}

export type BookRequestsSort = 'top' | 'new' | 'fulfilled';

export interface NewBookRequestInput {
  title: string;
  author: string;
  language: string;
  reason: string;
}

export const useBookRequests = (sort: BookRequestsSort = 'top') => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from('book_requests').select('*').limit(200);

      if (sort === 'fulfilled') {
        query = query.eq('status', 'fulfilled').order('updated_at', { ascending: false });
      } else if (sort === 'new') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query
          .order('votes_count', { ascending: false })
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as BookRequest[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];

      let profilesMap = new Map<string, BookRequestProfile>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        (profiles || []).forEach((p: any) => profilesMap.set(p.id, p));
      }

      setRequests(rows.map((r) => ({ ...r, profile: profilesMap.get(r.user_id) })));
    } catch (err) {
      console.error('خطأ في جلب طلبات الكتب:', err);
      toast.error('تعذّر تحميل طلبات الكتب');
    } finally {
      setLoading(false);
    }
  }, [sort]);

  const fetchMyVotes = useCallback(async () => {
    if (!user) {
      setMyVotes(new Set());
      return;
    }
    const { data } = await supabase
      .from('book_request_votes')
      .select('request_id')
      .eq('user_id', user.id);
    setMyVotes(new Set((data || []).map((v: any) => v.request_id)));
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchMyVotes();
  }, [fetchMyVotes]);

  const createRequest = useCallback(
    async (input: NewBookRequestInput) => {
      if (!user) {
        toast.error('يجب تسجيل الدخول لإضافة طلب');
        return false;
      }
      const title = input.title.trim();
      if (title.length < 2) {
        toast.error('اكتب عنوان الكتاب');
        return false;
      }
      try {
        setSubmitting(true);
        const { data, error } = await supabase
          .from('book_requests')
          .insert({
            user_id: user.id,
            title: title.slice(0, 200),
            author: input.author.trim().slice(0, 150) || null,
            language: input.language || 'العربية',
            reason: input.reason.trim().slice(0, 600) || null,
          })
          .select('id')
          .single();

        if (error) throw error;

        // صوت تلقائي لصاحب الطلب
        if (data?.id) {
          await supabase
            .from('book_request_votes')
            .insert({ request_id: data.id, user_id: user.id });
        }

        toast.success('تم إرسال طلبك 📌 شكراً لك!');
        await Promise.all([fetchRequests(), fetchMyVotes()]);
        return true;
      } catch (err: any) {
        console.error('خطأ في إنشاء الطلب:', err);
        toast.error(err?.message?.includes('الحد الأقصى')
          ? 'وصلت للحد الأقصى: 5 طلبات في اليوم'
          : 'تعذّر إرسال الطلب');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [user, fetchRequests, fetchMyVotes]
  );

  const toggleVote = useCallback(
    async (requestId: string) => {
      if (!user) {
        toast.error('سجّل الدخول للتصويت');
        return;
      }
      const hasVoted = myVotes.has(requestId);
      setVotingId(requestId);

      // تحديث متفائل
      setMyVotes((prev) => {
        const next = new Set(prev);
        hasVoted ? next.delete(requestId) : next.add(requestId);
        return next;
      });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, votes_count: Math.max(0, r.votes_count + (hasVoted ? -1 : 1)) }
            : r
        )
      );

      try {
        if (hasVoted) {
          const { error } = await supabase
            .from('book_request_votes')
            .delete()
            .eq('request_id', requestId)
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('book_request_votes')
            .insert({ request_id: requestId, user_id: user.id });
          if (error) throw error;
        }
      } catch (err) {
        console.error('خطأ في التصويت:', err);
        toast.error('تعذّر تسجيل التصويت');
        await Promise.all([fetchRequests(), fetchMyVotes()]);
      } finally {
        setVotingId(null);
      }
    },
    [user, myVotes, fetchRequests, fetchMyVotes]
  );

  const deleteRequest = useCallback(
    async (requestId: string) => {
      if (!user) return;
      const { error } = await supabase.from('book_requests').delete().eq('id', requestId);
      if (error) {
        toast.error('تعذّر حذف الطلب');
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success('تم حذف الطلب');
    },
    [user]
  );

  return {
    requests,
    myVotes,
    loading,
    submitting,
    votingId,
    createRequest,
    toggleVote,
    deleteRequest,
    refetch: fetchRequests,
  };
};
