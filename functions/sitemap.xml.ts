// Cloudflare Pages Function — Sitemap index (/sitemap.xml)
// Small file that points to chunked child sitemaps, so it always loads instantly.
import { SITE, buildIndex, renderIndex, xmlResponse } from './_sitemap';

export const onRequest = async () => {
  try {
    return xmlResponse(await buildIndex(), 900);
  } catch {
    return xmlResponse(renderIndex([{ loc: `${SITE}/sitemaps/pages.xml` }]), 300);
  }
};
