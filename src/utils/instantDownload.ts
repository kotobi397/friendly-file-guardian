import { resolvePdfDownloadUrl, isSupabaseStorageUrl } from '@/utils/imageProxy';

/**
 * يبني رابط تحميل فوري:
 * - روابط Supabase Storage تدعم ?download=<name> فتُرجع Content-Disposition: attachment
 *   وبالتالي يبدأ التنزيل فورًا دون تحميل الملف كاملًا في الذاكرة (blob).
 */
export const buildInstantDownloadUrl = (rawUrl: string, fileName: string): string => {
  const direct = resolvePdfDownloadUrl(rawUrl);
  try {
    const url = new URL(direct, window.location.origin);
    if (isSupabaseStorageUrl(url.href)) {
      url.searchParams.set('download', fileName);
    }
    return url.href;
  } catch {
    return direct;
  }
};

const isSameOrigin = (href: string): boolean => {
  try {
    return new URL(href, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
};

const buildBookDownloadEndpoint = (bookId: string, fileName: string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL is not configured');
  }
  const url = new URL('/functions/v1/download-book', supabaseUrl);
  url.searchParams.set('book_id', bookId);
  url.searchParams.set('filename', fileName);
  return url.href;
};

/**
 * تنزيل عبر iframe مخفي: الرابط يعيد Content-Disposition: attachment
 * فيبدأ المتصفح التنزيل فورًا دون أي انتقال (navigation) للمستخدم.
 */
const downloadViaHiddenFrame = (href: string): void => {
  const existing = document.getElementById('kotobi-dl-frame') as HTMLIFrameElement | null;
  const frame = existing ?? document.createElement('iframe');
  if (!existing) {
    frame.id = 'kotobi-dl-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    document.body.appendChild(frame);
  }
  frame.src = href;
};

/**
 * يبدأ التنزيل فورًا (بدون fetch/blob وبدون نقل المستخدم إلى رابط Supabase).
 */
export const startInstantDownload = (rawUrl: string, fileName: string, bookId?: string): void => {
  // تمر جميع تنزيلات الكتب المعروفة عبر Supabase Edge Function. تقوم الدالة ببث
  // ملف S3/Supabase مع Content-Disposition: attachment، لذلك لا ينتقل المستخدم
  // إلى رابط التخزين ولا نحمّل الملف كاملًا في ذاكرة المتصفح.
  if (bookId) {
    downloadViaHiddenFrame(buildBookDownloadEndpoint(bookId, fileName));
    return;
  }

  const href = buildInstantDownloadUrl(rawUrl, fileName);

  // نفس الأصل: سمة download تعمل بشكل موثوق
  if (isSameOrigin(href)) {
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // رابط Supabase العام: يرجع Content-Disposition: attachment مع ?download
  // فيبدأ التنزيل داخل iframe مخفي بدون نقل المستخدم.
  if (isSupabaseStorageUrl(href)) {
    downloadViaHiddenFrame(href);
    return;
  }

  // روابط خارجية أخرى (مثل signed S3): نجلب الملف كـ blob ثم ننزّله.
  void (async () => {
    try {
      const res = await fetch(href, { mode: 'cors' });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch {
      downloadViaHiddenFrame(href);
    }
  })();
};
