import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UploaderBookAnalytics {
  book_id: string;
  title: string;
  cover_image_url: string | null;
  slug: string | null;
  category: string | null;
  created_at: string;
  downloads: number;
  reads_online: number;
  card_clicks: number;
  detail_views: number;
  views: number;
  reviews_count: number;
  average_rating: number;
  likes_count: number;
  completions: number;
  avg_progress: number;
}

export interface UploaderOverallStats {
  total_books: number;
  downloads: number;
  reads_online: number;
  card_clicks: number;
  detail_views: number;
  views: number;
  reviews_count: number;
  average_rating: number;
  likes_count: number;
  completions: number;
  avg_progress: number;
}

export interface UploaderCountry {
  country_code: string;
  country_name: string;
  events: number;
  reads_online: number;
  downloads: number;
}

export interface UploaderTimelinePoint {
  day: string;
  card_clicks: number;
  detail_views: number;
  reads_online: number;
  downloads: number;
}

const toNumber = (value: unknown) => Number(value ?? 0) || 0;

export const BOOKS_PER_PAGE = 24;

const EMPTY_TOTALS: UploaderOverallStats = {
  total_books: 0,
  downloads: 0,
  reads_online: 0,
  card_clicks: 0,
  detail_views: 0,
  views: 0,
  reviews_count: 0,
  average_rating: 0,
  likes_count: 0,
  completions: 0,
  avg_progress: 0,
};

const mapBook = (row: any): UploaderBookAnalytics => ({
  book_id: row.book_id,
  title: row.title,
  cover_image_url: row.cover_image_url,
  slug: row.slug,
  category: row.category,
  created_at: row.created_at,
  downloads: toNumber(row.downloads),
  reads_online: toNumber(row.reads_online),
  card_clicks: toNumber(row.card_clicks),
  detail_views: toNumber(row.detail_views),
  views: toNumber(row.views),
  reviews_count: toNumber(row.reviews_count),
  average_rating: toNumber(row.average_rating),
  likes_count: toNumber(row.likes_count),
  completions: toNumber(row.completions),
  avg_progress: toNumber(row.avg_progress),
});

export const useUploaderAnalytics = (days: number, bookId?: string | null) => {
  const [books, setBooks] = useState<UploaderBookAnalytics[]>([]);
  const [totals, setTotals] = useState<UploaderOverallStats>(EMPTY_TOTALS);
  const [totalBooks, setTotalBooks] = useState(0);
  const [countries, setCountries] = useState<UploaderCountry[]>([]);
  const [timeline, setTimeline] = useState<UploaderTimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionLoading, setSelectionLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(0);
  const totalsRequestRef = useRef(0);
  const selectionRequestRef = useRef(0);

  // قائمة الكتب ثابتة وتعرض إحصائيات كل الوقت. تغيير الفترة لا يلمسها إطلاقاً.
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    pageRef.current = 0;
    try {
      const booksRes = await supabase.rpc('get_uploader_book_analytics', {
        p_days: 0,
        p_limit: BOOKS_PER_PAGE,
        p_offset: 0,
      });

      if (booksRes.error) throw booksRes.error;

      const rows = (booksRes.data as any[]) || [];
      const mapped = rows.map(mapBook);
      setBooks(mapped);

      const count = toNumber(rows[0]?.total_books);
      setTotalBooks(count);
      setHasMore(mapped.length >= BOOKS_PER_PAGE && mapped.length < count);
    } catch (err: any) {
      console.error('[useUploaderAnalytics] خطأ:', err);
      setError('حدث خطأ في جلب الإحصائيات');
    } finally {
      setLoading(false);
    }
  }, []);

  // الملخص العلوي وحده يتغير مع الفترة، من دون إعادة تحميل قائمة الكتب.
  const fetchTotals = useCallback(async () => {
    const requestId = ++totalsRequestRef.current;
    try {
      const { data, error: rpcError } = await supabase.rpc('get_uploader_overall_stats', {
        p_days: days,
      });
      if (rpcError) throw rpcError;
      if (requestId !== totalsRequestRef.current) return;

      const overall = ((data as any[]) || [])[0];
      setTotals(
        overall
          ? {
              total_books: toNumber(overall.total_books),
              downloads: toNumber(overall.downloads),
              reads_online: toNumber(overall.reads_online),
              card_clicks: toNumber(overall.card_clicks),
              detail_views: toNumber(overall.detail_views),
              views: toNumber(overall.views),
              reviews_count: toNumber(overall.reviews_count),
              average_rating: toNumber(overall.average_rating),
              likes_count: toNumber(overall.likes_count),
              completions: toNumber(overall.completions),
              avg_progress: toNumber(overall.avg_progress),
            }
          : EMPTY_TOTALS,
      );
    } catch (err) {
      if (requestId === totalsRequestRef.current) {
        console.error('[useUploaderAnalytics] خطأ في الملخص:', err);
      }
    }
  }, [days]);

  // جلب بيانات الاختيار (الخط الزمني + الدول) فقط — عند تغيير الكتاب المحدد
  const fetchSelection = useCallback(async () => {
    const requestId = ++selectionRequestRef.current;
    setSelectionLoading(true);
    try {
      const [countriesRes, timelineRes] = await Promise.all([
        supabase.rpc('get_uploader_top_countries', {
          p_book_id: bookId ?? null,
          p_days: days,
          p_limit: 12,
        }),
        supabase.rpc('get_uploader_events_timeline', {
          p_days: days > 0 ? days : 30,
          p_book_id: bookId ?? null,
        }),
      ]);

      if (requestId !== selectionRequestRef.current) return;

      setCountries(
        ((countriesRes.data as any[]) || []).map((row) => ({
          country_code: row.country_code,
          country_name: row.country_name,
          events: toNumber(row.events),
          reads_online: toNumber(row.reads_online),
          downloads: toNumber(row.downloads),
        })),
      );

      setTimeline(
        ((timelineRes.data as any[]) || []).map((row) => ({
          day: row.day,
          card_clicks: toNumber(row.card_clicks),
          detail_views: toNumber(row.detail_views),
          reads_online: toNumber(row.reads_online),
          downloads: toNumber(row.downloads),
        })),
      );
    } catch (err) {
      console.error('[useUploaderAnalytics] خطأ في بيانات الكتاب المحدد:', err);
    } finally {
      if (requestId === selectionRequestRef.current) setSelectionLoading(false);
    }
  }, [days, bookId]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const { data, error: rpcError } = await supabase.rpc('get_uploader_book_analytics', {
        p_days: 0,
        p_limit: BOOKS_PER_PAGE,
        p_offset: nextPage * BOOKS_PER_PAGE,
      });
      if (rpcError) throw rpcError;

      const mapped = ((data as any[]) || []).map(mapBook);
      pageRef.current = nextPage;
      setBooks((prev) => {
        const seen = new Set(prev.map((b) => b.book_id));
        const merged = [...prev, ...mapped.filter((b) => !seen.has(b.book_id))];
        setHasMore(mapped.length >= BOOKS_PER_PAGE && merged.length < totalBooks);
        return merged;
      });
    } catch (err) {
      console.error('[useUploaderAnalytics] خطأ في تحميل المزيد:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, totalBooks]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    fetchTotals();
  }, [fetchTotals]);

  useEffect(() => {
    fetchSelection();
  }, [fetchSelection]);

  const refetch = useCallback(() => {
    fetchBooks();
    fetchTotals();
    fetchSelection();
  }, [fetchBooks, fetchSelection, fetchTotals]);

  return {
    books,
    totals,
    totalBooks,
    countries,
    timeline,
    loading,
    selectionLoading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    refetch,
  };
};
