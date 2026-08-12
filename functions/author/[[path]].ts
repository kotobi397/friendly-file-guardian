// Cloudflare Pages Function — Author share meta middleware
// Route: /author/*

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchAuthorData(authorParam: string) {
  const supabaseUrl = 'https://kydmyxsgyxeubhmqzrgo.supabase.co';
  const supabaseKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0';
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  let res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_complete_author_data`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ p_author_name: authorParam }),
    signal: AbortSignal.timeout(6000),
  });

  if (res.ok) {
    const data = await res.json();
    if (data?.length) {
      const r = data[0];
      return {
        name: r.author_name || r.name,
        bio: r.profile_bio || r.bio,
        avatar_url: r.profile_avatar || r.avatar_url,
        books_count: r.books_count,
        followers_count: r.followers_count,
        country_name: r.country_name,
        slug: r.slug,
        website: r.website,
        social_links: r.social_links,
      };
    }
  }

  const searches = [
    `slug=eq.${encodeURIComponent(authorParam)}`,
    `name=eq.${encodeURIComponent(authorParam)}`,
    `name=ilike.${encodeURIComponent(authorParam.replace(/-/g, ' '))}`,
  ];

  for (const q of searches) {
    res = await fetch(`${supabaseUrl}/rest/v1/authors?select=*&${q}&limit=1`, { headers, signal: AbortSignal.timeout(6000) });
    const authors = await res.json();
    if (authors?.length) return authors[0];
  }

  return null;
}

async function fetchAuthorBooks(authorName: string) {
  const supabaseUrl = 'https://kydmyxsgyxeubhmqzrgo.supabase.co';
  const supabaseKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0';
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/book_submissions?select=title,slug,id&status=eq.approved&author=eq.${encodeURIComponent(authorName)}&limit=30`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (res.ok) return await res.json();
  } catch (_) {}
  return [];
}

/** Exact number of approved books for this author (used in title/description/schema) */
async function countAuthorBooks(authorName: string) {
  const supabaseUrl = 'https://kydmyxsgyxeubhmqzrgo.supabase.co';
  const supabaseKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0';
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/book_submissions?select=id&status=eq.approved&author=eq.${encodeURIComponent(authorName)}&limit=1`,
      {
        method: 'HEAD',
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: 'count=exact' },
        signal: AbortSignal.timeout(6000),
      }
    );
    const total = parseInt((res.headers.get('content-range') || '').split('/')[1] || '0', 10);
    return isNaN(total) ? 0 : total;
  } catch (_) {
    return 0;
  }
}

function encodePathSegment(value: string) {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

function buildAuthorMeta(author: any, authorBooks: any[], booksCount = 0) {
  const baseUrl = 'https://kotobi.xyz';
  const authorUrl = `${baseUrl}/author/${encodePathSegment(author.slug || author.name)}`;
  const imageUrl = author.avatar_url
    ? author.avatar_url.startsWith('http')
      ? author.avatar_url
      : `${baseUrl}${author.avatar_url}`
    : `${baseUrl}/default-author-avatar.png`;

  const count = booksCount || author.books_count || 0;
  const countText = count > 0 ? `${count} كتاب` : 'كتب';
  const bio = author.bio?.trim();
  const base = bio ? bio.replace(/\s+/g, ' ') : '';
  const description = (
    base
      ? `${base} — ${countText} للمؤلف ${author.name} على منصة كتبي، للقراءة والتحميل مجاناً.`
      : `${author.name}: ${countText} متاحة على منصة كتبي. سيرة المؤلف وقائمة أعماله كاملة للقراءة أونلاين والتحميل PDF مجاناً.`
  ).slice(0, 300);

  const bookTitles = authorBooks.map((b: any) => b.title).join('، ');
  const title = count > 0
    ? `${author.name} — ${countText} للتحميل والقراءة | منصة كتبي`
    : `${author.name} - المؤلف | منصة كتبي`;

  return {
    title,
    description,
    imageUrl,
    authorUrl,
    name: author.name,
    booksCount: count,
    books: authorBooks,
    bookTitles,
    country: author.country_name,
  };
}

function injectMetaIntoHtml(html: string, meta: ReturnType<typeof buildAuthorMeta>): string {
  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);
  const safeImage = escapeHtml(meta.imageUrl);
  const safeUrl = escapeHtml(meta.authorUrl);
  const safeName = escapeHtml(meta.name);

  const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
    const safe = escapeHtml(content);
    const re = new RegExp(`<meta[^>]*\\s${attr}=["']${key}["'][^>]*>`, 'i');
    const tag = `<meta ${attr}="${key}" content="${safe}">`;
    html = re.test(html) ? html.replace(re, tag) : html.replace('</head>', `${tag}\n</head>`);
  };

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);
  upsertMeta('name', 'description', meta.description);
  upsertMeta(
    'name',
    'keywords',
    `${safeName}, مؤلف, كتب عربية, منصة كتبي${meta.bookTitles ? ', ' + meta.bookTitles : ''}`
  );
  upsertMeta('name', 'author', meta.name);
  upsertMeta('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large');

  const canonicalRe = /<link[^>]*\srel=["']canonical["'][^>]*>/i;
  const canonicalTag = `<link rel="canonical" href="${safeUrl}">`;
  html = canonicalRe.test(html)
    ? html.replace(canonicalRe, canonicalTag)
    : html.replace('</head>', `${canonicalTag}\n</head>`);

  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('property', 'og:description', meta.description);
  upsertMeta('property', 'og:image', meta.imageUrl);
  upsertMeta('property', 'og:url', meta.authorUrl);
  upsertMeta('property', 'og:type', 'profile');
  upsertMeta('property', 'og:site_name', 'منصة كتبي');
  upsertMeta('property', 'og:locale', 'ar_AR');
  upsertMeta('name', 'twitter:card', 'summary');
  upsertMeta('name', 'twitter:title', meta.title);
  upsertMeta('name', 'twitter:description', meta.description);
  upsertMeta('name', 'twitter:image', meta.imageUrl);

  const personSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: meta.name,
    description: meta.description,
    url: meta.authorUrl,
    image: meta.imageUrl,
    jobTitle: 'مؤلف',
    ...(meta.country ? { nationality: meta.country } : {}),
  });

  const baseUrl = 'https://kotobi.xyz';
  const encodeSeg = (v: string) => {
    try {
      return encodeURIComponent(decodeURIComponent(v));
    } catch {
      return encodeURIComponent(v);
    }
  };
  const booksSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title,
    description: meta.description,
    url: meta.authorUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: meta.booksCount || (meta.books || []).length,
      itemListElement: (meta.books || []).map((b: any, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${baseUrl}/book/${encodeSeg(b.slug || b.id)}`,
        name: b.title,
      })),
    },
  });

  html = html.replace(
    '</head>',
    `<script type="application/ld+json">${personSchema}</script>\n<script type="application/ld+json">${booksSchema}</script>\n</head>`
  );

  return html;
}

export const onRequest = async (context: any) => {
  const { request, next } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  const isSocialCrawler =
    /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discord|slack|facebot|WhatsApp/i.test(
      userAgent
    );
  const isViewSource = url.pathname.endsWith('/view-source') || url.searchParams.has('view-source');
  const isSearchEngine =
    /googlebot|google-inspectiontool|bingbot|yandexbot|duckduckbot|baiduspider|applebot|sogou|exabot|ia_archiver|ahrefsbot|semrushbot|mj12bot|petalbot|seznambot/i.test(
      userAgent
    );

  if (!isSocialCrawler && !isViewSource && !isSearchEngine) {
    return next();
  }

  try {
    const pathParts = url.pathname.split('/').filter(Boolean);
    let authorParam = pathParts[pathParts.length - 1];
    if (authorParam === 'view-source' || authorParam === 'viez-source') {
      authorParam = pathParts[pathParts.length - 2] || '';
    }
    try {
      authorParam = decodeURIComponent(authorParam);
    } catch (_) {}

    if (!authorParam) return next();

    const author = await fetchAuthorData(authorParam);
    if (!author) return next();

    const [authorBooks, booksCount] = await Promise.all([
      fetchAuthorBooks(author.name),
      countAuthorBooks(author.name),
    ]);
    const meta = buildAuthorMeta(author, authorBooks, booksCount);

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
    const safeUrl = escapeHtml(meta.authorUrl);
    const safeName = escapeHtml(meta.name);

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="canonical" href="${safeUrl}">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="author" content="${safeName}">
  <meta property="og:title" content="${safeName} - مؤلف عربي">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="منصة كتبي">
  <meta property="og:locale" content="ar_AR">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${safeName} - مؤلف عربي">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
</head>
<body>
  <h1>${safeName}</h1>
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
    console.error('Error in author share meta:', error);
    return next();
  }
};
