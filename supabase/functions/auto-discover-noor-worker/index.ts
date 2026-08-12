// اكتشاف تلقائي للكتب من موقع نور بوك (noor-book.com) وإضافتها إلى طابور الرفع
// يعمل عبر cron كل بضع دقائق. يسجّل الدخول بحساب الموقع، يتصفح التصنيفات،
// يستخرج رابط تحميل PDF مباشر لكل كتاب، ثم يضيفه إلى bulk_upload_queue.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://www.noor-book.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const MAX_MS = 110_000;
let startedAt = Date.now();


// ---------- جلسة مع كوكيز ----------
class Session {
  jar = new Map<string, string>();
  cookie() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  private save(r: Response) {
    // @ts-ignore Deno
    const all: string[] = r.headers.getSetCookie?.() ?? [];
    for (const c of all) {
      const [k, ...rest] = c.split(";")[0].split("=");
      if (k) this.jar.set(k.trim(), rest.join("="));
    }
  }
  async get(url: string, referer = BASE) {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Cookie: this.cookie(), Referer: referer, "Accept-Language": "ar,en;q=0.9" },
      redirect: "follow",
    });
    this.save(r);
    return r;
  }
  async post(url: string, body: Record<string, string>, referer: string) {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        Cookie: this.cookie(),
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: referer,
        Origin: BASE,
      },
      body: new URLSearchParams(body),
    });
    this.save(r);
    return r;
  }
}

const uid = () =>
  [...Array(16)].map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("") +
  Math.floor(Math.random() * 5828365 + 4584);

async function login(s: Session) {
  const email = Deno.env.get("NOOR_BOOK_EMAIL");
  const password = Deno.env.get("NOOR_BOOK_PASSWORD");
  if (!email || !password) throw new Error("NOOR_BOOK_EMAIL / NOOR_BOOK_PASSWORD غير مضبوطة");
  const html = await (await s.get(`${BASE}/en/login`)).text();
  const csrf = html.match(/id="login"[\s\S]*?name="csrf_token" value="([^"]+)"/)?.[1];
  if (!csrf) throw new Error("تعذّر استخراج csrf من صفحة الدخول");
  const res = await s.post(
    `${BASE}/en/user/go_login`,
    { email, phone: "", password, csrf_token: csrf, type: "email" },
    `${BASE}/en/login`,
  );
  const txt = await res.text();
  if (!txt.includes("success")) throw new Error(`فشل تسجيل الدخول إلى نور بوك: ${txt.slice(0, 120)}`);
}

// ---------- تصفح نتائج تصنيف ----------
async function listBooks(s: Session, query: string, page: number): Promise<string[]> {
  const searchUrl = `${BASE}/?search_for=${encodeURIComponent(query)}`;
  let html = await (await s.get(searchUrl)).text();
  if (page > 1) {
    const token = html.match(/csrf_token = '([^']+)'/)?.[1] ?? "";
    const more = await s.get(`${searchUrl}&page_ajax=${page}&token=${encodeURIComponent(token)}&ls=null`, searchUrl);
    html = await more.text();
    if (html.trim() === "no_more") return [];
  }
  const paths = new Set<string>();
  for (const m of html.matchAll(/href="((?:\/en)?\/(?:ebook|كتاب)[^"?#]*?)"/g)) {
    paths.add(decodeURI(m[1].replace(/^\/en/, "")));
  }
  return [...paths];
}

// ---------- أدوات نصية ----------
function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// الوصف الفعلي للكتاب كما هو منشور في نور بوك
function extractBookDescription(html: string): string | null {
  const block = html.match(/<p[^>]*class="[^"]*book_desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  let text = block ? stripHtml(block) : "";
  if (text) {
    // الصفحة تكرر النص (نسخة مختصرة + كاملة) — نأخذ أطول مقطع فريد
    const parts = text.split(/\s{2,}|\n/).map((t) => t.trim()).filter(Boolean);
    if (parts.length) text = parts.sort((a, b) => b.length - a.length)[0];
  }
  if (!text) {
    text = stripHtml(
      html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ?? "",
    );
  }
  text = text.trim();
  return text.length >= 40 ? text.slice(0, 4000) : null;
}

// جلب تعريف المؤلف وصورته من صفحة المؤلف في نور بوك
async function fetchAuthorInfo(
  s: Session,
  authorUrl: string,
  referer: string,
): Promise<{ name: string | null; bio: string | null; image: string | null }> {
  try {
    const res = await s.get(encodeURI(decodeURI(authorUrl)), referer);
    const html = await res.text();
    // الاسم العربي من الرابط البديل (النسخة العربية): /كتب-ابن-القيم-pdf
    const arHref = html.match(/<link[^>]+hreflang="ar"[^>]*>/i)?.[0]?.match(/href="([^"]+)"/)?.[1];
    let name: string | null = null;
    if (arHref) {
      const slug = decodeURIComponent(arHref.split("/").pop() || "");
      const cleaned = slug.replace(/^كتب-/, "").replace(/-?pdf$/i, "").replace(/-/g, " ").trim();
      if (/[\u0600-\u06FF]/.test(cleaned) && cleaned.length >= 2) name = cleaned;
    }
    const bioBlock = html.match(
      /<p[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/p>/i,
    )?.[1];
    let bio = bioBlock ? stripHtml(bioBlock) : null;
    if (bio) {
      const parts = bio.split(/\s{3,}/).map((t) => t.trim()).filter(Boolean);
      if (parts.length) bio = parts.sort((a, b) => b.length - a.length)[0];
      bio = bio.length >= 40 ? bio.slice(0, 4000) : null;
    }
    const imgPath = html.match(/<img[^>]+writer_photo[^>]*>/i)?.[0]?.match(/src="([^"]+)"/)?.[1] ??
      html.match(/\/publice\/writers_avatars\/[^"' )]+/)?.[0] ?? null;
    const image = imgPath ? (imgPath.startsWith("http") ? imgPath : BASE + imgPath) : null;
    return { name, bio, image };
  } catch {
    return { name: null, bio: null, image: null };
  }
}

// ---------- استخراج رابط تحميل مباشر + بيانات الكتاب ----------
async function resolveBook(s: Session, path: string) {
  const url = BASE + encodeURI(path);
  const html = await (await s.get(url)).text();
  const bookHash = html.match(/book_hash = '([^']+)'/)?.[1];
  const bh = html.match(/b_h = '([^']+)'/)?.[1];
  const csrf = html.match(/csrf_token = '([^']+)'/)?.[1];
  const crypto = html.match(/crypto_token = '([^']+)'/)?.[1];
  if (!bookHash || !bh || !csrf || !crypto) throw new Error("تعذّر استخراج مفاتيح الصفحة");

  const ldMatch = html.match(/"@type"\s*:\s*"Book"[\s\S]{0,600}?\}/);
  const ld = ldMatch?.[0] ?? "";
  const title =
    ld.match(/"name"\s*:\s*"([^"]+)"/)?.[1] ??
    decodeURIComponent(path.replace(/^\/ebook-/, "").replace(/-?pdf(-\d+)?$/, "")).replace(/-/g, " ").trim();
  let author = ld.match(/"author"[\s\S]{0,120}?"name"\s*:\s*"([^"]+)"/)?.[1] ?? null;
  const authorUrl = html
    .match(/"author"\s*:\s*\{[\s\S]{0,200}?"url"\s*:\s*"([^"]+)"/)?.[1] ?? null;
  const coverPath = html.match(/covers_cache_jpg\/[^"' )]+/)?.[0];
  const cover = coverPath ? `${BASE}/publice/${coverPath}` : null;

  // الوصف الفعلي للكتاب من نور بوك
  const description = extractBookDescription(html);

  // تعريف المؤلف وصورته من صفحته في نور بوك
  let authorBio: string | null = null;
  let authorImage: string | null = null;
  if (authorUrl) {
    const info = await fetchAuthorInfo(s, authorUrl, url);
    authorBio = info.bio;
    authorImage = info.image;
    if (info.name) author = info.name; // نفضّل الاسم العربي
  }

  const check = await s.post(
    `${BASE}/en/Verification/check_user?o=${uid()}`,
    { csrf_token: csrf, book_hash: bh, _: crypto, ls: "null" },
    url,
  );
  const cj = await check.json();
  if (cj.is_logged !== 1 && cj.is_logged !== "1") throw new Error("الجلسة غير مسجّلة الدخول");

  const dl = await s.post(
    `${BASE}/en/book/get_download_links?o=${uid()}`,
    { book_hash: bookHash, csrf_token: cj.osf, _: crypto, ls: cj.ls ?? "null" },
    url,
  );
  const dlHtml = await dl.text();
  const internal = dlHtml.match(/\/book\/internal_download\/[^"']+/)?.[0];
  if (!internal) throw new Error(`لا يوجد رابط تحميل: ${dlHtml.slice(0, 60)}`);

  return {
    title: title.trim(),
    author,
    cover,
    description,
    authorBio,
    authorImage,
    fileUrl: BASE + internal,
    sourceUrl: url,
  };
}

const MAX_FILE_BYTES = 90 * 1024 * 1024;

// تنزيل ملف الكتاب داخل الجلسة الحالية ورفعه إلى تخزيننا (الرابط الأصلي مؤقت)
async function mirrorPdf(
  s: Session,
  supabase: any,
  book: { title: string; fileUrl: string; sourceUrl: string },
): Promise<string> {
  const res = await s.get(book.fileUrl, book.sourceUrl);
  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("pdf")) {
    await res.body?.cancel();
    throw new Error(`الرابط لم يُرجع PDF (${ctype.slice(0, 40)})`);
  }
  const size = Number(res.headers.get("content-length") || 0);
  if (size > MAX_FILE_BYTES) {
    await res.body?.cancel();
    throw new Error(`الملف كبير جداً (${Math.round(size / 1048576)}MB)`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength < 20_000) throw new Error("ملف صغير/تالف");

  const key = `noor-auto/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from("book-uploads")
    .upload(key, bytes, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error(`فشل رفع الملف: ${error.message}`);

  const { data } = supabase.storage.from("book-uploads").getPublicUrl(key);
  return data.publicUrl as string;
}

// نسخ الغلاف إلى تخزيننا أيضاً (روابط نور بوك قد تُحجب عن خوادمنا)
async function mirrorImage(
  s: Session,
  supabase: any,
  coverUrl: string,
  sourceUrl: string,
  prefix = "noor-auto",
): Promise<string | null> {
  try {
    const res = await s.get(coverUrl, sourceUrl);
    const ctype = res.headers.get("content-type") || "";
    if (!res.ok || !ctype.startsWith("image/")) {
      await res.body?.cancel();
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength < 1000) return null;
    const ext = ctype.includes("png") ? "png" : ctype.includes("webp") ? "webp" : "jpg";
    const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("book-covers")
      .upload(key, bytes, { contentType: ctype, upsert: false });
    if (error) return null;
    return supabase.storage.from("book-covers").getPublicUrl(key).data.publicUrl as string;
  } catch {
    return null;
  }
}

// ---------- نظرة داخل الحساب: بيانات الحساب + أحدث الكتب الظاهرة ----------
function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromPath(path: string) {
  const slug = decodeURIComponent(path.split("/").pop() || "");
  return slug
    .replace(/^(ebook-|كتاب-)/, "")
    .replace(/-?pdf(-\d+)?$/i, "")
    .replace(/-/g, " ")
    .trim();
}

function extractBookCards(html: string, limit: number) {
  const seen = new Set<string>();
  const books: { title: string; url: string; cover: string | null }[] = [];
  for (const m of html.matchAll(/href="((?:\/en)?\/(?:ebook-|كتاب-)[^"?#]*?)"/g)) {
    const path = decodeURI(m[1].replace(/^\/en/, ""));
    // نتجاهل صفحات المؤلفين (/ebooks-...) ونبقي صفحات الكتب فقط
    if (/^\/ebooks-/.test(path) || seen.has(path)) continue;
    seen.add(path);
    const idx = m.index ?? 0;
    const around = html.slice(Math.max(0, idx - 700), idx + 700);
    const coverPath = around.match(/covers_cache_jpg\/[^"' )]+/)?.[0];
    const titleAttr = around.match(/title="([^"]{3,160})"/)?.[1];
    const fromAttr = titleAttr ? decodeEntities(titleAttr) : "";
    // بعض العناصر تحمل تقييماً رقمياً بدل العنوان
    const title = /^[\d.,\s]+$/.test(fromAttr) || !fromAttr ? titleFromPath(path) : fromAttr;
    books.push({
      title,
      url: BASE + encodeURI(path),
      cover: coverPath ? `${BASE}/publice/${coverPath}` : null,
    });
    if (books.length >= limit) break;
  }
  return books;
}


async function peekAccount() {
  const s = new Session();
  const email = Deno.env.get("NOOR_BOOK_EMAIL") || null;
  await login(s);

  const homeHtml = await (await s.get(`${BASE}/en`)).text();
  const displayName =
    decodeEntities(
      homeHtml.match(/class="[^"]*user_name[^"]*"[^>]*>([\s\S]{1,120}?)</i)?.[1] ??
        homeHtml.match(/id="user_name"[^>]*>([\s\S]{1,120}?)</i)?.[1] ??
        "",
    ) || null;
  const avatarPath =
    homeHtml.match(/\/publice\/users_avatars\/[^"' )]+/)?.[0] ??
    homeHtml.match(/\/publice\/avatars\/[^"' )]+/)?.[0] ??
    null;
  const loggedIn = /go_logout|user\/logout/i.test(homeHtml);

  const candidates = [
    { label: "الصفحة الرئيسية للحساب", url: `${BASE}/en` },
    { label: "أحدث الكتب", url: `${BASE}/en/new-books` },
    { label: "الكتب الجديدة", url: `${BASE}/en/ebooks-new` },
  ];
  const limit = 24;
  let latest: { title: string; url: string; cover: string | null }[] = [];
  let source = "";
  const tried: { label: string; status: number; found: number }[] = [];

  for (const c of candidates) {
    try {
      const res = await s.get(c.url);
      const html = res.ok ? await res.text() : "";
      const found = html ? extractBookCards(html, limit) : [];
      tried.push({ label: c.label, status: res.status, found: found.length });
      if (found.length > latest.length) {
        latest = found;
        source = c.label;
      }
      if (latest.length >= limit) break;
    } catch {
      tried.push({ label: c.label, status: 0, found: 0 });
    }
  }

  return {
    success: true,
    account: { email, loggedIn, displayName, avatar: avatarPath ? BASE + avatarPath : null },
    source,
    tried,
    count: latest.length,
    latest,
  };
}

// ---------- سحب كتب صفحة «أحدث الكتب» ----------
function extractLatestCards(html: string, limit: number) {
  const out: { title: string; url: string; cover: string | null }[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]*class="img-a"[^>]*title="([^"]{1,200})"[^>]*href="([^"?#]+)"/g;
  for (const m of html.matchAll(re)) {
    const title = decodeEntities(m[1]);
    let path = m[2].replace(/^https?:\/\/(www\.)?noor-book\.com/i, "");
    path = decodeURI(path);
    if (/^\/كتب-/.test(path) || /^\/ebooks-/.test(path)) continue; // صفحات مؤلفين
    if (seen.has(path)) continue;
    seen.add(path);
    const after = html.slice(m.index ?? 0, (m.index ?? 0) + 1500);
    const coverPath = after.match(/covers_cache_jpg\/[^"' )]+/)?.[0];
    out.push({
      title: title || titleFromPath(path),
      url: BASE + encodeURI(path),
      cover: coverPath ? `${BASE}/publice/${coverPath}` : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchLatestBooks(limit = 40) {
  const s = new Session();
  try {
    await login(s);
  } catch {
    // صفحة أحدث الكتب عامة، نكمل بدون تسجيل دخول عند الفشل
  }
  const listUrl = `${BASE}/latest?landing=false`;
  const res = await s.get(listUrl);
  const status = res.status;
  const html = res.ok ? await res.text() : "";
  const csrf = html.match(/csrf_token\s*=\s*'([^']+)'/i)?.[1] ?? "";

  const seen = new Set<string>();
  const books: { title: string; url: string; cover: string | null }[] = [];
  const push = (list: { title: string; url: string; cover: string | null }[]) => {
    for (const b of list) {
      if (seen.has(b.url)) continue;
      seen.add(b.url);
      books.push(b);
      if (books.length >= limit) break;
    }
  };

  const parse = (h: string) => {
    const cards = extractLatestCards(h, limit);
    return cards.length ? cards : extractBookCards(h, limit);
  };

  if (html) push(parse(html));

  // التمرير اللانهائي في نور بوك: page_ajax=2,3,... مع نفس الجلسة والتوكن
  let page = 1;
  while (books.length < limit && page < 30 && Date.now() - startedAt < MAX_MS - 15_000) {
    page++;
    const more = await s.get(
      `${listUrl}&page_ajax=${page}&token=${encodeURIComponent(csrf)}&ls=null`,
      listUrl,
    );
    if (!more.ok) break;
    const chunk = await more.text();
    if (!chunk.trim() || chunk.trim() === "no_more") break;
    const parsed = parse(chunk);
    if (!parsed.length) break;
    const before = books.length;
    push(parsed);
    if (books.length === before) break; // لا جديد
  }

  return { success: true, status, count: books.length, pages: page, books };
}



// ---------- نشر تقييم + مراجعة على كتاب في نور بوك ----------
async function postReview(bookUrl: string, rating: number, text: string, session?: Session) {
  const s = session ?? new Session();
  if (!session) await login(s);


  const raw = bookUrl.startsWith("http") ? bookUrl : `${BASE}${bookUrl.startsWith("/") ? "" : "/"}${bookUrl}`;
  const path = raw.replace(/^https?:\/\/(www\.)?noor-book\.com/i, "").replace(/^\/en/, "");
  const variants = [
    `${BASE}${path}`,
    `${BASE}/en${path}`,
    `${BASE}${encodeURI(decodeURI(path))}`,
    `${BASE}/en${encodeURI(decodeURI(path))}`,
  ];
  let html = "";
  let url = variants[0];
  const tried: number[] = [];
  for (const v of variants) {
    const res = await s.get(v);
    tried.push(res.status);
    const t = res.ok ? await res.text() : "";
    if (res.ok && /book_hash\s*=\s*'/.test(t)) {
      html = t;
      url = v;
      break;
    }
  }
  if (!html) throw new Error(`تعذّر فتح صفحة الكتاب (${tried.join(",")})`);


  const bookHash = html.match(/book_hash\s*=\s*'([a-f0-9]{16,})'/i)?.[1];
  const csrf = html.match(/csrf_token\s*=\s*'([^']+)'/i)?.[1];
  if (!bookHash || !csrf) throw new Error("تعذّر استخراج بيانات الكتاب (book_hash / csrf)");

  const title = decodeEntities(html.match(/<h1[^>]*>([\s\S]{1,200}?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "");
  const num = Math.min(5, Math.max(1, Math.round(rating)));
  const content = (text ?? "").trim();

  const send = async (isText: 0 | 1, reviewContent: string) =>
    await s.post(
      `${BASE}/en/rating/add?_=${uid()}`,
      { review_content: reviewContent, rating_num: String(num), is_text: String(isText), book_hash: bookHash, csrf_token: csrf },
      url,
    );

  // 1) النجوم أولاً (is_text=0) ثم نص المراجعة (is_text=1) كما يفعل الموقع
  const r1 = await send(0, "");
  const t1 = await r1.text();
  let t2 = "";
  if (content) {
    const r2 = await send(1, content);
    t2 = await r2.text();
  }

  const parse = (t: string) => {
    try { return JSON.parse(t); } catch { return { raw: t.slice(0, 200) }; }
  };
  const j1 = parse(t1);
  const j2 = content ? parse(t2) : null;
  const ok = (j: any) => j && j.msg === "logged_in" && !j.err;

  if (!ok(j1)) throw new Error(`فشل إرسال التقييم: ${JSON.stringify(j1).slice(0, 200)}`);
  if (content && !ok(j2)) throw new Error(`فشل إرسال المراجعة: ${JSON.stringify(j2).slice(0, 200)}`);

  return {
    success: true,
    book: { title, url },
    rating: num,
    review: content || null,
    result: { rating: j1, review: j2 },
  };
}

// ---------- معالجة طابور التقييمات على الخادم (يعمل حتى والمستخدم خارج الموقع) ----------
async function processReviewQueue(supabase: any, max = 12) {
  const { data: rows, error } = await supabase
    .from("noor_review_queue")
    .select("*")
    .eq("status", "pending")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(max);
  if (error) throw new Error(error.message);
  const list = rows || [];
  if (!list.length) return { success: true, processed: 0, ok: 0, failed: 0, message: "لا توجد كتب بانتظار التقييم" };

  const s = new Session();
  await login(s);

  let ok = 0;
  let failed = 0;
  for (const row of list) {
    if (Date.now() - startedAt > MAX_MS - 20_000) break;
    await supabase
      .from("noor_review_queue")
      .update({ status: "running", error: null, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    try {
      await postReview(row.book_url, row.rating, row.review_text || "", s);
      await supabase
        .from("noor_review_queue")
        .update({ status: "done", error: null, posted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", row.id);
      ok++;
    } catch (e) {
      await supabase
        .from("noor_review_queue")
        .update({
          status: "error",
          error: (e instanceof Error ? e.message : "خطأ غير متوقع").slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      failed++;
    }
    // فاصل زمني لتجنّب الحظر
    await new Promise((res) => setTimeout(res, 4000));
  }
  return { success: true, processed: ok + failed, ok, failed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  startedAt = started;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const finish = async (patch: Record<string, unknown>, payload: Record<string, unknown>, status = 200) => {
    await supabase.from("noor_discover_config").update({ ...patch, last_run_at: new Date().toISOString() }).eq("id", 1);
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const body = await req.json().catch(() => ({}));
    const manual = body?.manual === true;

    // وضع «معالجة طابور التقييمات» — يُستدعى من الواجهة أو من cron
    if (body?.processQueue === true) {
      try {
        const max = Math.min(20, Math.max(1, Number(body?.max ?? 12)));
        return new Response(JSON.stringify(await processReviewQueue(supabase, max)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: e instanceof Error ? e.message : "خطأ غير متوقع" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // وضع «سحب أحدث الكتب» من صفحة /latest
    if (body?.latest === true) {
      try {
        const limit = Math.min(300, Math.max(1, Number(body?.limit ?? 40)));

        return new Response(JSON.stringify(await fetchLatestBooks(limit)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: e instanceof Error ? e.message : "خطأ غير متوقع" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // وضع «نظرة داخل الحساب» — لا يضيف أي كتاب، فقط يعرض ما يظهر في الحساب
    if (body?.peek === true) {
      try {
        return new Response(JSON.stringify(await peekAccount()), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: e instanceof Error ? e.message : "خطأ غير متوقع" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // وضع «نشر تقييم ومراجعة» على كتاب محدد
    if (body?.review === true) {
      try {
        const bookUrl = String(body?.bookUrl ?? "").trim();
        const rating = Number(body?.rating ?? 5);
        const text = String(body?.text ?? "").slice(0, 3000);
        if (!bookUrl || !/^https?:\/\/(www\.)?noor-book\.com\//i.test(bookUrl)) {
          throw new Error("رابط كتاب نور بوك غير صالح");
        }
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("التقييم يجب أن يكون بين 1 و 5");
        return new Response(JSON.stringify(await postReview(bookUrl, rating, text)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: e instanceof Error ? e.message : "خطأ غير متوقع" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }



    const { data: cfg } = await supabase.from("noor_discover_config").select("*").eq("id", 1).maybeSingle();
    if (!cfg) throw new Error("إعدادات نور بوك غير موجودة");
    if (!cfg.enabled && !manual) {
      return new Response(JSON.stringify({ skipped: true, reason: "متوقف" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: pending } = await supabase
      .from("bulk_upload_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"]);
    if ((pending || 0) >= cfg.max_pending) {
      return await finish(
        { last_status: `تخطٍّ: الطابور ممتلئ (${pending})` },
        { skipped: true, reason: `الطابور ممتلئ (${pending})` },
      );
    }

    const queries: string[] = Array.isArray(cfg.search_queries) ? cfg.search_queries : [];
    if (queries.length === 0) throw new Error("لا توجد تصنيفات مضبوطة");

    const s = new Session();
    await login(s);

    let qIndex = cfg.current_query_index % queries.length;
    let page = Math.max(1, cfg.page_cursor);
    const query = queries[qIndex];

    let paths = await listBooks(s, query, page);
    if (paths.length === 0) {
      qIndex = (qIndex + 1) % queries.length;
      page = 1;
      paths = await listBooks(s, queries[qIndex], page);
    }

    let inserted = 0;
    let scanned = 0;
    const errors: string[] = [];

    for (const path of paths) {
      if (inserted >= cfg.batch_size || Date.now() - started > MAX_MS) break;
      scanned++;
      try {
        const book = await resolveBook(s, path);

        const { data: existingQueue } = await supabase
          .from("bulk_upload_queue")
          .select("id")
          .ilike("title", book.title)
          .limit(1);
        if (existingQueue && existingQueue.length) continue;

        const { data: existingBook } = await supabase
          .from("approved_books")
          .select("id")
          .ilike("title", book.title)
          .limit(1);
        if (existingBook && existingBook.length) continue;

        // روابط نور بوك مرتبطة بالجلسة ومؤقتة، لذا ننزّل الملف الآن ونخزّنه لدينا
        const storedUrl = await mirrorPdf(s, supabase, book);
        const storedCover = book.cover ? await mirrorImage(s, supabase, book.cover, book.sourceUrl) : null;
        const storedAuthorImage = book.authorImage
          ? await mirrorImage(s, supabase, book.authorImage, book.sourceUrl, "noor-authors")
          : null;

        const { error: insErr } = await supabase.from("bulk_upload_queue").insert({
          title: book.title,
          book_file_url: storedUrl,
          cover_image_url: storedCover,
          source_author: book.author,
          source_description: book.description,
          source_author_bio: book.authorBio,
          source_author_image_url: storedAuthorImage,
          batch_label: "noor-auto",
          created_by_email: "noor-auto@kotobi",
        });
        if (insErr) throw new Error(insErr.message);
        inserted++;
      } catch (e) {
        errors.push(`${path}: ${e instanceof Error ? e.message : e}`);
      }
    }

    // تقدّم المؤشر: صفحة تالية، وعند نفاد النتائج انتقل للتصنيف التالي
    let nextPage = page + 1;
    let nextIndex = qIndex;
    if (paths.length === 0 || nextPage > 12) {
      nextIndex = (qIndex + 1) % queries.length;
      nextPage = 1;
    }

    return await finish(
      {
        current_query_index: nextIndex,
        page_cursor: nextPage,
        total_discovered: (cfg.total_discovered || 0) + inserted,
        last_status: `«${query}» صفحة ${page}: أُضيف ${inserted} من ${scanned}`,
        last_error: errors.length ? errors.slice(0, 3).join(" | ").slice(0, 500) : null,
      },
      { success: true, query, page, scanned, inserted, errors: errors.slice(0, 5) },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ غير متوقع";
    await supabase
      .from("noor_discover_config")
      .update({ last_error: msg, last_status: "فشل", last_run_at: new Date().toISOString() })
      .eq("id", 1);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
