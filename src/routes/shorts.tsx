import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ExternalLink, Heart, Loader2, MessageCircle, MoreVertical, PlaySquare, Share2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { useSignedUrl } from "@/lib/storage";
import { fetchShorts, type ShortVideo } from "@/lib/shorts";
import { formatViews } from "@/lib/format";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isExperimentEnabled } from "@/lib/experiments";
import "@/shorts.css";

export const Route = createFileRoute("/shorts")({
  ssr: false,
  beforeLoad: () => {
    if (!isExperimentEnabled("shorts")) throw notFound();
  },
  head: () => ({ meta: [{ title: "Shorts — Cornet" }] }),
  component: ShortsPage,
});

function ShortCard({ video, active, onDisabled }: { video: ShortVideo; active: boolean; onDisabled: (videoId: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoUrl = useSignedUrl(video.video_path);
  const posterUrl = useSignedUrl(video.thumbnail_path);
  const { user } = useAuth();
  const qc = useQueryClient();
  const [muted, setMuted] = useState(true);

  const likesQuery = useQuery({
    queryKey: ["short-likes", video.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("video_likes").select("user_id, is_like").eq("video_id", video.id);
      if (error) throw error;
      return (data ?? []) as { user_id: string; is_like: boolean }[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    element.muted = muted;
    if (active) void element.play().catch(() => undefined);
    else element.pause();
  }, [active, muted, videoUrl]);

  const liked = likesQuery.data?.some((like) => like.user_id === user?.id && like.is_like) ?? false;
  const likeCount = likesQuery.data?.filter((like) => like.is_like).length ?? 0;

  const toggleLike = async () => {
    if (!user) return void toast.error("Inicia sesión para reaccionar");
    const current = likesQuery.data?.find((like) => like.user_id === user.id);
    const result = current?.is_like
      ? await supabase.from("video_likes").delete().eq("video_id", video.id).eq("user_id", user.id)
      : await supabase.from("video_likes").upsert({ video_id: video.id, user_id: user.id, is_like: true });
    if (result.error) return void toast.error(result.error.message);
    void qc.invalidateQueries({ queryKey: ["short-likes", video.id] });
    void qc.invalidateQueries({ queryKey: ["likes", video.id] });
  };

  const toggleShort = async () => {
    if (!user || user.id !== video.user_id) return;
    const { error } = await (supabase as any).from("videos").update({ is_shorts_enabled: false }).eq("id", video.id).eq("user_id", user.id);
    if (error) return void toast.error("No se pudo quitar el video de Shorts");
    toast.success("Este video ya no aparecerá como Short");
    onDisabled(video.id);
  };

  const share = async () => {
    const url = new URL(`/watch?v=${encodeURIComponent(video.code)}`, window.location.origin).toString();
    try {
      if (navigator.share) { await navigator.share({ title: video.title, text: video.description || video.title, url }); return; }
    } catch { /* fall through to clipboard */ }
    try { await navigator.clipboard.writeText(url); toast.success("Enlace copiado"); } catch { window.prompt("Copia este enlace", url); }
  };

  return <article className="cn-shorts-card" data-video-id={video.id} data-active={active ? "true" : "false"}>
    <div className="cn-shorts-player-wrap">
      {videoUrl ? <video ref={videoRef} className="cn-shorts-player" src={videoUrl} poster={posterUrl ?? undefined} playsInline loop preload={active ? "auto" : "metadata"} muted={muted} /> : <div className="cn-shorts-unavailable">Este Short no está disponible.</div>}
      <div className="cn-shorts-topbar"><span>Shorts</span><button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Activar sonido" : "Silenciar"}>{muted ? <VolumeX /> : <Volume2 />}</button></div>
      <div className="cn-shorts-gradient" />
      <div className="cn-shorts-overlay">
        <div className="cn-shorts-meta">
          <Link to="/c/$username" params={{ username: video.profiles?.username ?? "" }} className="cn-shorts-author"><ChannelAvatar path={video.profiles?.avatar_path} name={video.profiles?.display_name || video.profiles?.username || "Canal"} size={34} /><span>{video.profiles?.display_name || video.profiles?.username || "Canal"}{video.profiles?.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}</span></Link>
          <h2>{video.title}</h2>
          {video.description && <p className="cn-shorts-description">{video.description}</p>}
          <p className="cn-shorts-stats">{formatViews(video.views ?? 0)} visualizaciones</p>
        </div>
        <div className="cn-shorts-actions">
          <button type="button" aria-label="Me gusta" data-active={liked ? "true" : "false"} onClick={() => void toggleLike()}><Heart className={liked ? "fill-current" : ""} /><span>{likeCount}</span></button>
          <Link to="/watch" search={{ v: video.code }} aria-label="Comentarios"><MessageCircle /><span>Comentarios</span></Link>
          <button type="button" aria-label="Compartir" onClick={() => void share()}><Share2 /><span>Compartir</span></button>
          <Link to="/watch" search={{ v: video.code }} aria-label="Guardar"><Bookmark /><span>Guardar</span></Link>
          <Link to="/watch" search={{ v: video.code }} aria-label="Ver video"><ExternalLink /><span>Ver</span></Link>
          {user?.id === video.user_id && <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label="Más opciones"><MoreVertical /><span>Más</span></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => void toggleShort()}>No mostrar como Short</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
        </div>
      </div>
    </div>
    <div className="cn-shorts-progress" aria-hidden="true"><span /></div>
  </article>;
}

function ShortsPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["shorts-feed"], queryFn: () => fetchShorts(32), staleTime: 30_000, gcTime: 5 * 60_000, refetchOnWindowFocus: true });
  const cardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = cardsRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".cn-shorts-card"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const id = visible?.target.getAttribute("data-video-id");
      if (id) setActiveId(id);
    }, { root, threshold: [0.5, 0.75, 0.95] });
    items.forEach((item) => observer.observe(item));
    if (!activeId && items[0]) setActiveId(items[0].getAttribute("data-video-id"));
    return () => observer.disconnect();
  }, [query.data, activeId]);

  const disableFromFeed = (videoId: string) => {
    qc.setQueryData<ShortVideo[]>(["shorts-feed"], (old) => (old ?? []).filter((video) => video.id !== videoId));
  };

  return <AppShell hideSidebar><div className="cn-shorts-page"><header className="cn-shorts-header"><div><span className="cn-shorts-kicker">Cornet</span><h1>Shorts</h1><p>Videos verticales y cuadrados en un feed continuo.</p></div><Link to="/upload" className="cn-shorts-upload">Crear un Short</Link></header>{query.isLoading ? <div className="cn-shorts-loading"><Loader2 className="h-5 w-5 animate-spin" />Cargando Shorts…</div> : query.data && query.data.length > 0 ? <div ref={cardsRef} className="cn-shorts-feed" aria-label="Feed de Shorts">{query.data.map((video) => <ShortCard key={video.id} video={video} active={activeId === video.id} onDisabled={disableFromFeed} />)}</div> : <section className="cn-shorts-empty"><PlaySquare className="h-8 w-8" /><h2>Aún no hay Shorts</h2><p>Los videos verticales o cuadrados de hasta 180 segundos aparecerán aquí, salvo que el creador los desactive.</p><Button asChild><Link to="/upload">Subir el primero</Link></Button></section>}</div></AppShell>;
}
