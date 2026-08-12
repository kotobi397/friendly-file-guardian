import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';

const QuerySchema = z.object({
  book_id: z.string().uuid(),
  filename: z.string().trim().min(1).max(180).optional(),
});

const allowedS3Host = /^kotobi\.s3\.[a-z0-9-]+\.amazonaws\.com$/i;

function isAllowedBookUrl(value: string, supabaseUrl: string): boolean {
  try {
    const url = new URL(value);
    const supabaseHost = new URL(supabaseUrl).hostname;
    return (
      url.protocol === 'https:' &&
      (url.hostname === supabaseHost || allowedS3Host.test(url.hostname))
    );
  } catch {
    return false;
  }
}

function safeFilename(value: string): string {
  const cleaned = value
    .replace(/[\r\n"\\/<>:*?|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return cleaned || 'kotobi-book.pdf';
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return jsonError('Method not allowed', 405);
  }

  try {
    const requestUrl = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      book_id: requestUrl.searchParams.get('book_id'),
      filename: requestUrl.searchParams.get('filename') || undefined,
    });
    if (!parsed.success) {
      return jsonError('Invalid download request', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonError('Download service is not configured', 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: book, error } = await supabase
      .from('book_submissions')
      .select('title, book_file_url, file_type, display_type, status')
      .eq('id', parsed.data.book_id)
      .eq('status', 'approved')
      .maybeSingle();

    if (error) {
      console.error('download-book lookup failed:', error.message);
      return jsonError('Unable to prepare this download', 500);
    }
    if (!book?.book_file_url || book.display_type === 'no_access' || book.display_type === 'read_only') {
      return jsonError('Book is not available for download', 404);
    }
    if (!isAllowedBookUrl(book.book_file_url, supabaseUrl)) {
      console.error('download-book rejected source host');
      return jsonError('Unsupported book source', 400);
    }

    const range = req.headers.get('range');
    const upstream = await fetch(book.book_file_url, {
      method: req.method,
      headers: range ? { Range: range } : undefined,
      redirect: 'follow',
    });
    if (!upstream.ok && upstream.status !== 206) {
      const details = await upstream.text().catch(() => '');
      console.error(`download-book upstream failed [${upstream.status}]: ${details.slice(0, 300)}`);
      return jsonError('Book file is temporarily unavailable', 502);
    }

    const fallbackExtension = book.file_type === 'application/pdf' ? '.pdf' : '';
    const requestedName = parsed.data.filename || `${book.title || 'kotobi-book'}${fallbackExtension}`;
    const filename = safeFilename(requestedName);
    const encodedFilename = encodeURIComponent(filename);
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', upstream.headers.get('content-type') || book.file_type || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="kotobi-book"; filename*=UTF-8''${encodedFilename}`);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');

    for (const name of ['content-length', 'content-range', 'etag', 'last-modified']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new Response(req.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error('download-book error:', error instanceof Error ? error.message : String(error));
    return jsonError('Unexpected download error', 500);
  }
});