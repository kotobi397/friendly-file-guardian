import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Play, RefreshCw, BookOpen, Sparkles, Eye } from '@/components/icons/kotobi-lucide';

interface NoorConfig {
  enabled: boolean;
  search_queries: string[];
  current_query_index: number;
  page_cursor: number;
  batch_size: number;
  max_pending: number;
  total_discovered: number;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

interface PeekBook {
  title: string;
  url: string;
  cover: string | null;
}

interface PeekResult {
  success: boolean;
  error?: string;
  account?: { email: string | null; loggedIn: boolean; displayName: string | null; avatar: string | null };
  source?: string;
  count?: number;
  latest?: PeekBook[];
}

const NoorDiscoverPanel: React.FC = () => {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<NoorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [peeking, setPeeking] = useState(false);
  const [peek, setPeek] = useState<PeekResult | null>(null);


  const load = async () => {
    const { data } = await supabase
      .from('noor_discover_config' as any)
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (data) setCfg(data as unknown as NoorConfig);

    const { count } = await supabase
      .from('bulk_upload_queue')
      .select('id', { count: 'exact', head: true })
      .eq('batch_label', 'noor-auto')
      .in('status', ['pending', 'processing']);
    setQueueCount(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const save = async (patch: Partial<NoorConfig>) => {
    setSaving(true);
    const { error } = await supabase
      .from('noor_discover_config' as any)
      .update(patch as any)
      .eq('id', 1);
    setSaving(false);
    if (error) {
      toast({ title: 'فشل الحفظ', description: error.message, variant: 'destructive' });
    } else {
      await load();
    }
  };

  const toggleEnabled = async (checked: boolean) => {
    await save({ enabled: checked });
    toast({
      title: checked ? '✅ تم تشغيل جلب كتب نور بوك' : '⏸️ تم إيقاف جلب كتب نور بوك',
      description: checked
        ? 'سيقوم النظام كل 5 دقائق بجلب كتب جديدة من نور بوك ونشرها تلقائياً.'
        : 'لن يتم جلب كتب جديدة من نور بوك.',
    });
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-discover-noor-worker', {
        body: { manual: true },
      });
      if (error) throw new Error(error.message);
      toast({
        title: 'اكتمل التشغيل اليدوي',
        description: data?.skipped
          ? `تم التخطي (${data?.reason || 'الطابور ممتلئ'})`
          : `أُضيف ${data?.inserted || 0} كتاب من ${data?.scanned || 0} نتيجة`,
      });
      await load();
    } catch (e: any) {
      toast({ title: 'فشل التشغيل', description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const peekAccount = async () => {
    setPeeking(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-discover-noor-worker', {
        body: { peek: true },
      });
      if (error) throw new Error(error.message);
      setPeek(data as PeekResult);
      if (!data?.success) {
        toast({ title: 'تعذّرت المعاينة', description: data?.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'تعذّرت المعاينة', description: e.message, variant: 'destructive' });
    } finally {
      setPeeking(false);
    }
  };


  const resetCursor = async () => {
    await save({ current_query_index: 0, page_cursor: 1 });
    toast({ title: 'تمت إعادة تعيين المؤشر', description: 'سيبدأ الجلب من أول تصنيف وأول صفحة.' });
  };

  if (loading && !cfg) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const queries = cfg?.search_queries || [];
  const currentQuery = queries[(cfg?.current_query_index ?? 0) % (queries.length || 1)];

  return (
    <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          الجلب والنشر التلقائي من نور بوك (Noor Book)
          {cfg?.enabled && <Badge className="mr-auto bg-green-600">نشط</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription className="space-y-1">
            <div>عند التفعيل، يقوم النظام تلقائياً بـ:</div>
            <ul className="list-disc pr-5 text-sm space-y-0.5">
              <li>تسجيل الدخول إلى نور بوك بحساب الموقع وتصفّح التصنيفات كل 5 دقائق.</li>
              <li>استخراج ملف PDF الأصلي للكتاب ونسخه إلى تخزين موقعنا مع الغلاف.</li>
              <li>إضافته إلى طابور الرفع الذكي الذي يحلّله وينشره تلقائياً.</li>
              <li>استبعاد الكتب المنشورة مسبقاً أو الموجودة في الطابور.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between rounded-lg border p-4 bg-background">
          <div className="space-y-1">
            <Label className="text-base font-bold">تشغيل الجلب من نور بوك</Label>
            <div className="text-xs text-muted-foreground">
              {cfg?.enabled ? 'النظام يعمل الآن في الخلفية على الخادم' : 'متوقف'}
            </div>
          </div>
          <Switch checked={!!cfg?.enabled} onCheckedChange={toggleEnabled} disabled={saving} />
        </div>

        <div className="rounded-lg border p-3 bg-background space-y-2">
          <Label className="text-sm font-bold">التصنيف الحالي</Label>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {currentQuery || '—'} · صفحة {cfg?.page_cursor ?? 1}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {(cfg?.current_query_index ?? 0) + 1}/{queries.length} تصنيف
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div className="rounded-lg border p-2">
            <div className="text-xs text-muted-foreground">في الطابور الآن</div>
            <div className="text-xl font-bold tabular-nums">{queueCount}</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-xs text-muted-foreground">إجمالي مجلوب</div>
            <div className="text-xl font-bold tabular-nums">{cfg?.total_discovered || 0}</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-xs text-muted-foreground">دفعة كل تشغيل</div>
            <div className="text-xl font-bold tabular-nums">{cfg?.batch_size ?? 6}</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-xs text-muted-foreground">آخر تشغيل</div>
            <div className="text-xs font-bold">
              {cfg?.last_run_at ? new Date(cfg.last_run_at).toLocaleTimeString('ar') : '—'}
            </div>
          </div>
        </div>

        {cfg?.last_status && (
          <div className="text-xs text-muted-foreground rounded border bg-muted/30 p-2">
            <strong>آخر حالة:</strong> {cfg.last_status}
          </div>
        )}
        {cfg?.last_error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{cfg.last_error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={runNow} disabled={running}>
            {running ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Play className="ml-2 h-4 w-4" />}
            تشغيل الآن (يدوي)
          </Button>
          <Button onClick={resetCursor} variant="outline" disabled={saving}>
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة تعيين المؤشر
          </Button>
          <Button onClick={peekAccount} variant="secondary" disabled={peeking}>
            {peeking ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Eye className="ml-2 h-4 w-4" />}
            معاينة حسابي في نور بوك
          </Button>
          <Button onClick={load} variant="ghost" size="sm">
            تحديث
          </Button>
        </div>

        {peek?.success && (
          <div className="space-y-3 rounded-lg border p-3 bg-background">
            <div className="flex items-center gap-2 flex-wrap">
              {peek.account?.avatar && (
                <img src={peek.account.avatar} alt="صورة حساب نور بوك" className="h-8 w-8 rounded-full object-cover" loading="lazy" />
              )}
              <span className="text-sm font-bold">
                {peek.account?.displayName || peek.account?.email || 'حساب نور بوك'}
              </span>
              <Badge className={peek.account?.loggedIn ? 'bg-green-600' : 'bg-destructive'}>
                {peek.account?.loggedIn ? 'مسجّل الدخول' : 'غير مسجّل'}
              </Badge>
              {peek.source && (
                <Badge variant="outline" className="text-xs">المصدر: {peek.source}</Badge>
              )}
              <Badge variant="secondary" className="text-xs">{peek.count || 0} كتاب</Badge>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {(peek.latest || []).map((b) => (
                <a
                  key={b.url}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-md border overflow-hidden hover:border-emerald-500/60 transition-colors"
                  title={b.title}
                >
                  {b.cover ? (
                    <img
                      src={b.cover}
                      alt={b.title}
                      loading="lazy"
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-1 text-[11px] leading-tight line-clamp-2 group-hover:text-emerald-600">
                    {b.title}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default NoorDiscoverPanel;
