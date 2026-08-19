import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, PlaySquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelAvatar } from "@/components/Media";
import { useSignedUrl } from "@/lib/storage";
import { fetchShorts } from "@/lib/shorts";
import { formatViews } from "@/lib/format";
import { AppShell } from "@/components/AppShell";
import "@/shorts.css";

export const Route = createFileRoute("/shorts")({
  head: () => ({ meta: [{ title: "Shorts — Cornet" }] }),
  component: ShortsPage,
});

function ShortCard({ video }: { video: Awaited<ReturnType<typeof fetchShorts>>[number] }) {
  const videoUrl = useSignedUrl(video.video_path);
  const posterUrl = useSignedUrl(video.thumbnail_path);
  return <article className="cn-shorts-card">
    <div className="cn-shorts-player-wrap">
      {videoUrl ? <video className="cn-shorts-player" src={videoUrl} poster={posterUrl ?? undefined} playsInline controls preload="metadata" /> : <div className="cn-shorts-unavailable">Este Short no está disponible.</div>}
      <div className="cn-shorts-gradient" />
      <div className="cn-shorts-overlay">
        <div className="cn-shorts-meta">
          <div className="cn-shorts-title-row"><PlaySquare className="h-4 w-4" /><strong>{video.title}</strong></div>
          <p>{formatViews(video.views ?? 0)} visualizaciones</p>
        </div>
        <div className="cn-shorts-actions"><Button asChild size="sm" variant="secondary"><Link to="/watch" search={{ v: video.code }}><ExternalLink className="mr-1.5 h-4 w-4" />Ver video</Link></Button></div>
      </div>
    </div>
  </article>;
}

function ShortsPage() {
  const query = useQuery({ queryKey: ["shorts-feed"], queryFn: () => fetchShorts(24), staleTime: 30_000, gcTime: 5 * 60_000 });
  return <AppShell hideSidebar>
    <div className="cn-shorts-page">
      <header className="cn-shorts-header"><div><span className="cn-shorts-kicker">Cornet</span><h1>Shorts</h1><p>Videos cortos de hasta 60 segundos, en un formato vertical y continuo.</p></div><Link to="/upload" className="cn-shorts-upload">Crear un video corto</Link></header>
      {query.isLoading ? <div className="cn-shorts-loading"><Loader2 className="h-5 w-5 animate-spin" />Cargando Shorts…</div> : query.data && query.data.length > 0 ? <div className="cn-shorts-feed" aria-label="Feed de Shorts">{query.data.map((video) => <ShortCard key={video.id} video={video} />)}</div> : <section className="cn-shorts-empty"><PlaySquare className="h-8 w-8" /><h2>Aún no hay Shorts</h2><p>Los videos públicos de hasta 60 segundos aparecerán aquí.</p><Button asChild><Link to="/upload">Subir el primero</Link></Button></section>}
    </div>
  </AppShell>;
}
