// Runs before `vite dev` and `vite build`; writes public/static-sitemap.xml (fallback only).
// The live /sitemap.xml is a Cloudflare Pages Function (functions/sitemap.xml.ts) that
// returns a sitemap index pointing to chunked child sitemaps.

import { writeFileSync } from "fs"
import { resolve } from "path"

const BASE_URL = "https://kotobi.xyz"

interface SitemapEntry {
  path: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/categories", changefreq: "weekly", priority: "0.9" },
  { path: "/authors", changefreq: "weekly", priority: "0.9" },
  { path: "/quotes", changefreq: "weekly", priority: "0.8" },
  { path: "/search", changefreq: "weekly", priority: "0.6" },
  { path: "/upload-book", changefreq: "monthly", priority: "0.6" },
  { path: "/reading-clubs", changefreq: "weekly", priority: "0.7" },
  { path: "/leaderboard", changefreq: "weekly", priority: "0.6" },
  { path: "/rewards", changefreq: "monthly", priority: "0.5" },
  { path: "/shop", changefreq: "monthly", priority: "0.5" },
  { path: "/suggestions", changefreq: "monthly", priority: "0.5" },
  { path: "/cover-designer", changefreq: "monthly", priority: "0.5" },
  { path: "/site-updates", changefreq: "weekly", priority: "0.5" },
  { path: "/donation", changefreq: "monthly", priority: "0.5" },
  { path: "/about-us", changefreq: "yearly", priority: "0.4" },
  { path: "/contact-us", changefreq: "yearly", priority: "0.4" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
]

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n")
}

writeFileSync(resolve("public/static-sitemap.xml"), generateSitemap(entries))
console.log(`static-sitemap.xml written (${entries.length} entries)`)
