import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const WatchContent = lazy(() => import("./watch-content").then((module) => ({ default: module.WatchContent })));

const DEFAULT_EMBED_IMAGE = "https://mvwpxnszcpyayofqgtmv.supabase.co/storage/v1/object/public/media/61fe7d8d-f53f-4838-a870-4588c16e474b/announcement-7871ca44-f13f-45e5-a3c1-7908f0c348a9.png";
const SITE_ORIGIN = "https://corenetwork.lovable.app";

type WatchVideo = { id: string; code: string; user_id: string; title: string; description: string; video_path: string; thumbnail_path: string | null; views: number; created_at: string; category: string | null; age_restricted: boolean };
type WatchChannel = { username: string; display_name: string; avatar_path: string | null; is_verified: boolean };
type WatchLoaderData = { video: WatchVideo; channel: WatchChannel | null } | null;

function publicMediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const key = path.startsWith("media/") ? path.slice("media/".length) : path;
  return supabase.storage.from("media").getPublicUrl(key).data.publicUrl || null;
}
function absolutePublicMediaUrl(path: string | null | undefined, fallback = DEFAULT_EMBED_IMAGE) {
  const url = publicMediaUrl(path);
  if (!url) return fallback;
  try { const absolute = new URL(url, SITE_ORIGIN); if (absolute.protocol === "http:" || absolute.protocol === "https:") return absolute.toString(); } catch { /* fallback */ }
  return fallback;
}

export const Route = createFileRoute("/watch")({
  validateSearch: (search: Record<string, unknown>): { v: string } => ({ v: typeof search.v === "string" ? search.v : "" }),
  loader: async ({ location }): Promise<WatchLoaderData> => {
    const code = new URLSearchParams(location.searchStr).get("v") ?? "";
    if (!code) return null;
    const { data: rawVideo, error } = await supabase.from("videos").select("id, code, user_id, title, description, video_path, thumbnail_path, views, created_at, category, age_restricted").eq("code", code).eq("visibility", "public").maybeSingle();
    if (error || !rawVideo) return null;
    const { data: profile } = await supabase.from("profiles").select("username, display_name, avatar_path, is_verified").eq("id", rawVideo.user_id).maybeSingle();
    return { video: rawVideo as WatchVideo, channel: profile ? { username: profile.username, display_name: profile.display_name, avatar_path: profile.avatar_path, is_verified: Boolean(profile.is_verified) } : null };
  },
  head: ({ loaderData }) => {
    const video = loaderData?.video; const channel = loaderData?.channel;
    const videoTitle = video?.title?.trim() || "Video en Cornet"; const channelName = channel?.display_name?.trim() || channel?.username?.trim() || "Cornet"; const channelHandle = channel?.username ? `@${channel.username}` : "@cornet";
    const descriptionText = (video?.description || "").replace(/\s+/g, " ").trim(); const shortDescription = descriptionText ? descriptionText.slice(0, 220) + (descriptionText.length > 220 ? "…" : "") : `Canal: ${channelHandle}`;
    const image = absolutePublicMediaUrl(video?.thumbnail_path); const canonicalPath = video?.code ? `/watch?v=${encodeURIComponent(video.code)}` : "/watch"; const canonical = `${SITE_ORIGIN}${canonicalPath}`; const authorIcon = absolutePublicMediaUrl(channel?.avatar_path);
    return { meta: [{ title: `${videoTitle} - ${channelName}` }, { name: "description", content: shortDescription }, { name: "author", content: channelName }, { property: "og:title", content: `${videoTitle} - ${channelName}` }, { property: "og:description", content: shortDescription }, { property: "og:type", content: "video.other" }, { property: "og:url", content: canonical }, { property: "og:site_name", content: "Cornet" }, { property: "og:image", content: image }, { property: "og:image:secure_url", content: image }, { property: "og:image:type", content: "image/jpeg" }, { property: "og:image:width", content: "1280" }, { property: "og:image:height", content: "720" }, { property: "og:image:alt", content: `${videoTitle} - ${channelName}` }, { property: "og:locale", content: "es_ES" }, { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: `${videoTitle} - ${channelName}` }, { name: "twitter:description", content: shortDescription }, { name: "twitter:image", content: image }, { name: "twitter:image:alt", content: `${videoTitle} - ${channelName}` }], links: [{ rel: "canonical", href: canonical }, { rel: "icon", href: authorIcon }] };
  },
  component: WatchRoute,
});

function WatchRoute() {
  const loaderData = Route.useLoaderData();
  const videoId = loaderData?.video.id ?? "";
  const [approved, setApproved] = useState(false);
  useEffect(() => { if (!videoId || !loaderData?.video.age_restricted) { setApproved(true); return; } try { setApproved(sessionStorage.getItem(`cornet-age18:${videoId}`) === "yes"); } catch { setApproved(false); } }, [videoId, loaderData?.video.age_restricted]);

  const confirmAge = () => { try { sessionStorage.setItem(`cornet-age18:${videoId}`, "yes"); } catch { /* sessionStorage may be unavailable */ } setApproved(true); };

  return <ClientOnly fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Cargando video…</div>}><Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Cargando video…</div>}>{loaderData?.video.age_restricted && !approved ? <AppAgeGate title={loaderData.video.title} onConfirm={confirmAge} /> : <WatchContent initialVideo={loaderData} />}</Suspense></ClientOnly>;
}

function AppAgeGate({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  return <div className="flex min-h-[65vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-7 text-center shadow-lg"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-xl font-bold text-destructive">18+</div><h1 className="mt-4 text-2xl font-bold">Contenido restringido</h1><p className="mt-2 text-sm text-muted-foreground">Este video está marcado como contenido para mayores de 18 años.</p><p className="mt-3 text-sm font-medium">{title}</p><p className="mt-4 text-xs text-muted-foreground">Al continuar confirmas que tienes al menos 18 años.</p><div className="mt-6 flex justify-center gap-2"><button type="button" onClick={() => window.history.back()} className="rounded-full border border-border px-5 py-2 text-sm">Volver</button><button type="button" onClick={onConfirm} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Tengo 18 años o más</button></div></div></div>;
}
