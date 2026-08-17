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

export type VideoSort = "recent" | "views" | "oldest" | "subscribers";
export type VideoCategory = "Autos & Vehicles" | "Comedy" | "Entertainment" | "Film & Animation" | "Gaming" | "Howto & Style" | "Nonprofits & Activism" | "People & Blogs" | "Pets & Animals" | "Science & Technology" | "Sports" | "Travel & Events" | "Education" | "Music";

// Prefer select(*) for profiles. The project has had schema drift between
// migrations, and PostgREST can temporarily reject explicitly named newer
// columns while the wildcard query still works. Keeping the selection broad
// here prevents harmless UI 400s while retaining the new fields when present.
export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileLite>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("*").in("id", unique);
  if (error) throw error;
  return new Map(((data ?? []) as ProfileLite[]).map((p) => [p.id, p]));
}

export async function searchChannels(search?: string, orderBy: "subscribers" | "recent" = "subscribers") {
  const escaped = search?.trim().replace(/[%_]/g, "\\$&");
  let query = supabase.from("profiles").select("*").limit(40);
  if (escaped) query = query.or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`);
  const result = await query;
  if (result.error) throw result.error;
  const profiles = (result.data ?? []) as (ProfileLite & { created_at: string })[];
  if (orderBy === "subscribers") profiles.sort((a, b) => Number(b.subscriber_count ?? 0) - Number(a.subscriber_count ?? 0) || b.created_at.localeCompare(a.created_at));
  else profiles.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return profiles;
}

export async function fetchVideos(options?: { search?: string; userId?: string; orderBy?: VideoSort; category?: string; limit?: number }) {
  const orderBy = options?.orderBy ?? "recent";
  const limit = options?.limit ?? 60;
  let q = supabase.from("videos").select("id, code, user_id, title, thumbnail_path, duration_seconds, views, created_at, category").limit(limit);
  if (options?.search) q = q.ilike("title", `%${options.search}%`);
  if (options?.userId) q = q.eq("user_id", options.userId);
  if (options?.category) q = q.eq("category", options.category);
  if (orderBy === "views") q = q.order("views", { ascending: false });
  else if (orderBy !== "subscribers") q = q.order("created_at", { ascending: orderBy === "oldest" });
  let { data, error } = await q;
  if (error) {
    if (options?.category) return [];
    let fallback = supabase.from("videos").select("id, code, user_id, title, thumbnail_path, duration_seconds, views, created_at").limit(limit);
    if (options?.search) fallback = fallback.ilike("title", `%${options.search}%`);
    if (options?.userId) fallback = fallback.eq("user_id", options.userId);
    if (orderBy === "views") fallback = fallback.order("views", { ascending: false });
    else if (orderBy !== "subscribers") fallback = fallback.order("created_at", { ascending: orderBy === "oldest" });
    const result = await fallback;
    data = (result.data ?? null) as typeof data;
    error = result.error;
  }
  if (error) throw error;
  const rows = (data ?? []) as Omit<VideoWithChannel, "profiles">[];
  const profiles = await fetchProfilesByIds(rows.map((r) => r.user_id));
  const videos = rows.map((r) => ({ ...r, profiles: profiles.get(r.user_id) ?? null })) as VideoWithChannel[];
  if (orderBy === "subscribers") return videos.sort((a, b) => Number(b.profiles?.subscriber_count ?? 0) - Number(a.profiles?.subscriber_count ?? 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return videos;
}
