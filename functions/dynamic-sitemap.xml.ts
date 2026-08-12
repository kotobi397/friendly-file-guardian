// Cloudflare Pages Function — legacy /dynamic-sitemap.xml
// Previously returned every URL in one huge file (slow / unbrowsable).
// Now it serves the lightweight sitemap index instead.
import { SITE, buildIndex, renderIndex, xmlResponse } from './_sitemap';

export const onRequest = async () => {
  try {
    return xmlResponse(await buildIndex(), 900);
  } catch {
    return xmlResponse(renderIndex([{ loc: `${SITE}/sitemaps/pages.xml` }]), 300);
  }
};
