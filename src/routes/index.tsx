import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { fetchHomeFeed, fetchVideos, searchChannels, type VideoSort } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";

type SearchOrder = "recommended" | "subscribers" | "views" | "recent" | "oldest";
type HomeSearch = { q?: string; sort?: SearchOrder };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    ...(typeof search.q === "string" && search.q.trim() ? { q: search.q } : {}),
    ...(search.sort === "recommended" || search.sort === "subscribers" || search.sort === "views" || search.sort === "recent" || search.sort === "oldest" ? { sort: search.sort } : {}),
  }),
  head: () => ({ meta: [{ title: "CoreNetwork — Free Yourself" }] }),
  component: Home,
});

function Home() {
  const { q, sort = "recommended" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { theme } = useTheme();
  const isRecommended = !q && sort === "recommended";
  const isPolymerHome = theme === "youtube2019" && !q;
  const videoSort: VideoSort = sort === "subscribers" || sort === "views" || sort === "recent" || sort === "oldest" ? sort : "recent";
  const videosQuery = useQuery({
    queryKey: ["home-feed", q ?? null, sort],
    queryFn: () => isRecommended ? fetchHomeFeed(32) : fetchVideos({ ...(q ? { search: q } : {}), orderBy: videoSort, limit: 24 }),
    staleTime: isRecommended ? 30_000 : 60_000,
    gcTime: 5 * 60_000,
  });
  const channelsQuery = useQuery({
    queryKey: ["channels", q ?? null, sort],
    enabled: !!q,
    queryFn: () => searchChannels(q, sort === "subscribers" ? "subscribers" : "recent"),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
  const setSort = (next: SearchOrder) => { void navigate({ to: "/", search: q ? { q, sort: next } : next === "recommended" ? {} : { sort: next } }); };

  const polymerShelves = (() => {
    const rows = videosQuery.data ?? [];
    const buckets = new Map<string, typeof rows>();
    for (const video of rows) {
      const key = video.category?.trim() || "Recomendados";
      const existing = buckets.get(key) ?? [];
      if (existing.length < 4) existing.push(video);
      buckets.set(key, existing);
    }
    const shelves = Array.from(buckets.entries()).filter(([, items]) => items.length >= 2).slice(0, 8);
    if (shelves.length === 0 && rows.length > 0) return [["Recomendados", rows.slice(0, 4)]] as const;
    return shelves;
  })();

  return <AppShell>
    <h1 className="sr-only">Videos y canales en CoreNetwork</h1>
    {isPolymerHome ? <>
      <nav className="cn-polymer-home-tabs" aria-label="Filtros de inicio">
        <Link to="/" search={{}} className={sort === "recommended" ? "is-active" : ""}>Recomendados</Link>
        <Link to="/" search={{ sort: "views" }} className={sort === "views" ? "is-active" : ""}>Más vistos</Link>
        <Link to="/" search={{ sort: "recent" }} className={sort === "recent" ? "is-active" : ""}>Más recientes</Link>
        <Link to="/" search={{ sort: "oldest" }} className={sort === "oldest" ? "is-active" : ""}>Más antiguos</Link>
        <Link to="/" search={{ sort: "subscribers" }} className={sort === "subscribers" ? "is-active" : ""}>Más suscripciones</Link>
      </nav>
      <div className="cn-polymer-home-frame">
        {videosQuery.isLoading ? <div className="cn-polymer-shelf-grid">{Array.from({ length: 16 }).map((_, i) => <div key={i} className="cn-polymer-skeleton"><Skeleton className="aspect-video w-full rounded-none" /><Skeleton className="mt-2 h-4 w-5/6" /><Skeleton className="mt-2 h-3 w-3/5" /></div>)}</div> : polymerShelves.length > 0 ? polymerShelves.map(([title, videos], shelfIndex) => <section className="cn-polymer-shelf" key={`${title}-${shelfIndex}`}><div className="cn-polymer-shelf-heading"><h2>{title}</h2><span>{sort === "recommended" ? "Recommended videos" : "Videos"}</span></div><div className="cn-polymer-video-grid">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div></section>) : <div className="cn-polymer-empty"><p>No encontramos videos.</p></div>}
      </div>
    </> : <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>{q ? <p className="text-sm text-muted-foreground">Resultados para <span className="font-medium text-foreground">“{q}”</span></p> : <p className="text-sm text-muted-foreground">{isRecommended ? "Recomendados para ti" : "Videos filtrados"}</p>}</div>
        <Select value={sort} onValueChange={(value) => setSort(value as SearchOrder)}><SelectTrigger className="w-48"><SelectValue placeholder="Ordenar" /></SelectTrigger><SelectContent><SelectItem value="recommended">Recomendados</SelectItem><SelectItem value="subscribers">Más suscripciones</SelectItem><SelectItem value="views">Más vistos</SelectItem><SelectItem value="recent">Más recientes</SelectItem><SelectItem value="oldest">Más antiguos</SelectItem></SelectContent></Select>
      </div>
      {q && channelsQuery.data && channelsQuery.data.length > 0 && <section className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Canales</h2><span className="text-xs text-muted-foreground">{channelsQuery.data.length} resultados</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{channelsQuery.data.map((channel) => <Link key={channel.id} to="/c/$username" params={{ username: channel.username }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-surface-hover"><ChannelAvatar path={channel.avatar_path} name={channel.display_name || channel.username} size={48} /><div className="min-w-0"><div className="flex items-center gap-1 truncate font-medium">{channel.display_name || channel.username}{channel.is_verified && <VerifiedBadge className="h-4 w-4" />}</div><p className="truncate text-xs text-muted-foreground">@{channel.username} · {channel.subscriber_count ?? 0} suscriptores</p></div></Link>)}</div></section>}
      {q && <h2 className="mb-4 text-lg font-semibold">Videos</h2>}
      {videosQuery.isLoading ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="space-y-3"><Skeleton className="aspect-video w-full rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>)}</div> : videosQuery.data && videosQuery.data.length > 0 ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{videosQuery.data.map((v) => <VideoCard key={v.id} video={v} />)}</div> : <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center"><p className="text-lg font-medium">No encontramos videos</p><p className="mt-1 text-sm text-muted-foreground">Prueba otra búsqueda o cambia los filtros.</p>{q && <Button className="mt-4" variant="secondary" onClick={() => void navigate({ to: "/" })}>Limpiar búsqueda</Button>}</div>}
    </>}
  </AppShell>;
}
