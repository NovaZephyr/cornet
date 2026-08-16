import { supabase } from "@/integrations/supabase/client";
import type { VideoWithChannel } from "@/components/VideoCard";

export type ProfileLite = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  is_verified: boolean;
  subscriber_count?: number;
  channel_style?: string;
};

export type VideoSort = "recent" | "views" | "oldest";
export type VideoCategory = "Autos & Vehicles" | "Comedy" | "Entertainment" | "Film & Animation" | "Gaming" | "Howto & Style" | "Nonprofits & Activism" | "People & Blogs" | "Pets & Animals" | "Science & Technology" | "Sports" | "Travel & Events" | "Education" | "Music";

export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileLite>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, username, display_name, avatar_path, is_verified, subscriber_count, channel_style").in("id", unique);
  if (error) throw error;
  return new Map(((data ?? []) as ProfileLite[]).map((p) => [p.id, p]));
}

export async function searchChannels(search?: string, orderBy: "subscribers" | "recent" = "subscribers") {
  let q = supabase.from("profiles").select("id, username, display_name, avatar_path, is_verified, subscriber_count, channel_style, created_at").limit(40);
  if (search?.trim()) {
    const escaped = search.trim().replace(/[%_]/g, "\\$&");
    q = q.or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`);
  }
  q = orderBy === "subscribers" ? q.order("subscriber_count", { ascending: false }).order("created_at", { ascending: false }) : q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ProfileLite[];
}

export async function fetchVideos(options?: { search?: string; userId?: string; orderBy?: VideoSort; category?: string; limit?: number }) {
  const orderBy = options?.orderBy ?? "recent";
  let q = supabase.from("videos").select("id, code, user_id, title, thumbnail_path, duration_seconds, views, created_at, category").limit(options?.limit ?? 60);
  if (options?.search) q = q.ilike("title", `%${options.search}%`);
  if (options?.userId) q = q.eq("user_id", options.userId);
  if (options?.category) q = q.eq("category", options.category);
  if (orderBy === "views") q = q.order("views", { ascending: false });
  else q = q.order("created_at", { ascending: orderBy === "oldest" });
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Omit<VideoWithChannel, "profiles">[];
  const profiles = await fetchProfilesByIds(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, profiles: profiles.get(r.user_id) ?? null })) as VideoWithChannel[];
}
