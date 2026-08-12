// Edge function: verify-books-files
// يفحص روابط ملفات الكتب المنشورة ويعطّل أي كتاب ملفه غير قابل للقراءة
// (رابط ميت / ملف تالف)، حتى لا يبقى أي كتاب لا يعمل داخل الموقع.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONCURRENCY = 8;
const MAX_MS = 110_000;

async function isReadable(url: string): Promise<boolean> {
  if (!url) return false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { Range: "bytes=0-2047" } });
      if (res.status === 200 || res.status === 206) {
        const head = new Uint8Array(await res.arrayBuffer());
        if (head.byteLength < 512) return false;
        const sig = String.fromCharCode(...head.slice(0, 4));
        return sig === "%PDF" || sig.startsWith("PK");
      }
      await res.body?.cancel();
      if (res.status === 404 || res.status === 400) return false;
    } catch (_) { /* إعادة المحاولة */ }
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body?.limit) || 200, 500);
    const offset = Math.max(0, Number(body?.offset) || 0);
    const deactivate = body?.deactivate !== false;

    const { data: books, error } = await supabase
      .from("approved_books")
      .select("id,title,book_file_url")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);

    const broken: { id: string; title: string }[] = [];
    let cursor = 0;
    const worker = async () => {
      while (cursor < (books?.length ?? 0)) {
        if (Date.now() - started > MAX_MS) return;
        const b = books![cursor++];
        if (!(await isReadable(b.book_file_url || ""))) {
          broken.push({ id: b.id, title: b.title });
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    if (deactivate && broken.length) {
      await supabase
        .from("approved_books")
        .update({ is_active: false })
        .in("id", broken.map((b) => b.id));
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: books?.length ?? 0,
        broken: broken.length,
        deactivated: deactivate ? broken.length : 0,
        titles: broken.slice(0, 30).map((b) => b.title),
        next_offset: offset + (books?.length ?? 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
