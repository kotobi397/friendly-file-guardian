// Cloudflare Pages Function — Book share meta middleware
// Route: /book/*  (passes through normal users, prerenders for crawlers)

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchBookData(bookId: string) {
  const supabaseUrl = 'https://kydmyxsgyxeubhmqzrgo.supabase.co';
  const supabaseKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0';
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };
  const fields =
    'id,title,author,description,cover_image_url,category,slug,publication_year,language,page_count';

  const query = async (filter: string) => {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/book_submissions?select=${fields}&status=eq.approved&${filter}&limit=1`,
        { headers, signal: AbortSignal.timeout(6000) }
      );
      const rows = await res.json();
      return Array.isArray(rows) && rows.length ? rows[0] : null;
    } catch (_) {
      return null;
    }
  };

  // 1) Exact slug match.
  let book = await query(`slug=eq.${encodeURIComponent(bookId)}`);
  if (book) return book;

  // 2) UUID match (legacy /book/<uuid> links).
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookId)) {
    book = await query(`id=eq.${bookId}`);
    if (book) return book;
  }

  // 3) Legacy URLs carry extra trailing segments (author name + random suffix),
  //    e.g. "<slug>-<author>-mpf1s0qa-dz64hw". Strip them one by one and match
  //    on the slug prefix so the real book is still found (and later 301'd).
  const parts = bookId.split('-').filter(Boolean);
  for (let end = parts.length - 1; end >= 2; end--) {
    const candidate = parts.slice(0, end).join('-');
    book = await query(`slug=eq.${encodeURIComponent(candidate)}`);
    if (book) return book;
    book = await query(`slug=ilike.${encodeURIComponent(candidate)}*`);
    if (book) return book;
  }

  return null;

}

function encodePathSegment(value: string) {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

function buildBookMeta(book: any) {
  const baseUrl = 'https://kotobi.xyz';
  const slug = encodePathSegment(book.slug || book.id);
  const bookUrl = `${baseUrl}/book/${slug}`;
  const imageUrl = book.cover_image_url || `${baseUrl}/kotobi-icon-2026.png`;

  const rawDesc =
    book.description?.length > 0
      ? book.description.substring(0, 200)
      : `كتاب ${book.title} للمؤلف ${book.author} - اقرأ وحمّل مجاناً من منصة كتبي`;

  return {
    title: `${book.title} - ${book.author} | منصة كتبي`,
    description: rawDesc,
    imageUrl,
    bookUrl,
    category: book.category || '',
    author: book.author,
    bookTitle: book.title,
    language: book.language || 'ar',
    pageCount: book.page_count,
    publicationYear: book.publication_year,
  };
}

function injectMetaIntoHtml(html: string, meta: ReturnType<typeof buildBookMeta>): string {
  const safeTitle = escapeHtml(meta.title);
  const safeUrl = escapeHtml(meta.bookUrl);

  const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
    const safe = escapeHtml(content);
    const re = new RegExp(`<meta[^>]*\\s${attr}=["']${key}["'][^>]*>`, 'i');
    const tag = `<meta ${attr}="${key}" content="${safe}">`;
    if (re.test(html)) {
      html = html.replace(re, tag);
    } else {
      html = html.replace('</head>', `${tag}\n</head>`);
    }
  };

  const titleRe = /<title[^>]*>[\s\S]*?<\/title>/i;
  if (titleRe.test(html)) {
    html = html.replace(titleRe, `<title>${safeTitle}</title>`);
  } else {
    html = html.replace('</head>', `<title>${safeTitle}</title>\n</head>`);
  }

  let firstTitleSeen = false;
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, (match) => {
    if (firstTitleSeen) return '';
    firstTitleSeen = true;
    return match;
  });

  upsertMeta('name', 'description', meta.description);
  upsertMeta(
    'name',
    'keywords',
    `${meta.category}, ${meta.author}, ${meta.bookTitle}, كتب عربية مجانية, تحميل كتب PDF`
  );
  upsertMeta('name', 'author', meta.author);
  upsertMeta('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large');

  const canonicalRe = /<link[^>]*\srel=["']canonical["'][^>]*>/i;
  const canonicalTag = `<link rel="canonical" href="${safeUrl}">`;
  html = canonicalRe.test(html)
    ? html.replace(canonicalRe, canonicalTag)
    : html.replace('</head>', `${canonicalTag}\n</head>`);

  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('property', 'og:description', meta.description);
  upsertMeta('property', 'og:image', meta.imageUrl);
  upsertMeta('property', 'og:url', meta.bookUrl);
  upsertMeta('property', 'og:type', 'book');
  upsertMeta('property', 'og:site_name', 'منصة كتبي');
  upsertMeta('property', 'og:locale', 'ar_AR');

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', meta.title);
  upsertMeta('name', 'twitter:description', meta.description);
  upsertMeta('name', 'twitter:image', meta.imageUrl);

  const bookSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: meta.bookTitle,
    author: { '@type': 'Person', name: meta.author },
    description: meta.description,
    url: meta.bookUrl,
    image: meta.imageUrl,
    genre: meta.category,
    inLanguage: meta.language,
    ...(meta.pageCount ? { numberOfPages: meta.pageCount } : {}),
    ...(meta.publicationYear ? { datePublished: String(meta.publicationYear) } : {}),
    publisher: { '@type': 'Organization', name: 'منصة كتبي' },
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  });

  html = html.replace(
    '</head>',
    `<script type="application/ld+json">${bookSchema}</script>\n</head>`
  );

  return html;
}

export const onRequest = async (context: any) => {
  const { request, next } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  const isSocialCrawler =
    /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discord|slack|facebot|WhatsApp|Pinterest|redditbot|TelegramBot|vkShare|W3C_Validator/i.test(
      userAgent
    );
  const isViewSource = url.pathname.endsWith('/view-source') || url.searchParams.has('view-source');
  const isSearchEngine =
    /googlebot|google-inspectiontool|bingbot|yandexbot|duckduckbot|baiduspider|applebot|sogou|exabot|ia_archiver|ahrefsbot|semrushbot|mj12bot|petalbot|seznambot/i.test(
      userAgent
    );
  const forcePrerender = url.searchParams.has('_prerender');

  if (!isSocialCrawler && !isViewSource && !isSearchEngine && !forcePrerender) {
    return next();
  }

  try {
    const pathParts = url.pathname.split('/').filter(Boolean);
    let bookId = pathParts[pathParts.length - 1];
    if (bookId === 'view-source' || bookId === 'viez-source') {
      bookId = pathParts[pathParts.length - 2] || '';
    }
    try {
      bookId = decodeURIComponent(bookId);
    } catch (_) {}

    if (!bookId) return next();

    const book = await fetchBookData(bookId);

    // Unknown book: return a real 404 to crawlers instead of a 200 soft-404,
    // so Google drops the URL instead of reporting a duplicate/blocked page.
    if (!book) {
      if (isSearchEngine) {
        const missing = await next();
        const missingHtml = await missing.text();
        return new Response(missingHtml, {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex, follow',
            'Cache-Control': 'no-store',
          },
        });
      }
      return next();
    }

    // Legacy / mistyped slug -> permanent redirect to the canonical book URL.
    const canonicalSlug = String(book.slug || book.id);
    if (bookId !== canonicalSlug && !isViewSource) {
      return new Response(null, {
        status: 301,
        headers: {
          Location: `/book/${encodePathSegment(canonicalSlug)}`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const meta = buildBookMeta(book);


    if (isSearchEngine) {
      const response = await next();
      const originalHtml = await response.text();
      const modifiedHtml = injectMetaIntoHtml(originalHtml, meta);

      return new Response(modifiedHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    const safeTitle = escapeHtml(meta.title);
    const safeDesc = escapeHtml(meta.description);
    const safeImage = escapeHtml(meta.imageUrl);
    const safeUrl = escapeHtml(meta.bookUrl);
    const safeAuthor = escapeHtml(meta.author);
    const safeBookTitle = escapeHtml(meta.bookTitle);
    const safeCategory = escapeHtml(meta.category);

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="canonical" href="${safeUrl}">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="author" content="${safeAuthor}">
  <meta name="keywords" content="${safeCategory}, كتب عربية, قراءة مجانية, ${safeAuthor}, ${safeBookTitle}">
  <meta property="og:title" content="${safeBookTitle} - ${safeAuthor}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="800">
  <meta property="og:image:alt" content="غلاف كتاب ${safeBookTitle}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:type" content="book">
  <meta property="og:site_name" content="منصة كتبي">
  <meta property="og:locale" content="ar_AR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeBookTitle} - ${safeAuthor}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
</head>
<body>
  <h1>${safeBookTitle}</h1>
  <p>تأليف: ${safeAuthor}</p>
  <p>${safeDesc}</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error in book share meta:', error);
    return next();
  }
};
