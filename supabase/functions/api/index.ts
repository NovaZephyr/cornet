import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const client = (req: Request) => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
const ALLOWED_TABLES = new Set(["profiles","videos","subscriptions","playlists","playlist_items","comments","video_likes","video_captions","video_chapters","video_hashtags","hashtags","friendships","friend_requests","message_conversations","message_conversation_members","messages","notifications","community_posts","community_post_comments","post_likes","announcements","announcement_poll_options","announcement_poll_votes","partner_applications","content_reports","site_banner","site_settings","user_warnings","live_streams","community_files","community_temp_files"]);
const RPC_ALLOWLIST = new Set(["increment_views","create_cornet_dm","create_cornet_group","create_notification","generate_video_code","get_my_poll_vote","get_poll_results","get_public_badges","has_role","increment_community_file_download","increment_community_temp_download","is_banned","is_message_member","notify_mentions","notify_mentions_as_user","request_account_deletion","submit_content_report","vote_on_announcement_poll","enforce_partner_customization","enforce_playlist_series_admin","set_dm_owner"]);
const PUBLIC_RPCS = new Set(["get_public_badges","get_public_community_file","increment_community_file_download","increment_community_temp_download"]);
async function requireUser(sb: ReturnType<typeof client>) { const { data, error } = await sb.auth.getUser(); return error || !data.user ? null : data.user; }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = client(req); const url = new URL(req.url); const parts = url.pathname.replace(/^\/functions\/v1\/api\/?/, "").split("/").filter(Boolean); const resource = parts[0] ?? "health";
    if (req.method === "GET" && resource === "health") return json({ ok: true, service: "corenetwork-api", version: 7, timestamp: new Date().toISOString() });
    if (resource === "data" && req.method === "POST") {
      const body = await req.json().catch(() => ({})); const table = typeof body.table === "string" ? body.table : ""; const op = body.op ?? "select";
      if (!ALLOWED_TABLES.has(table)) return json({ error: "TABLE_NOT_ALLOWED" }, 403);
      let query: any = sb.from(table);
      if (op === "select") {
        const selectOptions = body.selectOptions ?? {}; query = query.select(typeof body.select === "string" ? body.select : "*", { count: selectOptions.count, head: selectOptions.head });
        for (const f of Array.isArray(body.filters) ? body.filters : []) { if (!f || typeof f.column !== "string") continue; const value = f.value; const operator = String(f.operator ?? "eq"); switch (operator) {
          case "eq": query = query.eq(f.column, value); break; case "neq": query = query.neq(f.column, value); break; case "gt": query = query.gt(f.column, value); break; case "gte": query = query.gte(f.column, value); break; case "lt": query = query.lt(f.column, value); break; case "lte": query = query.lte(f.column, value); break; case "ilike": query = query.ilike(f.column, value); break; case "like": query = query.like(f.column, value); break; case "in": query = query.in(f.column, Array.isArray(value) ? value : []); break; case "is": query = query.is(f.column, value); break; case "contains": query = query.contains(f.column, value); break; case "containedBy": query = query.containedBy(f.column, value); break; case "overlaps": query = query.overlaps(f.column, value); break; case "not.eq": query = query.not(f.column, "eq", value); break; case "not.ilike": query = query.not(f.column, "ilike", value); break; default: query = query.filter(f.column, operator, value); break; } }
        if (typeof body.or === "string" && body.or.trim()) query = query.or(body.or);
        if (Array.isArray(body.order)) for (const item of body.order) if (item?.column) query = query.order(item.column, { ascending: item.ascending !== false, nullsFirst: item.nullsFirst });
        if (Number.isFinite(body.limit)) query = query.limit(Math.min(Math.max(Number(body.limit), 0), 200));
        if (body.range && Number.isFinite(body.range.from) && Number.isFinite(body.range.to)) query = query.range(Number(body.range.from), Number(body.range.to));
        if (body.singleMode === "maybeSingle") query = query.maybeSingle(); else if (body.singleMode === "single") query = query.single();
        const result = await query; return json({ data: result.data ?? null, error: result.error ? { message: result.error.message, code: result.error.code } : null, count: result.count ?? null });
      }
      if (!["insert","upsert","update","delete"].includes(op)) return json({ error: "OPERATION_NOT_ALLOWED" }, 400);
      if (!await requireUser(sb)) return json({ error: "UNAUTHORIZED" }, 401);
      if (op === "insert") query = query.insert(body.values); else if (op === "upsert") query = query.upsert(body.values, body.upsertOptions ?? {}); else { for (const f of Array.isArray(body.filters) ? body.filters : []) if (f?.column) query = query.eq(f.column, f.value); query = op === "update" ? query.update(body.values) : query.delete(); }
      query = query.select(typeof body.select === "string" ? body.select : "*");
      if (body.singleMode === "maybeSingle") query = query.maybeSingle(); else if (body.singleMode === "single") query = query.single();
      const result = await query; return json({ data: result.data ?? null, error: result.error ? { message: result.error.message, code: result.error.code } : null });
    }
    if (resource === "rpc" && req.method === "POST") { const body = await req.json().catch(() => ({})); const fn = typeof body.fn === "string" ? body.fn : ""; if (!RPC_ALLOWLIST.has(fn) && !PUBLIC_RPCS.has(fn)) return json({ error: "RPC_NOT_ALLOWED" }, 403); if (!await requireUser(sb) && !PUBLIC_RPCS.has(fn)) return json({ error: "UNAUTHORIZED" }, 401); const { data, error } = await sb.rpc(fn, body.args ?? {}); return json({ data: data ?? null, error: error ? { message: error.message, code: error.code } : null }); }
    if (resource === "me") { const user = await requireUser(sb); if (!user) return json({ error: "UNAUTHORIZED" }, 401); const { data, error } = await sb.from("profiles").select("id,username,display_name,description,avatar_path,banner_path,subscriber_count,is_verified,created_at,updated_at").eq("id", user.id).maybeSingle(); if (error) throw error; return json({ user: { id: user.id, email: user.email ?? null }, profile: data }); }
    return json({ error: "NOT_FOUND", route: url.pathname }, 404);
  } catch (error) { console.error(error); return json({ error: error instanceof Error ? error.message : "INTERNAL_ERROR" }, 500); }
});
