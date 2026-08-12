import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useBookRequests, type BookRequestsSort } from '@/hooks/useBookRequests';
import BookRequestIcon from '@/components/icons/BookRequestIcon';
import { Flame, Plus, Trash2, CheckCircle2, Clock, Sparkles, Trophy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { optimizeImageUrl } from '@/utils/imageProxy';

const LANGUAGES = ['العربية', 'الإنجليزية', 'الفرنسية', 'الإسبانية', 'الألمانية', 'التركية', 'أخرى'];

const TABS: { key: BookRequestsSort; label: string; icon: typeof Flame }[] = [
  { key: 'top', label: 'الأكثر طلباً', icon: Flame },
  { key: 'new', label: 'الأحدث', icon: Clock },
  { key: 'fulfilled', label: 'تم توفيرها', icon: CheckCircle2 },
];

const RANK_STYLES = [
  'from-sky-400/90 to-sky-600 text-sky-950',
  'from-slate-300/90 to-slate-500 text-slate-900',
  'from-orange-400/90 to-orange-700 text-orange-950',
];

export default function BookRequests() {
  const { user } = useAuth();
  const [sort, setSort] = useState<BookRequestsSort>('top');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', language: 'العربية', reason: '' });

  const {
    requests,
    myVotes,
    loading,
    submitting,
    votingId,
    createRequest,
    toggleVote,
    deleteRequest,
  } = useBookRequests(sort);

  const totalVotes = useMemo(
    () => requests.reduce((sum, r) => sum + r.votes_count, 0),
    [requests]
  );

  const handleSubmit = async () => {
    const ok = await createRequest(form);
    if (ok) {
      setForm({ title: '', author: '', language: 'العربية', reason: '' });
      setOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>طلب كتاب - أكثر الكتب المطلوبة | مكتبة كتبي</title>
        <meta
          name="description"
          content="لم تجد الكتاب الذي تبحث عنه؟ اطلبه من مكتبة كتبي وصوّت على طلبات القرّاء لترى أكثر الكتب المطلوبة."
        />
        <link rel="canonical" href="https://kotobi.online/book-requests" />
      </Helmet>

      <Navbar />

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-card p-5 shadow-[0_6px_0_hsl(var(--primary)/0.3),0_18px_40px_-20px_hsl(var(--primary)/0.55)]">
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/50 bg-primary/10 text-primary">
              <BookRequestIcon className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">
                نظام طلب الكتب
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                لم تجد كتابك في المكتبة؟ اطلبه، وصوّت لطلبات غيرك — الكتب الأكثر تصويتاً نوفّرها أولاً.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-bold">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {requests.length} طلب
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                  <Flame className="h-3.5 w-3.5" />
                  {totalVotes} صوت
                </span>
              </div>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 h-12 w-full rounded-2xl text-base font-extrabold shadow-[0_4px_0_hsl(var(--primary)/0.45)]">
                <Plus className="ml-1 h-5 w-5" />
                📌 اطلب كتاباً
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-right text-lg font-extrabold">طلب كتاب جديد</DialogTitle>
                <DialogDescription className="text-right">
                  اكتب تفاصيل الكتاب الذي تريده وسيصوّت عليه بقية القرّاء.
                </DialogDescription>
              </DialogHeader>

              {user ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">اسم الكتاب *</label>
                    <Input
                      value={form.title}
                      maxLength={200}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="مثال: مئة عام من العزلة"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">اسم المؤلف</label>
                    <Input
                      value={form.author}
                      maxLength={150}
                      onChange={(e) => setForm({ ...form, author: e.target.value })}
                      placeholder="مثال: غابرييل غارسيا ماركيز"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">اللغة</label>
                    <Select
                      value={form.language}
                      onValueChange={(v) => setForm({ ...form, language: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">سبب الطلب</label>
                    <Textarea
                      value={form.reason}
                      maxLength={600}
                      rows={3}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      placeholder="لماذا تريد هذا الكتاب؟"
                    />
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || form.title.trim().length < 2}
                    className="h-11 w-full rounded-xl font-extrabold"
                  >
                    {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">سجّل الدخول لتتمكن من طلب كتاب.</p>
                  <Button asChild className="w-full rounded-xl font-extrabold">
                    <Link to="/auth">تسجيل الدخول</Link>
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </section>

        {/* Tabs */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const active = sort === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSort(tab.key)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-3.5 py-2 text-[13px] font-extrabold transition-all',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-[0_3px_0_hsl(var(--primary)/0.45)]'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* List */}
        <section className="mt-4 space-y-3">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
            <Trophy className="h-4 w-4 text-primary" />
            {sort === 'fulfilled' ? 'كتب تم توفيرها' : 'أكثر الكتب المطلوبة'}
          </h2>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
              <BookRequestIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-bold text-muted-foreground">
                لا توجد طلبات بعد — كن أول من يطلب كتاباً!
              </p>
            </div>
          ) : (
            requests.map((req, idx) => {
              const voted = myVotes.has(req.id);
              const isTop = sort === 'top' && idx < 3;
              const hot = req.votes_count >= 50;
              return (
                <article
                  key={req.id}
                  className={cn(
                    'relative overflow-hidden rounded-2xl border-2 bg-card p-4 transition-shadow',
                    isTop
                      ? 'border-primary/50 shadow-[0_4px_0_hsl(var(--primary)/0.28)]'
                      : 'border-border'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {sort === 'top' && (
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-black',
                          isTop
                            ? `border-primary-foreground/20 bg-gradient-to-b ${RANK_STYLES[idx]}`
                            : 'border-border bg-muted text-muted-foreground'
                        )}
                      >
                        {idx + 1}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-extrabold leading-tight text-foreground">
                          {req.title}
                        </h3>
                        {req.status === 'fulfilled' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            تم توفيره
                          </span>
                        )}
                        {hot && req.status !== 'fulfilled' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                            <Flame className="h-3 w-3" />
                            مطلوب بشدّة
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[13px] font-bold text-muted-foreground">
                        {req.author ? `✍️ ${req.author}` : 'مؤلف غير محدد'} · 🌐 {req.language}
                      </p>

                      {req.reason && (
                        <p className="mt-2 rounded-xl bg-muted/60 p-2.5 text-[13px] leading-relaxed text-foreground/80">
                          {req.reason}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="h-6 w-6 border border-border">
                            <AvatarImage
                              src={optimizeImageUrl(req.profile?.avatar_url || '', 'avatar')}
                              alt={req.profile?.username || 'قارئ'}
                            />
                            <AvatarFallback className="text-[10px]">
                              {(req.profile?.username || 'ق').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-[12px] font-bold text-muted-foreground">
                            {req.profile?.username || 'قارئ'} ·{' '}
                            {formatDistanceToNow(new Date(req.created_at), {
                              addSuffix: true,
                              locale: ar,
                            })}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {user?.id === req.user_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteRequest(req.id)}
                              aria-label="حذف الطلب"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <button
                            onClick={() => toggleVote(req.id)}
                            disabled={votingId === req.id}
                            aria-pressed={voted}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-[13px] font-extrabold transition-all active:scale-95',
                              voted
                                ? 'border-primary bg-primary text-primary-foreground shadow-[0_3px_0_hsl(var(--primary)/0.45)]'
                                : 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                            )}
                          >
                            <Flame className="h-4 w-4" />
                            {req.votes_count}
                          </button>
                        </div>
                      </div>

                      {req.votes_count > 0 && (
                        <p className="mt-2 text-[12px] font-bold text-primary">
                          🔥 {req.votes_count} {req.votes_count === 1 ? 'شخص يريد' : 'شخصاً يريدون'} هذا الكتاب
                        </p>
                      )}

                      {req.admin_note && (
                        <p className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-2 text-[12px] font-bold text-primary">
                          ردّ الإدارة: {req.admin_note}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
