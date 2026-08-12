import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/utils/userProfile';

export type BookEventType = 'card_click' | 'detail_view' | 'read_online' | 'download';

interface GeoInfo {
  country_code: string | null;
  country_name: string | null;
}

const GEO_CACHE_KEY = 'kotobi:geo:v1';
const GEO_TTL_MS = 1000 * 60 * 60 * 24 * 7; // أسبوع
const SESSION_KEY = 'kotobi:analyticsSession:v1';
const DEDUPE_PREFIX = 'kotobi:evt:';
// نوافذ منع التكرار لكل نوع حدث:
// الضغطات وفتح التفاصيل تُحتسب في كل دخول جديد للصفحة (نافذة قصيرة جداً
// تمنع فقط الاحتساب المزدوج للضغطة على البطاقة + تحميل الصفحة نفسها).
const DEDUPE_WINDOWS: Record<string, number> = {
  card_click: 8 * 1000,
  detail_view: 8 * 1000,
  read_online: 1000 * 60 * 30,
  download: 1000 * 60 * 30,
};

let geoPromise: Promise<GeoInfo> | null = null;

const getSessionId = (): string => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous-session';
  }
};

const getDeviceType = (): string => {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
};

/** جلب الدولة مرة واحدة وتخزينها محلياً — لا يعيق أي تفاعل في الموقع */
const resolveGeo = (): Promise<GeoInfo> => {
  if (geoPromise) return geoPromise;

  geoPromise = (async () => {
    try {
      const raw = localStorage.getItem(GEO_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.ts && Date.now() - parsed.ts < GEO_TTL_MS && parsed?.data) {
          return parsed.data as GeoInfo;
        }
      }
    } catch {
      // تجاهل
    }

    const empty: GeoInfo = { country_code: null, country_name: null };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return empty;
      const json = await res.json();
      const geo: GeoInfo = {
        country_code: json?.country_code || null,
        country_name: json?.country_name || null,
      };
      try {
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: geo }));
      } catch {
        // تجاهل
      }
      return geo;
    } catch {
      return empty;
    }
  })();

  return geoPromise;
};

const shouldSkip = (bookId: string, eventType: BookEventType): boolean => {
  try {
    const key = `${DEDUPE_PREFIX}${eventType}:${bookId}`;
    const last = Number(sessionStorage.getItem(key) || 0);
    const windowMs = DEDUPE_WINDOWS[eventType] ?? 8 * 1000;
    if (last && Date.now() - last < windowMs) return true;
    sessionStorage.setItem(key, String(Date.now()));
    return false;
  } catch {
    return false;
  }
};

const runIdle = (fn: () => void) => {
  const ric = (window as any).requestIdleCallback;
  if (typeof ric === 'function') ric(fn, { timeout: 2000 });
  else setTimeout(fn, 300);
};

/**
 * تسجيل حدث خاص بكتاب (ضغط بطاقة / فتح تفاصيل / قراءة أونلاين / تحميل).
 * غير معيق تماماً: يعمل في وقت الفراغ ويتجاهل أي خطأ.
 */
export const trackBookEvent = (
  bookId: string | number | undefined | null,
  eventType: BookEventType,
): void => {
  if (typeof window === 'undefined') return;
  const id = bookId ? String(bookId) : '';
  if (!isUuid(id)) return; // نتعامل فقط مع كتب قاعدة البيانات
  if (shouldSkip(id, eventType)) return;

  runIdle(async () => {
    try {
      const [geo, authRes] = await Promise.all([resolveGeo(), supabase.auth.getSession()]);
      await supabase.from('book_events').insert({
        book_id: id,
        user_id: authRes.data.session?.user?.id ?? null,
        event_type: eventType,
        country_code: geo.country_code,
        country_name: geo.country_name,
        device_type: getDeviceType(),
        referrer: (document.referrer || '').slice(0, 300) || null,
        session_id: getSessionId(),
      });
    } catch (error) {
      console.debug('[bookAnalytics] تجاهل خطأ التتبع:', error);
    }
  });
};
