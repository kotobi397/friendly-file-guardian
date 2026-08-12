// وحدة مشتركة لصفحات الهبوط المولّدة تلقائياً لكل كتاب
// تُستخدم من: functions/tahmil, functions/qiraa, functions/molakhas
// (الملفات التي تبدأ بـ _ لا تُعامل كمسارات في Cloudflare Pages)

import { buildLandingMeta, type LandingVariantKey } from '../src/utils/landingPages';

const SUPABASE_URL = 'https://kydmyxsgyxeubhmqzrgo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0';

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchBook(identifier: string) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
  const fields =
    'id,title,author,description,cover_image_url,category,slug,publication_year,language,page_count,publisher';

  let res = await fetch(
    `${SUPABASE_URL}/rest/v1/book_submissions?select=${fields}&status=eq.approved&slug=eq.${encodeURIComponent(identifier)}&limit=1`,
    { headers, signal: AbortSignal.timeout(6000) }
  );
  let books = await res.json();

  if (!books?.length) {
    res = await fetch(
      `${SUPABASE_URL}/rest/v1/book_submissions?select=${fields}&status=eq.approved&id=eq.${encodeURIComponent(identifier)}&limit=1`,
      { headers, signal: AbortSignal.timeout(6000) }
    ).catch(() => null as any);
    books = res ? await res.json().catch(() => []) : [];
  }

  return books?.[0] || null;
}

const CRAWLER_RE =
  /googlebot|google-inspectiontool|bingbot|yandexbot|duckduckbot|baiduspider|applebot|sogou|exabot|ia_archiver|ahrefsbot|semrushbot|mj12bot|petalbot|seznambot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discord|slack|pinterest|redditbot/i;

export function createLandingHandler(variant: LandingVariantKey) {
  return async (context: any) => {
    const { request, next } = context;
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    const isCrawler = CRAWLER_RE.test(userAgent) || url.searchParams.has('_prerender');

    if (!isCrawler) return next();

    try {
      const parts = url.pathname.split('/').filter(Boolean);
      let identifier = parts[parts.length - 1] || '';
      try {
        identifier = decodeURIComponent(identifier);
      } catch (_) {}
      if (!identifier) return next();

      const book = await fetchBook(identifier);
      if (!book) return next();

      const meta = buildLandingMeta(variant, {
        title: book.title,
        author: book.author,
        description: book.description,
        category: book.category,
        slug: book.slug || book.id,
        pageCount: book.page_count,
        language: book.language,
        year: book.publication_year,
      });

      const image = book.cover_image_url || 'https://kotobi.xyz/kotobi-icon-2026.png';
      const faqHtml = meta.faq
        .map((f) => `<h3>${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p>`)
        .join('\n');

      const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
<meta name="keywords" content="${escapeHtml(meta.keywords)}">
<meta name="author" content="${escapeHtml(book.author || '')}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="${escapeHtml(meta.canonical)}">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(meta.canonical)}">
<meta property="og:type" content="book">
<meta property="og:site_name" content="منصة كتبي">
<meta property="og:locale" content="ar_AR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<script type="application/ld+json">${JSON.stringify(meta.structuredData)}</script>
</head>
<body>
<h1>${escapeHtml(meta.h1)}</h1>
<p>تأليف: ${escapeHtml(book.author || '')}</p>
<img src="${escapeHtml(image)}" alt="${escapeHtml(meta.h1)}" width="300">
<p>${escapeHtml(meta.intro)}</p>
${book.description ? `<p>${escapeHtml(String(book.description).slice(0, 900))}</p>` : ''}
<ul>
${book.category ? `<li>التصنيف: ${escapeHtml(book.category)}</li>` : ''}
${book.page_count ? `<li>عدد الصفحات: ${escapeHtml(book.page_count)}</li>` : ''}
${book.language ? `<li>اللغة: ${escapeHtml(book.language)}</li>` : ''}
${book.publication_year ? `<li>سنة النشر: ${escapeHtml(book.publication_year)}</li>` : ''}
${book.publisher ? `<li>الناشر: ${escapeHtml(book.publisher)}</li>` : ''}
<li>السعر: مجاناً</li>
</ul>
<h2>أسئلة شائعة</h2>
${faqHtml}
<h2>روابط ذات صلة</h2>
<ul>
<li><a href="${escapeHtml(meta.bookUrl)}">صفحة الكتاب الكاملة</a></li>
${book.category ? `<li><a href="https://kotobi.xyz/category/${encodeURIComponent(book.category)}">المزيد من كتب ${escapeHtml(book.category)}</a></li>` : ''}
</ul>
</body>
</html>`;

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=600',
        },
      });
    } catch (error) {
      console.error('landing prerender error:', error);
      return next();
    }
  };
}
