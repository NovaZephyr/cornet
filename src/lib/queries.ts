import { supabase } from "@/integrations/supabase/client";
import type { VideoWithChannel } from "@/components/VideoCard";

export type ProfileLite = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  is_verified: boolean;
};

export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileLite>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_path, is_verified")
    .in("id", unique);
  return new Map(((data ?? []) as ProfileLite[]).map((p) => [p.id, p]));
}

export async function fetchVideos(options?: {
  search?: string;
  userId?: string;
  orderBy?: "recent" | "views";
}) {
  let q = supabase
    .from("videos")
    .select("id, code, user_id, title, thumbnail_path, duration_seconds, views, created_at")
    .order(options?.orderBy === "views" ? "views" : "created_at", { ascending: false })
    .limit(60);
  if (options?.search) q = q.ilike("title", `%${options.search}%`);
  if (options?.userId) q = q.eq("user_id", options.userId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Omit<VideoWithChannel, "profiles">[];
  const profiles = await fetchProfilesByIds(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, profiles: profiles.get(r.user_id) ?? null })) as VideoWithChannel[];
}
