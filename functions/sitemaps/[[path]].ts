// Cloudflare Pages Function — child sitemaps
// Routes: /sitemaps/pages.xml, /sitemaps/books-1.xml, /sitemaps/authors-1.xml, ...
import { buildChild, renderUrlset, xmlResponse } from '../_sitemap';

export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);
  const file = url.pathname.split('/').pop() || '';
  const name = file.replace(/\.xml$/i, '');

  const match = name.match(/^([a-z]+)(?:-(\d+))?$/i);
  if (!match) return xmlResponse(renderUrlset([]), 300);

  const type = match[1].toLowerCase();
  const page = Math.max(1, parseInt(match[2] || '1', 10));

  try {
    const body = await buildChild(type, page);
    if (!body) return new Response('Not found', { status: 404 });
    return xmlResponse(body, type === 'pages' ? 86400 : type === 'latest' ? 600 : 3600);
  } catch {
    return xmlResponse(renderUrlset([]), 300);
  }
};
