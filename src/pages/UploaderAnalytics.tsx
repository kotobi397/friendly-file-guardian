import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SEOHead } from '@/components/seo/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Download,
  BookOpen,
  TrendingUp,
  Eye,
  Star,
  Heart,
  Globe,
  Loader2,
  RefreshCw,
} from '@/components/icons/kotobi-lucide';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useUploaderAnalytics, type UploaderBookAnalytics } from '@/hooks/useUploaderAnalytics';
import { getCategoryInArabic } from '@/utils/categoryTranslation';

const RANGES = [
  { value: 7, label: '٧ أيام' },
  { value: 30, label: '٣٠ يوماً' },
  { value: 90, label: '٩٠ يوماً' },
  { value: 0, label: 'كل الوقت' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const flagFromCode = (code: string) => {
  if (!code || code.length !== 2 || code === 'XX') return '🌍';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
};

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}> = ({ icon, label, value, accent }) => (
  <motion.div variants={itemVariants}>
    <Card className="h-full border-border overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${accent}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-tajawal truncate">{label}</p>
          <p className="text-xl font-black font-cairo text-foreground">
            {value.toLocaleString('ar-EG')}
          </p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const BookRow = React.memo<{
  book: UploaderBookAnalytics;
  selected: boolean;
  onSelect: (bookId: string) => void;
  onOpen: (book: UploaderBookAnalytics) => void;
}>(({ book, selected, onSelect, onOpen }) => {
  const clicks = book.card_clicks || 0;
  const opened = book.detail_views || 0;
  const conversion = clicks > 0 ? Math.min(100, Math.round((opened / clicks) * 100)) : 0;

  return (
    <div className="analytics-book-row">
      <Card
        onClick={() => onSelect(book.book_id)}
        className={`cursor-pointer border-border ${
          selected ? 'ring-2 ring-primary' : ''
        }`}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex gap-3">
            <img
              src={book.cover_image_url || '/placeholder.svg'}
              alt={`غلاف كتاب ${book.title}`}
              loading="lazy"
              className="w-14 h-20 sm:w-16 sm:h-24 object-cover rounded-lg bg-muted flex-shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-tajawal font-black text-sm sm:text-base text-foreground line-clamp-2">
                  {book.title}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="font-tajawal text-xs shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(book);
                  }}
                >
                  فتح الكتاب
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="font-tajawal text-[11px]">
                  {getCategoryInArabic(book.category || '')}
                </Badge>
                <Badge variant="outline" className="font-tajawal text-[11px] gap-1">
                  <Star className="h-3 w-3" /> {book.average_rating.toFixed(1)} ({book.reviews_count})
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-tajawal">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Download className="h-3 w-3 text-emerald-500" /> {book.downloads} تحميل
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <BookOpen className="h-3 w-3 text-sky-500" /> {book.reads_online} قراءة
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-sky-500" /> {book.card_clicks} ضغطة
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-3 w-3 text-violet-500" /> {book.views} مشاهدة
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-tajawal">
                  <span>نسبة الانتقال من البطاقة إلى صفحة الكتاب</span>
                  <span className="font-black text-foreground">{conversion}%</span>
                </div>
                <Progress value={conversion} className="h-1.5" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
BookRow.displayName = 'BookRow';

const UploaderAnalytics: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(30);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  const {
    books,
    totals: overall,
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
  } = useUploaderAnalytics(days, selectedBook);

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  const handleSelectBook = useCallback((bookId: string) => {
    setSelectedBook((current) => (current === bookId ? null : bookId));
  }, []);

  const handleOpenBook = useCallback(
    (book: UploaderBookAnalytics) => navigate(`/book/${book.slug || book.book_id}`),
    [navigate],
  );

  React.useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true });
  }, [authLoading, user, navigate]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // تحميل تدريجي: ٢٤ كتاباً في كل مرة عند الوصول لأسفل القائمة
  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // الإحصائيات العامة تشمل جميع الكتب (محسوبة في قاعدة البيانات)
  const totals = useMemo(
    () => ({
      downloads: overall.downloads,
      reads: overall.reads_online,
      clicks: overall.card_clicks,
      views: overall.views,
      reviews: overall.reviews_count,
      likes: overall.likes_count,
    }),
    [overall],
  );

  const maxCountry = countries[0]?.events || 1;
  const selected = books.find((b) => b.book_id === selectedBook) || null;

  const chartData = useMemo(
    () =>
      timeline.map((point) => ({
        day: new Date(point.day).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
        ضغطات: point.card_clicks,
        قراءات: point.reads_online,
        تحميلات: point.downloads,
      })),
    [timeline],
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <SEOHead
        title="لوحة تحليلات الكاتب | كتبي"
        description="تابع إحصائيات كتبك: التحميلات، القراءات أونلاين، ضغطات البطاقة، التقييمات، والدول الأكثر قراءة."
      />
      <Navbar />

      <main className="flex-grow container mx-auto px-3 sm:px-4 py-6 max-w-6xl">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-6"
        >
          {/* الترويسة */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-cairo font-black text-foreground">
                  لوحة تحليلات الكاتب
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-tajawal">
                  إحصائيات كاملة لكل كتاب رفعته على كتبي
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                <TabsList className="font-tajawal">
                  {RANGES.map((r) => (
                    <TabsTrigger key={r.value} value={String(r.value)} className="text-xs">
                      {r.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Button variant="outline" size="icon" onClick={refetch} aria-label="تحديث">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </motion.div>

          {error && (
            <motion.p variants={itemVariants} className="text-destructive font-tajawal text-sm">
              {error}
            </motion.p>
          )}

          {/* بطاقات الملخص */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
          >
            <StatTile
              icon={<Download className="h-5 w-5 text-emerald-500" />}
              label="التحميلات"
              value={totals.downloads}
              accent="bg-emerald-500/10"
            />
            <StatTile
              icon={<BookOpen className="h-5 w-5 text-sky-500" />}
              label="قراءات أونلاين"
              value={totals.reads}
              accent="bg-sky-500/10"
            />
            <StatTile
              icon={<TrendingUp className="h-5 w-5 text-sky-500" />}
              label="ضغطات البطاقة"
              value={totals.clicks}
              accent="bg-sky-500/10"
            />
            <StatTile
              icon={<Eye className="h-5 w-5 text-violet-500" />}
              label="المشاهدات"
              value={totals.views}
              accent="bg-violet-500/10"
            />
            <StatTile
              icon={<Star className="h-5 w-5 text-sky-500" />}
              label="التقييمات"
              value={totals.reviews}
              accent="bg-sky-500/10"
            />
            <StatTile
              icon={<Heart className="h-5 w-5 text-rose-500" />}
              label="الإعجابات"
              value={totals.likes}
              accent="bg-rose-500/10"
            />
          </motion.div>

          {/* مخطط الزمن */}
          <motion.div variants={itemVariants}>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="font-cairo text-base font-black flex items-center gap-2">
                  حركة التفاعل
                  {selected && (
                    <Badge variant="secondary" className="font-tajawal text-[11px]">
                      {selected.title}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64 pt-0">
                {selectionLoading ? (
                  <Skeleton className="w-full h-full rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 12,
                          fontFamily: 'Tajawal, sans-serif',
                          direction: 'rtl',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="ضغطات"
                        stroke="hsl(var(--primary))"
                        fill="url(#gClicks)"
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="قراءات"
                        stroke="#0ea5e9"
                        fill="#0ea5e922"
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="تحميلات"
                        stroke="#10b981"
                        fill="#10b98122"
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* الكتب */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-cairo font-black text-base text-foreground">
                  إحصائيات كتبك ({books.length.toLocaleString('ar-EG')}
                  {totalBooks > books.length ? ` من ${totalBooks.toLocaleString('ar-EG')}` : ''})
                </h2>
                {selectedBook && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-tajawal text-xs"
                    onClick={() => setSelectedBook(null)}
                  >
                    إلغاء التحديد
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : books.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="p-8 text-center space-y-3">
                    <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
                    <p className="font-tajawal text-muted-foreground">
                      لا توجد كتب معتمدة لك بعد. ارفع كتاباً لتبدأ رؤية إحصائياته هنا.
                    </p>
                    <Button className="font-tajawal" onClick={() => navigate('/upload-book')}>
                      رفع كتاب
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {books.map((book) => (
                    <BookRow
                      key={book.book_id}
                      book={book}
                      selected={selectedBook === book.book_id}
                      onSelect={handleSelectBook}
                      onOpen={handleOpenBook}
                    />
                  ))}

                  {/* حسّاس التحميل التدريجي */}
                  <div ref={sentinelRef} className="h-1 w-full" aria-hidden />

                  {loadingMore && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground font-tajawal text-xs">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        جارٍ تحميل ٢٤ كتاباً إضافياً...
                      </div>
                      {[0, 1].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                      ))}
                    </motion.div>
                  )}

                  {!hasMore && !loadingMore && books.length > 0 && (
                    <p className="text-center text-[11px] font-tajawal text-muted-foreground py-2">
                      عرضت جميع كتبك ({totalBooks.toLocaleString('ar-EG')})
                    </p>
                  )}

                  {hasMore && !loadingMore && (
                    <div className="flex justify-center pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-tajawal text-xs"
                        onClick={loadMore}
                      >
                        تحميل المزيد
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* الدول */}
            <motion.div variants={itemVariants}>
              <Card className="border-border lg:sticky lg:top-24">
                <CardHeader className="pb-2">
                  <CardTitle className="font-cairo text-base font-black flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    الدول الأكثر قراءة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectionLoading ? (
                    [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)
                  ) : countries.length === 0 ? (
                    <p className="text-sm text-muted-foreground font-tajawal">
                      لا توجد بيانات دول بعد — ستظهر تلقائياً مع تفاعل القرّاء.
                    </p>
                  ) : (
                    countries.map((c, index) => (
                      <div key={`${c.country_code}-${index}`} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-tajawal">
                          <span className="flex items-center gap-2 text-foreground">
                            <span aria-hidden>{flagFromCode(c.country_code)}</span>
                            {c.country_name}
                          </span>
                          <span className="text-muted-foreground">
                            {c.events.toLocaleString('ar-EG')}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.round((c.events / maxCountry) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default UploaderAnalytics;
