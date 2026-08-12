// probe
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const url = body?.url ?? "https://www.ktobati.com/section/%D8%B1%D9%88%D8%A7%D9%8A%D8%A7%D8%AA";
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ar,en;q=0.9",
    },
  });
  const t = await r.text();
  return new Response(
    JSON.stringify({ status: r.status, len: t.length, head: t.slice(0, 400) }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
