import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Play, RefreshCw, Star, Trash2, BookOpen, Square } from '@/components/icons/kotobi-lucide';

interface QueueRow {
  id: string;
  title: string;
  book_url: string;
  cover_url: string | null;
  rating: number;
  review_text: string;
  status: string;
  error: string | null;
  posted_at: string | null;
  position: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'بانتظار التقييم',
  running: 'جارٍ النشر…',
  done: 'تم النشر',
  error: 'فشل',
  skipped: 'متجاوز',
};

const NoorReviewsManager: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [running, setRunning] = useState(false);
  const [serverRunning, setServerRunning] = useState(false);
  const [fetchCount, setFetchCount] = useState(200);

  const stopRef = useRef(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [defaultRating, setDefaultRating] = useState(5);
  const [defaultText, setDefaultText] = useState('كتاب جميل ومفيد، شكراً لمن شاركه معنا 🌿');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('noor_review_queue' as any)
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      toast({ title: 'تعذّر تحميل القائمة', description: error.message, variant: 'destructive' });
    } else {
      setRows((data as unknown as QueueRow[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // سحب كتب صفحة «أحدث الكتب» من نور بوك وإضافتها للجدول (مع التمرير لصفحات أعمق)
  const fetchLatest = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-discover-noor-worker', {
        body: { latest: true, limit: fetchCount },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل السحب');
      const books: { title: string; url: string; cover: string | null }[] = data.books || [];
      if (!books.length) throw new Error('لم يتم العثور على كتب في الصفحة');

      const existing = new Set(rows.map((r) => r.book_url));
      const toInsert = books
        .filter((b) => !existing.has(b.url))
        .map((b, i) => ({
          title: b.title,
          book_url: b.url,
          cover_url: b.cover,
          rating: defaultRating,
          review_text: defaultText,
          position: rows.length + i,
        }));

      if (toInsert.length) {
        const { error: insErr } = await supabase
          .from('noor_review_queue' as any)
          .upsert(toInsert as any, { onConflict: 'book_url', ignoreDuplicates: true });
        if (insErr) throw insErr;
      }
      toast({
        title: 'تم السحب',
        description: `${books.length} كتاباً من ${data.pages || 1} صفحة، أُضيف ${toInsert.length} جديداً`,
      });
      await load();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e?.message || 'تعذّر السحب', variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };

  // تشغيل النشر على الخادم — يكمل حتى بعد إغلاق الموقع
  const runOnServer = async () => {
    setServerRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-discover-noor-worker', {
        body: { processQueue: true, max: 20 },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل التشغيل');
      toast({
        title: 'تشغيل على الخادم',
        description: data.message || `نجح ${data.ok || 0} — فشل ${data.failed || 0} (يكمل تلقائياً كل 10 دقائق)`,
      });
      await load();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e?.message || 'تعذّر التشغيل على الخادم', variant: 'destructive' });
    } finally {
      setServerRunning(false);
    }
  };


  const updateRow = async (id: string, patch: Partial<QueueRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } as QueueRow : r)));
    await supabase.from('noor_review_queue' as any).update(patch as any).eq('id', id);
  };

  const removeRow = async (id: string) => {
    await supabase.from('noor_review_queue' as any).delete().eq('id', id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const clearDone = async () => {
    await supabase.from('noor_review_queue' as any).delete().eq('status', 'done');
    await load();
  };

  const applyDefaults = async () => {
    const ids = rows.filter((r) => r.status === 'pending').map((r) => r.id);
    if (!ids.length) return;
    await supabase
      .from('noor_review_queue' as any)
      .update({ rating: defaultRating, review_text: defaultText } as any)
      .in('id', ids);
    await load();
    toast({ title: 'تم التطبيق', description: `تم تطبيق التقييم الافتراضي على ${ids.length} كتاباً` });
  };

  const postOne = async (row: QueueRow) => {
    setCurrentId(row.id);
    await updateRow(row.id, { status: 'running', error: null });
    try {
      const { data, error } = await supabase.functions.invoke('auto-discover-noor-worker', {
        body: { review: true, bookUrl: row.book_url, rating: row.rating, text: row.review_text },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل النشر');
      await updateRow(row.id, { status: 'done', error: null, posted_at: new Date().toISOString() });
      return true;
    } catch (e: any) {
      await updateRow(row.id, { status: 'error', error: e?.message || 'خطأ غير متوقع' });
      return false;
    } finally {
      setCurrentId(null);
    }
  };

  // تقييم الكتب واحداً تلو الآخر
  const runAll = async () => {
    stopRef.current = false;
    setRunning(true);
    let ok = 0;
    let fail = 0;
    const list = rows.filter((r) => r.status === 'pending' || r.status === 'error');
    for (const row of list) {
      if (stopRef.current) break;
      const success = await postOne(row);
      success ? ok++ : fail++;
      // فاصل زمني بين كتاب وآخر لتجنّب الحظر
      await new Promise((res) => setTimeout(res, 4000));
    }
    setRunning(false);
    toast({ title: 'انتهى التشغيل', description: `نجح ${ok} — فشل ${fail}` });
  };

  const pending = rows.filter((r) => r.status === 'pending').length;
  const done = rows.filter((r) => r.status === 'done').length;
  const failed = rows.filter((r) => r.status === 'error').length;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            تقييم كتب نور بوك تلقائياً
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-sm">
              يسحب الكتب من صفحة{' '}
              <a
                className="underline"
                href="https://www.noor-book.com/latest?landing=false"
                target="_blank"
                rel="noreferrer"
              >
                أحدث الكتب في نور بوك
              </a>{' '}
              ويضعها في الجدول أدناه، ثم ينشر التقييم والتعليق بحسابك كتاباً بعد كتاب.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3 md:grid-cols-[120px_1fr_auto] items-start">
            <div>
              <label className="text-sm text-muted-foreground">التقييم الافتراضي</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={defaultRating}
                onChange={(e) => setDefaultRating(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">نص المراجعة الافتراضي</label>
              <Textarea rows={2} value={defaultText} onChange={(e) => setDefaultText(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <Button variant="outline" onClick={applyDefaults} disabled={running}>
                تطبيق على المنتظرة
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchLatest} disabled={fetching || running}>
              {fetching ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <BookOpen className="h-4 w-4 ml-2" />}
              سحب أحدث الكتب
            </Button>
            <Button onClick={runAll} disabled={running || !rows.some((r) => r.status === 'pending' || r.status === 'error')}>
              {running ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Play className="h-4 w-4 ml-2" />}
              بدء التقييم بالتوالي
            </Button>
            {running && (
              <Button variant="destructive" onClick={() => { stopRef.current = true; }}>
                <Square className="h-4 w-4 ml-2" />
                إيقاف
              </Button>
            )}
            <Button variant="outline" onClick={load} disabled={running}>
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button variant="outline" onClick={clearDone} disabled={running || !done}>
              حذف المنشورة
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">الإجمالي: {rows.length}</Badge>
            <Badge variant="secondary">بانتظار: {pending}</Badge>
            <Badge className="bg-green-600">تم: {done}</Badge>
            {failed > 0 && <Badge variant="destructive">فشل: {failed}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">جدول التقييمات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              لا توجد كتب بعد — اضغط «سحب أحدث الكتب».
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-right">
                    <th className="p-3 w-16">الغلاف</th>
                    <th className="p-3">الكتاب</th>
                    <th className="p-3 w-24">النجوم</th>
                    <th className="p-3 min-w-[260px]">نص المراجعة</th>
                    <th className="p-3 w-32">الحالة</th>
                    <th className="p-3 w-28">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={`border-t ${currentId === r.id ? 'bg-primary/5' : ''}`}>
                      <td className="p-3">
                        {r.cover_url ? (
                          <img src={r.cover_url} alt={r.title} loading="lazy" className="w-12 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-16 rounded bg-muted" />
                        )}
                      </td>
                      <td className="p-3">
                        <a href={r.book_url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                          {r.title}
                        </a>
                        {r.error && <p className="text-xs text-destructive mt-1">{r.error}</p>}
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={r.rating}
                          disabled={running}
                          onChange={(e) =>
                            updateRow(r.id, { rating: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })
                          }
                        />
                      </td>
                      <td className="p-3">
                        <Textarea
                          rows={2}
                          value={r.review_text}
                          disabled={running}
                          onChange={(e) => updateRow(r.id, { review_text: e.target.value })}
                        />
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={r.status === 'error' ? 'destructive' : r.status === 'done' ? 'default' : 'secondary'}
                        >
                          {STATUS_LABEL[r.status] || r.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={running}
                            onClick={() => postOne(r)}
                            title="نشر الآن"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={running}
                            onClick={() => removeRow(r.id)}
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NoorReviewsManager;
