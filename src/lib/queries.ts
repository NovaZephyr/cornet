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

const PROFILE_FIELDS = "id,username,display_name,avatar_path,is_verified,subscriber_count,channel_style";

export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileLite>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select(PROFILE_FIELDS).in("id", unique);
  if (error) throw error;
  return new Map(((data ?? []) as ProfileLite[]).map((p) => [p.id, p]));
}

export async function searchChannels(search?: string, orderBy: "subscribers" | "recent" = "subscribers") {
  const escaped = search?.trim().replace(/[%_]/g, "\\$&");
  let query = supabase.from("profiles").select(`${PROFILE_FIELDS},created_at`).limit(24);
  if (escaped) query = query.or(`username.ilike.%${escaped}%,display_name.ilike.%${escaped}%`);
  const result = await query;
  if (result.error) throw result.error;
  const profiles = (result.data ?? []) as (ProfileLite & { created_at: string })[];
  if (orderBy === "subscribers") profiles.sort((a, b) => Number(b.subscriber_count ?? 0) - Number(a.subscriber_count ?? 0) || b.created_at.localeCompare(a.created_at));
  else profiles.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return profiles;
}

export async function fetchVideos(options?: {
  search?: string;
  userId?: string;
  orderBy?: VideoSort;
  category?: string;
  limit?: number;
  excludeVideoId?: string;
}) {
  const orderBy = options?.orderBy ?? "recent";
  const limit = Math.min(Math.max(options?.limit ?? 24, 1), 48);
  const queryLimit = Math.min(48, options?.excludeVideoId ? limit + 4 : limit);
  let q = supabase.from("videos").select("id, code, user_id, title, thumbnail_path, duration_seconds, views, created_at, category").limit(queryLimit);
  if (options?.search) q = q.ilike("title", `%${options.search}%`);
  if (options?.userId) q = q.eq("user_id", options.userId);
  if (options?.category) q = q.eq("category", options.category);
  if (orderBy === "views") q = q.order("views", { ascending: false });
  else if (orderBy !== "subscribers") q = q.order("created_at", { ascending: orderBy === "oldest" });
  let { data, error } = await q;
  if (error) {
    if (options?.category) return [];
    let fallback = supabase.from("videos").select("id, code, user_id, title, thumbnail_path, duration_seconds, views, created_at").limit(queryLimit);
    if (options?.search) fallback = fallback.ilike("title", `%${options.search}%`);
    if (options?.userId) fallback = fallback.eq("user_id", options.userId);
    if (orderBy === "views") fallback = fallback.order("views", { ascending: false });
    else if (orderBy !== "subscribers") fallback = fallback.order("created_at", { ascending: orderBy === "oldest" });
    const result = await fallback;
    data = (result.data ?? null) as typeof data;
    error = result.error;
  }
  if (error) throw error;
  const rows = ((data ?? []) as Omit<VideoWithChannel, "profiles">[]).filter((row) => row.id !== options?.excludeVideoId).slice(0, limit);
  const profiles = await fetchProfilesByIds(rows.map((r) => r.user_id));
  const videos = rows.map((r) => ({ ...r, profiles: profiles.get(r.user_id) ?? null })) as VideoWithChannel[];
  if (orderBy === "subscribers") return videos.sort((a, b) => Number(b.profiles?.subscriber_count ?? 0) - Number(a.profiles?.subscriber_count ?? 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return videos;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let state = Math.abs(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Home-only discovery feed. Filtered/search pages never call this. */
export async function fetchHomeFeed(limit = 24): Promise<VideoWithChannel[]> {
  const [recent, popular] = await Promise.all([
    fetchVideos({ orderBy: "recent", limit: 36 }),
    fetchVideos({ orderBy: "views", limit: 36 }),
  ]);
  const byId = new Map<string, VideoWithChannel>();
  [...recent, ...popular].forEach((video) => byId.set(video.id, video));
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  return seededShuffle([...byId.values()], bucket).slice(0, Math.min(Math.max(limit, 1), 48));
}

/** Watch-page recommendations: same category + creator + popular, excluding current video. */
export async function fetchRelatedVideos(video: { id: string; user_id: string; category?: string | null }, limit = 12): Promise<VideoWithChannel[]> {
  const [categoryVideos, creatorVideos, popular] = await Promise.all([
    video.category ? fetchVideos({ category: video.category, orderBy: "views", limit: 18, excludeVideoId: video.id }) : Promise.resolve([]),
    fetchVideos({ userId: video.user_id, orderBy: "recent", limit: 12, excludeVideoId: video.id }),
    fetchVideos({ orderBy: "views", limit: 24, excludeVideoId: video.id }),
  ]);
  const rank = new Map<string, VideoWithChannel>();
  categoryVideos.forEach((item) => rank.set(item.id, item));
  creatorVideos.forEach((item) => rank.set(item.id, item));
  popular.forEach((item) => rank.set(item.id, item));
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  return seededShuffle([...rank.values()], bucket + video.id.length).slice(0, Math.min(Math.max(limit, 1), 24));
}
