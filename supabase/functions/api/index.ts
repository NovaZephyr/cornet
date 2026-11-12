import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const client = (req: Request) => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
async function requireUser(sb: ReturnType<typeof client>) { const { data, error } = await sb.auth.getUser(); return error || !data.user ? null : data.user; }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = client(req); const url = new URL(req.url); const parts = url.pathname.replace(/^\/functions\/v1\/api\/?/, "").split("/").filter(Boolean); const resource = parts[0] ?? "health";
    if (req.method === "GET" && resource === "health") return json({ ok: true, service: "corenetwork-api", version: 8, timestamp: new Date().toISOString() });
    // This legacy endpoint exposed arbitrary table, column, filter, and write
    // operations. The app has no callers for it; database access uses the
    // Supabase client and its table-specific RLS policies instead.
    if (resource === "data" || resource === "rpc") return json({ error: "NOT_FOUND" }, 404);
    if (resource === "me") { const user = await requireUser(sb); if (!user) return json({ error: "UNAUTHORIZED" }, 401); const { data, error } = await sb.from("profiles").select("id,username,display_name,description,avatar_path,banner_path,subscriber_count,is_verified,created_at,updated_at").eq("id", user.id).maybeSingle(); if (error) throw error; return json({ user: { id: user.id, email: user.email ?? null }, profile: data }); }
    return json({ error: "NOT_FOUND", route: url.pathname }, 404);
  } catch (error) { console.error(error); return json({ error: error instanceof Error ? error.message : "INTERNAL_ERROR" }, 500); }
});
