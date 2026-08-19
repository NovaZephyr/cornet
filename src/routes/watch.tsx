import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const WatchContent = lazy(() => import("./watch-content").then((module) => ({ default: module.WatchContent })));

const DEFAULT_EMBED_IMAGE = "https://mvwpxnszcpyayofqgtmv.supabase.co/storage/v1/object/public/media/61fe7d8d-f53f-4838-a870-4588c16e474b/announcement-7871ca44-f13f-45e5-a3c1-7908f0c348a9.png";

type WatchVideo = {
  id: string; code: string; user_id: string; title: string; description: string; video_path: string;
  thumbnail_path: string | null; views: number; created_at: string; category: string | null;
};
type WatchChannel = { username: string; display_name: string; avatar_path: string | null; is_verified: boolean };
type WatchLoaderData = { video: WatchVideo; channel: WatchChannel | null } | null;

function publicMediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const key = path.startsWith("media/") ? path.slice("media/".length) : path;
  return supabase.storage.from("media").getPublicUrl(key).data.publicUrl || null;
}

export const Route = createFileRoute("/watch")({
  validateSearch: (search: Record<string, unknown>): { v: string } => ({ v: typeof search.v === "string" ? search.v : "" }),
  loader: async ({ location }): Promise<WatchLoaderData> => {
    const code = new URLSearchParams(location.searchStr).get("v") ?? "";
    if (!code) return null;
    const { data: rawVideo, error } = await supabase.from("videos").select("id, code, user_id, title, description, video_path, thumbnail_path, views, created_at, category").eq("code", code).eq("visibility", "public").maybeSingle();
    if (error || !rawVideo) return null;
    const { data: profile } = await supabase.from("profiles").select("username, display_name, avatar_path, is_verified").eq("id", rawVideo.user_id).maybeSingle();
    return {
      video: rawVideo as WatchVideo,
      channel: profile ? { username: profile.username, display_name: profile.display_name, avatar_path: profile.avatar_path, is_verified: Boolean(profile.is_verified) } : null,
    };
  },
  head: ({ loaderData }) => {
    const video = loaderData?.video;
    const channel = loaderData?.channel;
    const title = video?.title?.trim() || "Video en Cornet";
    const description = (video?.description || "Mira este video en Cornet.").replace(/\s+/g, " ").trim().slice(0, 300);
    const author = channel?.display_name || channel?.username || "Cornet";
    const image = publicMediaUrl(video?.thumbnail_path) || DEFAULT_EMBED_IMAGE;
    const canonical = video?.code ? `/watch?v=${encodeURIComponent(video.code)}` : "/watch";
    return {
      meta: [
        { title: `${title} - Cornet` }, { name: "description", content: description }, { name: "author", content: author },
        { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "article" },
        { property: "og:url", content: canonical }, { property: "og:site_name", content: "Cornet" }, { property: "og:image", content: image }, { property: "og:image:alt", content: title },
        { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: title }, { name: "twitter:description", content: description }, { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: canonical }, { rel: "icon", href: publicMediaUrl(channel?.avatar_path) || DEFAULT_EMBED_IMAGE }],
    };
  },
  component: WatchRoute,
});

function WatchRoute() {
  const loaderData = Route.useLoaderData();
  return <ClientOnly fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Cargando video…</div>}><Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Cargando video…</div>}><WatchContent initialVideo={loaderData} /></Suspense></ClientOnly>;
}
