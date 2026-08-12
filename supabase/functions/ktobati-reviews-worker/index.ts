import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

const GATEWAY = 'https://connector-gateway.lovable.dev/firecrawl/v2/scrape';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY') || '';
const KTOBATI_EMAIL = Deno.env.get('KTOBATI_EMAIL') || '';
const KTOBATI_PASSWORD = Deno.env.get('KTOBATI_PASSWORD') || '';

const SECTION_URL = 'https://www.ktobati.com/section/%D8%B1%D9%88%D8%A7%D9%8A%D8%A7%D8%AA?sort_by=created';

interface Book { title: string; url: string; cover: string | null }

async function firecrawl(body: Record<string, unknown>) {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': FIRECRAWL_API_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Firecrawl [${res.status}]: ${text.slice(0, 500)}`);
  const json = JSON.parse(text);
  if (!json.success) throw new Error(json.error || 'Firecrawl request failed');
  return json.data || {};
}

// استخراج الكتب من بيانات JSON-LD في صفحة القسم
function parseBooks(html: string): Book[] {
  const out: Book[] = [];
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  for (const block of blocks) {
    const raw = block.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
    try {
      const data = JSON.parse(raw);
      const items = data?.mainEntity?.itemListElement;
      if (!Array.isArray(items)) continue;
      for (const el of items) {
        const item = el?.item;
        if (!item?.url) continue;
        out.push({ title: item.name || item.url, url: item.url, cover: item.image || null });
      }
    } catch (_) { /* تجاهل الكتل غير الصالحة */ }
  }
  return out;
}

async function fetchLatestBooks(limit: number) {
  const books: Book[] = [];
  const seen = new Set<string>();
  let pages = 0;
  for (let page = 0; page < 20 && books.length < limit; page++) {
    const url = page === 0 ? SECTION_URL : `${SECTION_URL}&page=${page}`;
    const data = await firecrawl({ url, formats: ['rawHtml'], onlyMainContent: false, waitFor: 4000 });
    pages++;
    const found = parseBooks(data.rawHtml || '');
    if (!found.length) break;
    let added = 0;
    for (const b of found) {
      if (seen.has(b.url)) continue;
      seen.add(b.url);
      books.push(b);
      added++;
      if (books.length >= limit) break;
    }
    if (!added) break;
  }
  return { books, pages };
}

const loginScript = () =>
  `(function(){var t=[].slice.call(document.querySelectorAll('button,a,div,span'))` +
  `.filter(function(e){return (e.textContent||'').trim().indexOf('دخول عبر الإيميل')>-1;});` +
  `if(t.length)t[t.length-1].click();` +
  `var n=document.querySelector('#edit-name'),p=document.querySelector('#edit-pass');` +
  `if(!n||!p)return 'noform';n.value=${JSON.stringify(KTOBATI_EMAIL)};p.value=${JSON.stringify(KTOBATI_PASSWORD)};` +
  `document.querySelector('#edit-submit').click();return 'submitted';})()`;

const starScript = (rating: number) =>
  `(function(){try{if(window.jQuery)jQuery('#reviewsModal').modal('show');}catch(e){}` +
  `var s=document.querySelector('#stars a[data-rat="${rating}"]');if(s)s.click();return s?'star':'nostar';})()`;

const postScript = (text: string) =>
  `(function(){var t=document.querySelector('#edit-comment');if(!t)return 'noform';` +
  `t.value=${JSON.stringify(text)};t.dispatchEvent(new Event('input',{bubbles:true}));` +
  `t.dispatchEvent(new Event('change',{bubbles:true}));` +
  `var b=document.querySelector('#reviews-form input[type=submit]');if(!b)return 'nobtn';b.click();return 'sent';})()`;

// تسجيل الدخول ثم نشر التقييم والتعليق على كتاب واحد (جلسة واحدة)
async function postReview(bookUrl: string, rating: number, text: string) {
  if (!KTOBATI_EMAIL || !KTOBATI_PASSWORD) throw new Error('بيانات الدخول إلى كتوباتي غير مضبوطة');
  const data = await firecrawl({
    url: 'https://www.ktobati.com/user/login',
    formats: ['markdown'],
    onlyMainContent: false,
    waitFor: 4000,
    timeout: 180000,
    actions: [
      { type: 'wait', milliseconds: 5000 },
      { type: 'executeJavascript', script: loginScript() },
      { type: 'wait', milliseconds: 9000 },
      { type: 'executeJavascript', script: `window.location.href=${JSON.stringify(bookUrl)};` },
      { type: 'wait', milliseconds: 9000 },
      { type: 'executeJavascript', script: starScript(rating) },
      { type: 'wait', milliseconds: 4000 },
      { type: 'executeJavascript', script: postScript(text) },
      { type: 'wait', milliseconds: 8000 },
    ],
  });
  const returns = (data.actions?.javascriptReturns || []).map((r: any) => r?.value);
  const markdown: string = data.markdown || '';
  if (returns.includes('noform')) throw new Error('لم يتم العثور على نموذج المراجعة (قد تكون الجلسة غير مسجلة)');
  if (!markdown.includes(text.slice(0, 20))) throw new Error('لم يظهر التقييم بعد النشر — قد يكون فشل الإرسال');
  return true;
}

async function processQueue(supabase: any, max: number) {
  const { data: pending } = await supabase
    .from('ktobati_review_queue')
    .select('*')
    .in('status', ['pending', 'error'])
    .order('position', { ascending: true })
    .limit(max);

  const rows = pending || [];
  if (!rows.length) return { processed: 0, ok: 0, failed: 0, message: 'لا توجد كتب بانتظار التقييم' };

  const { data: history } = await supabase
    .from('ktobati_reviewed_books')
    .select('book_url')
    .in('book_url', rows.map((r: any) => r.book_url));
  const already = new Set((history || []).map((h: any) => h.book_url));

  let ok = 0, failed = 0, skipped = 0;
  for (const row of rows) {
    if (already.has(row.book_url)) {
      await supabase.from('ktobati_review_queue')
        .update({ status: 'skipped', error: 'سبق تقييم هذا الكتاب' }).eq('id', row.id);
      skipped++;
      continue;
    }
    await supabase.from('ktobati_review_queue').update({ status: 'running', error: null }).eq('id', row.id);
    try {
      await postReview(row.book_url, row.rating, row.review_text);
      await supabase.from('ktobati_review_queue')
        .update({ status: 'done', error: null, posted_at: new Date().toISOString() }).eq('id', row.id);
      await supabase.from('ktobati_reviewed_books')
        .upsert({ book_url: row.book_url, title: row.title, rating: row.rating }, { onConflict: 'book_url', ignoreDuplicates: true });
      ok++;
    } catch (e) {
      await supabase.from('ktobati_review_queue')
        .update({ status: 'error', error: (e as Error).message }).eq('id', row.id);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return { processed: rows.length, ok, failed, skipped };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (body.latest) {
      const limit = Math.min(300, Math.max(10, Number(body.limit) || 100));
      const { books, pages } = await fetchLatestBooks(limit);
      return new Response(JSON.stringify({ success: true, books, pages }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.review) {
      await postReview(String(body.bookUrl), Number(body.rating) || 5, String(body.text || ''));
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.processQueue) {
      const result = await processQueue(supabase, Math.min(20, Math.max(1, Number(body.max) || 5)));
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'وضع غير معروف' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
