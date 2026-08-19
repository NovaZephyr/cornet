import { getSignedUrl } from "@/lib/storage";
import { fetchProfilesByIds } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export type ShortVideo = {
  id: string;
  code: string;
  user_id: string;
  title: string;
  description: string;
  video_path: string;
  thumbnail_path: string | null;
  duration_seconds: number;
  views: number;
  created_at: string;
  category: string | null;
  is_shorts_enabled?: boolean;
  video_width?: number | null;
  video_height?: number | null;
  profiles?: {
    username: string;
    display_name: string;
    avatar_path: string | null;
    is_verified: boolean;
  } | null;
};

const MAX_SHORT_DURATION = 180;
const LEGACY_SHORT_DURATION = 60;

function probeDimensions(url: string): Promise<{ width: number; height: number } | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (value: { width: number; height: number } | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const width = Number(video.videoWidth || 0);
      const height = Number(video.videoHeight || 0);
      finish(width > 0 && height > 0 ? { width, height } : null);
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

async function enrichOrientation(video: ShortVideo): Promise<ShortVideo> {
  if (video.video_width && video.video_height) return video;
  try {
    const signed = await getSignedUrl(video.video_path);
    if (!signed) return video;
    const dimensions = await probeDimensions(signed);
    if (!dimensions) return video;
    const { width, height } = dimensions;
    void (supabase as any).from("videos").update({ video_width: width, video_height: height }).eq("id", video.id).then(() => undefined);
    return { ...video, video_width: width, video_height: height };
  } catch {
    return video;
  }
}

export async function fetchShorts(limit = 24): Promise<ShortVideo[]> {
  const candidateLimit = Math.min(Math.max(limit * 3, 48), 96);
  const { data, error } = await (supabase as any)
    .from("videos")
    .select("id,code,user_id,title,description,video_path,thumbnail_path,duration_seconds,views,created_at,category,is_shorts_enabled,video_width,video_height")
    .eq("visibility", "public")
    .eq("is_shorts_enabled", true)
    .gt("duration_seconds", 0)
    .lte("duration_seconds", MAX_SHORT_DURATION)
    .order("created_at", { ascending: false })
    .limit(candidateLimit);

  if (error) throw error;

  const candidates = ((data ?? []) as ShortVideo[]).filter((video) => {
    if (video.is_shorts_enabled === false) return false;
    const width = Number(video.video_width ?? 0);
    const height = Number(video.video_height ?? 0);
    if (width > 0 && height > 0) return height >= width;
    return Number(video.duration_seconds ?? 0) <= LEGACY_SHORT_DURATION;
  });

  const needsProbe = candidates.filter((video) => !video.video_width || !video.video_height).slice(0, Math.min(32, candidates.length));
  const enriched = await Promise.all(needsProbe.map((video) => enrichOrientation(video)));
  const enrichedById = new Map(enriched.map((video) => [video.id, video]));

  const oriented = candidates
    .map((video) => enrichedById.get(video.id) ?? video)
    .filter((video) => {
      if (video.is_shorts_enabled === false) return false;
      const width = Number(video.video_width ?? 0);
      const height = Number(video.video_height ?? 0);
      return width > 0 && height > 0 ? height >= width : Number(video.duration_seconds ?? 0) <= LEGACY_SHORT_DURATION;
    })
    .slice(0, limit);

  const profiles = await fetchProfilesByIds(oriented.map((video) => video.user_id));
  return oriented.map((video) => ({ ...video, profiles: profiles.get(video.user_id) ?? null }));
}
