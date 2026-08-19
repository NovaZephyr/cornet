import { fetchVideos } from "@/lib/queries";

export async function fetchShorts(limit = 24) {
  const [recent, popular] = await Promise.all([
    fetchVideos({ orderBy: "recent", limit: Math.max(limit * 2, 32) }),
    fetchVideos({ orderBy: "views", limit: Math.max(limit, 20) }),
  ]);
  const seen = new Set<string>();
  return [...recent, ...popular]
    .filter((video) => Number(video.duration_seconds ?? 0) > 0 && Number(video.duration_seconds ?? 0) <= 60)
    .filter((video) => {
      if (seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    })
    .slice(0, limit);
}
