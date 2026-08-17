import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const client = (req: Request) => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = client(req);
    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/functions\/v1\/api\/?/, "").split("/").filter(Boolean);
    const resource = parts[0] ?? "health";
    const id = parts[1];

    if (req.method === "GET" && resource === "health") return json({ ok: true, service: "corenetwork-api", version: 1, timestamp: new Date().toISOString() });

    if (resource === "me") {
      const { data: auth, error: authError } = await sb.auth.getUser();
      if (authError || !auth.user) return json({ error: "UNAUTHORIZED" }, 401);
      const { data, error } = await sb.from("profiles").select("id,username,display_name,description,avatar_path,banner_path,subscriber_count,is_verified,created_at,updated_at").eq("id", auth.user.id).maybeSingle();
      if (error) throw error;
      return json({ user: { id: auth.user.id, email: auth.user.email ?? null }, profile: data });
    }

    if (resource === "videos" && req.method === "GET" && id === "mine") {
      const { data: auth, error: authError } = await sb.auth.getUser();
      if (authError || !auth.user) return json({ error: "UNAUTHORIZED" }, 401);
      const { data, error } = await sb.from("videos").select("id,code,title,description,video_path,thumbnail_path,duration_seconds,views,visibility,category,created_at,user_id,age_restricted").eq("user_id", auth.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ data: data ?? [] });
    }

    if (resource === "videos" && req.method === "GET" && !id) {
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 24), 100);
      const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
      let query = sb.from("videos").select("id,code,title,description,thumbnail_path,duration_seconds,views,visibility,category,created_at,user_id,age_restricted").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      const category = url.searchParams.get("category");
      if (category) query = query.eq("category", category);
      const { data, error } = await query;
      if (error) throw error;
      return json({ data: data ?? [], limit, offset });
    }

    if (resource === "videos" && req.method === "GET" && id) {
      const { data, error } = await sb.from("videos").select("id,code,title,description,video_path,thumbnail_path,duration_seconds,views,visibility,category,created_at,user_id,age_restricted").eq("code", id).maybeSingle();
      if (error) throw error;
      return data ? json({ data }) : json({ error: "NOT_FOUND" }, 404);
    }

    if (resource === "videos" && req.method === "POST" && id === "views") {
      const body = await req.json().catch(() => ({}));
      if (typeof body.video_id !== "string") return json({ error: "video_id is required" }, 400);
      const { error } = await sb.rpc("increment_views", { _video_id: body.video_id });
      if (error) throw error;
      return json({ ok: true });
    }

    if (resource === "channels" && req.method === "GET" && id) {
      const { data: profile, error } = await sb.from("profiles").select("id,username,display_name,description,avatar_path,banner_path,subscriber_count,is_verified,created_at").eq("username", id).maybeSingle();
      if (error) throw error;
      if (!profile) return json({ error: "NOT_FOUND" }, 404);
      const { data: videos, error: videoError } = await sb.from("videos").select("id,code,title,description,thumbnail_path,duration_seconds,views,visibility,category,created_at,user_id").eq("user_id", profile.id).eq("visibility", "public").order("created_at", { ascending: false }).limit(24);
      if (videoError) throw videoError;
      return json({ profile, videos: videos ?? [] });
    }

    if (resource === "subscriptions") {
      const { data: auth, error: authError } = await sb.auth.getUser();
      if (authError || !auth.user) return json({ error: "UNAUTHORIZED" }, 401);
      if (req.method === "GET") {
        const { data, error } = await sb.from("subscriptions").select("channel_id,created_at").eq("subscriber_id", auth.user.id).order("created_at", { ascending: false });
        if (error) throw error;
        const ids = (data ?? []).map((item) => item.channel_id);
        const { data: channels, error: channelError } = ids.length ? await sb.from("profiles").select("id,username,display_name,avatar_path,subscriber_count,is_verified").in("id", ids) : { data: [], error: null };
        if (channelError) throw channelError;
        return json({ data: data ?? [], channels: channels ?? [] });
      }
    }

    if (resource === "playlists" && req.method === "GET") {
      let query = sb.from("playlists").select("id,title,description,is_series,kind,visibility,user_id,created_at,updated_at").order("updated_at", { ascending: false }).limit(50);
      const owner = url.searchParams.get("user_id");
      if (owner) query = query.eq("user_id", owner);
      const { data, error } = await query;
      if (error) throw error;
      return json({ data: data ?? [] });
    }

    if (resource === "notifications" && req.method === "GET") {
      const { data: auth, error: authError } = await sb.auth.getUser();
      if (authError || !auth.user) return json({ error: "UNAUTHORIZED" }, 401);
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
      const { data, error } = await sb.from("notifications").select("id,title,body,type,link,metadata,read_at,created_at,actor_id,video_id").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return json({ data: data ?? [] });
    }

    return json({ error: "NOT_FOUND", route: url.pathname }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "INTERNAL_ERROR" }, 500);
  }
});
