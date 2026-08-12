// Cloudflare Pages Function — Public member profile SEO prerender
// Route: /user/*
// Gives crawlers a fully-rendered head (title, description, canonical, JSON-LD)
// so member profiles get indexed without relying on client-side JS.

const SUPABASE_URL = 'https://kydmyxsgyxeubhmqzrgo.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZG15eHNneXhldWJobXF6cmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODQ3NjQsImV4cCI6MjA2MjA2MDc2NH0.b-ckDfOmmf2x__FG5Snm9px8j4pqPke5Ra1RgoGEqP0';
const SITE = 'https://kotobi.xyz';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function encodePathSegment(value: string) {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

async function fetchProfile(identifier: string) {
  const queries = [
    `username=eq.${encodeURIComponent(identifier)}`,
    `id=eq.${encodeURIComponent(identifier)}`,
  ];
  for (const q of queries) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,username,bio,avatar_url,country_name,author_slug,followers_count,created_at&${q}&limit=1`,
        { headers, signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) continue;
      const rows = await res.json();
      if (rows?.length) return rows[0];
    } catch (_) {}
  }
  return null;
}

export const onRequest = async (context: any) => {
  const { request, next } = context;
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';

  const isCrawler =
    /googlebot|google-inspectiontool|bingbot|yandexbot|duckduckbot|baiduspider|applebot|petalbot|seznambot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discord|slack/i.test(
      ua
    );
  if (!isCrawler) return next();

  try {
    const parts = url.pathname.split('/').filter(Boolean);
    let identifier = parts[parts.length - 1] || '';
    try {
      identifier = decodeURIComponent(identifier);
    } catch (_) {}
    if (!identifier) return next();

    const profile = await fetchProfile(identifier);
    if (!profile || !profile.username) return next();

    // Profiles that own books live at /author/... — send crawlers to the canonical page.
    if (profile.author_slug && String(profile.author_slug).trim()) {
      return Response.redirect(
        `${SITE}/author/${encodePathSegment(String(profile.author_slug).trim())}`,
        301
      );
    }

    const canonical = `${SITE}/user/${encodePathSegment(profile.username)}`;
    const title = `${profile.username} - ملف القارئ | منصة كتبي`;
    const bio = (profile.bio || '').trim();
    const description = bio
      ? bio.length > 155
        ? bio.slice(0, 155) + '…'
        : bio
      : `تعرّف على ${profile.username} على منصة كتبي: مكتبته، مراجعاته واقتباساته المفضلة.`;
    const image = profile.avatar_url || `${SITE}/default-author-avatar.png`;

    const response = await next();
    if (!(response.headers.get('content-type') || '').includes('text/html')) return response;
    let html = await response.text();

    const upsert = (attr: 'name' | 'property', key: string, content: string) => {
      const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}">`;
      const re = new RegExp(`<meta[^>]*\\s${attr}=["']${key}["'][^>]*>`, 'i');
      html = re.test(html) ? html.replace(re, tag) : html.replace('</head>', `${tag}\n</head>`);
    };

    html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
    upsert('name', 'description', description);
    upsert('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large');
    upsert('property', 'og:title', title);
    upsert('property', 'og:description', description);
    upsert('property', 'og:image', image);
    upsert('property', 'og:url', canonical);
    upsert('property', 'og:type', 'profile');
    upsert('name', 'twitter:card', 'summary');

    const canonicalRe = /<link[^>]*\srel=["']canonical["'][^>]*>/i;
    const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}">`;
    html = canonicalRe.test(html)
      ? html.replace(canonicalRe, canonicalTag)
      : html.replace('</head>', `${canonicalTag}\n</head>`);

    const schema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      url: canonical,
      mainEntity: {
        '@type': 'Person',
        name: profile.username,
        description,
        url: canonical,
        image,
        ...(profile.country_name ? { nationality: profile.country_name } : {}),
      },
    });
    html = html.replace('</head>', `<script type="application/ld+json">${schema}</script>\n</head>`);

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
    });
  } catch (error) {
    console.error('user prerender error', error);
    return next();
  }
};
