import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video/VideoCard";
import { ChannelAvatar } from "@/components/channel/ChannelAvatar";
import { VerifiedBadge } from "@/components/channel/VerifiedBadge";
import { fetchHomeFeed, fetchVideos, searchChannels, type SearchOrder } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

export default function HomePage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/" });
  const { theme } = useTheme();
  const q = typeof search.q === "string" ? search.q : undefined;
  const sort = (typeof search.sort === "string" ? search.sort : "recommended") as SearchOrder;
  const isRecommended = sort === "recommended";
  const isCornet2016Home = theme === "cornet-2016" && !q;

  const videosQuery = useQuery({
    queryKey: ["home-feed", q ?? null, sort],
    queryFn: () => isRecommended ? fetchHomeFeed(32) : fetchVideos({ order: sort, limit: 32 }),
    staleTime: 60_000,
  });

  const channelsQuery = useQuery({
    queryKey: ["channel-search", q],
    queryFn: () => searchChannels(q!, 12),
    enabled: Boolean(q),
    staleTime: 60_000,
  });

  const videos = videosQuery.data ?? [];
  const polymerShelves = [
    ["Recomendados", videos.slice(0, 8)],
    ["Más para ti", videos.slice(8, 16)],
    ["Más videos", videos.slice(16, 24)],
  ] as const;
  const cosmicFeatured = videos[0];
  const cosmicRecommendations = videos.slice(1, 5);
  const cosmicShelves = [
    ["Recomendados", videos.slice(5, 13)],
    ["Más videos", videos.slice(13, 21)],
  ] as const;
  const polymerFilters = [
    { value: "recommended", label: "Inicio" },
    { value: "recent", label: "Más recientes" },
    { value: "views", label: "Más vistos" },
  ];
  const cosmicFilters = [
    { value: "recommended", label: "Para ti" },
    { value: "recent", label: "Recientes" },
    { value: "views", label: "Populares" },
  ];
  const isPolymerHome = theme === "yt-2019" && !q;
  const isCosmicHome = theme === "cosmic-panda" && !q;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        {isPolymerHome ? <>
          <nav className="cn-polymer-home-tabs" aria-label="Filtros de inicio">
            {polymerFilters.map((filter) => <button key={filter.value} type="button" onClick={() => void navigate({ to: "/", search: (prev) => ({ ...prev, sort: filter.value }) })} className={sort === filter.value ? "is-active" : ""}>{filter.label}</button>)}
          </nav>
          <div className="cn-polymer-home-frame">
            {videosQuery.isLoading ? <div className="cn-polymer-shelf-grid">{Array.from({ length: 16 }).map((_, i) => <div key={i} className="cn-polymer-skeleton"><Skeleton className="aspect-video w-full rounded-none" /><Skeleton className="mt-2 h-4 w-5/6" /><Skeleton className="mt-2 h-3 w-3/5" /></div>)}</div> : polymerShelves.length > 0 ? polymerShelves.map(([title, videos], shelfIndex) => <section className="cn-polymer-shelf" key={`${title}-${shelfIndex}`}><div className="cn-polymer-shelf-heading"><h2>{title}</h2><span>{sort === "recommended" ? "Recomendados" : "Filtrado"}</span></div><div className="cn-polymer-video-grid">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div></section>) : <div className="cn-polymer-empty"><p>No encontramos videos.</p></div>}
          </div>
        </> : isCosmicHome ? <>
          <div className="cn-cosmic-home">
            <nav className="cn-cosmic-home-tabs" aria-label="Filtros de inicio">
              {cosmicFilters.map((filter) => <button key={filter.value} type="button" onClick={() => void navigate({ to: "/", search: (prev) => ({ ...prev, sort: filter.value }) })} className={sort === filter.value ? "is-active" : ""}>{filter.label}</button>)}
            </nav>
            {videosQuery.isLoading ? <div className="cn-cosmic-shelf"><div className="cn-cosmic-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i}><Skeleton className="aspect-video w-full rounded-none" /><Skeleton className="mt-2 h-3 w-4/5" /><Skeleton className="mt-1 h-2 w-2/5" /></div>)}</div></div> : cosmicFeatured ? <>
              <section className="cn-cosmic-feature">
                <div className="cn-cosmic-feature-main">
                  <VideoCard video={cosmicFeatured} />
                </div>
                {cosmicRecommendations.length > 0 && <aside className="cn-cosmic-feature-list" aria-label="Videos recomendados">{cosmicRecommendations.map((video) => <VideoCard key={video.id} video={video} compact />)}</aside>}
              </section>
              {cosmicShelves.map(([title, videos], shelfIndex) => <section className="cn-cosmic-shelf" key={`${title}-${shelfIndex}`}><div className="cn-cosmic-shelf-heading"><h2>{title}</h2><span>{videos.length} videos</span></div><div className="cn-cosmic-grid">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div></section>)}
            </> : <section className="cn-cosmic-shelf"><p className="py-16 text-center text-sm text-muted-foreground">No encontramos videos.</p></section>}
          </div>
        </> : <div className={isCornet2016Home ? "cn-cornet-2016-home" : undefined}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>{q ? <p className="text-sm text-muted-foreground">Resultados para <span className="font-medium text-foreground">“{q}”</span></p> : <p className="text-sm text-muted-foreground">{isRecommended ? "Recomendados para ti" : "Videos filtrados"}</p>}</div>
            <Select value={sort} onValueChange={(value) => void navigate({ to: "/", search: (prev) => ({ ...prev, sort: value }) })}><SelectTrigger className="w-48"><SelectValue placeholder="Ordenar" /></SelectTrigger><SelectContent><SelectItem value="recommended">Recomendados</SelectItem><SelectItem value="subscribers">Más suscripciones</SelectItem><SelectItem value="views">Más vistos</SelectItem><SelectItem value="recent">Más recientes</SelectItem><SelectItem value="oldest">Más antiguos</SelectItem></SelectContent>
          </div>
          {q && channelsQuery.data && channelsQuery.data.length > 0 && <section className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Canales</h2><span className="text-xs text-muted-foreground">{channelsQuery.data.length} resultados</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{channelsQuery.data.map((channel) => <Link key={channel.id} to="/c/$username" params={{ username: channel.username }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-surface-hover"><ChannelAvatar path={channel.avatar_path} name={channel.display_name || channel.username} size={48} /><div className="min-w-0"><div className="flex items-center gap-1 truncate font-medium">{channel.display_name || channel.username}{channel.is_verified && <VerifiedBadge className="h-4 w-4" />}</div><p className="truncate text-xs text-muted-foreground">@{channel.username} · {channel.subscriber_count ?? 0} suscriptores</p></div></Link>)}</div></section>}
          {isCornet2016Home && videosQuery.data && videosQuery.data.length > 0 && <section className="cn-cornet-2016-featured" aria-label="Video destacado">
            <div className="cn-cornet-2016-featured-label">DESTACADO</div>
            <div className="cn-cornet-2016-featured-card"><VideoCard video={videosQuery.data[0]} /></div>
            <div className="cn-cornet-2016-featured-side">{videosQuery.data.slice(1, 4).map((video) => <VideoCard key={video.id} video={video} compact />)}</div>
          </section>}
          {q && <h2 className="mb-4 text-lg font-semibold">Videos</h2>}
          {videosQuery.isLoading ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="space-y-3"><Skeleton className="aspect-video w-full rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>)}</div> : videosQuery.data && videosQuery.data.length > 0 ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{(isCornet2016Home ? videosQuery.data.slice(4) : videosQuery.data).map((v) => <VideoCard key={v.id} video={v} />)}</div> : <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center"><p className="text-lg font-medium">No encontramos videos</p><p className="mt-1 text-sm text-muted-foreground">Prueba otra búsqueda o cambia los filtros.</p>{q && <Button className="mt-4" variant="secondary" onClick={() => void navigate({ to: "/" })}>Limpiar búsqueda</Button>}</div>}
        </div>}
      </main>
    </AppShell>
  );
}
