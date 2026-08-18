import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { fetchHomeFeed, fetchVideos, searchChannels, type VideoSort } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SearchOrder = "subscribers" | "views" | "recent" | "oldest";
type HomeSearch = { q?: string; sort?: SearchOrder };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    ...(typeof search.q === "string" && search.q.trim() ? { q: search.q } : {}),
    ...(search.sort === "subscribers" || search.sort === "views" || search.sort === "recent" || search.sort === "oldest" ? { sort: search.sort } : {}),
  }),
  head: () => ({ meta: [{ title: "CoreNetwork — Free Yourself" }] }),
  component: Home,
});

function Home() {
  const { q, sort = "recent" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const hasFilters = !!q || sort !== "recent";
  const videoSort: VideoSort = sort;
  const videosQuery = useQuery({
    queryKey: hasFilters ? ["videos", q ?? null, videoSort] : ["home-feed"],
    queryFn: () => hasFilters
      ? fetchVideos({ ...(q ? { search: q } : {}), orderBy: videoSort, limit: 24 })
      : fetchHomeFeed(24),
    staleTime: hasFilters ? 60_000 : 30_000,
    gcTime: 5 * 60_000,
  });
  const channelsQuery = useQuery({
    queryKey: ["channels", q ?? null, sort],
    enabled: !!q,
    queryFn: () => searchChannels(q, sort === "subscribers" ? "subscribers" : "recent"),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
  const setSort = (next: SearchOrder) => { void navigate({ to: "/", search: q ? { q, sort: next } : next === "recent" ? {} : { sort: next } }); };

  return <AppShell>
    <h1 className="sr-only">Videos y canales en CoreNetwork</h1>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>{q ? <p className="text-sm text-muted-foreground">Resultados para <span className="font-medium text-foreground">“{q}”</span></p> : <p className="text-sm text-muted-foreground">{hasFilters ? "Videos filtrados" : "Recomendaciones para ti"}</p>}</div>
      <Select value={sort} onValueChange={(value) => setSort(value as SearchOrder)}><SelectTrigger className="w-48"><SelectValue placeholder="Ordenar" /></SelectTrigger><SelectContent><SelectItem value="subscribers">Más suscripciones</SelectItem><SelectItem value="views">Más vistos</SelectItem><SelectItem value="recent">Más recientes</SelectItem><SelectItem value="oldest">Más antiguos</SelectItem></SelectContent></Select>
    </div>
    {q && channelsQuery.data && channelsQuery.data.length > 0 && <section className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Canales</h2><span className="text-xs text-muted-foreground">{channelsQuery.data.length} resultados</span></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{channelsQuery.data.map((channel) => <Link key={channel.id} to="/c/$username" params={{ username: channel.username }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-surface-hover"><ChannelAvatar path={channel.avatar_path} name={channel.display_name || channel.username} size={48} /><div className="min-w-0"><div className="flex items-center gap-1 truncate font-medium">{channel.display_name || channel.username}{channel.is_verified && <VerifiedBadge className="h-4 w-4" />}</div><p className="truncate text-xs text-muted-foreground">@{channel.username} · {channel.subscriber_count ?? 0} suscriptores</p></div></Link>)}</div></section>}
    {q && <h2 className="mb-4 text-lg font-semibold">Videos</h2>}
    {videosQuery.isLoading ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="space-y-3"><Skeleton className="aspect-video w-full rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>)}</div> : videosQuery.data && videosQuery.data.length > 0 ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{videosQuery.data.map((v) => <VideoCard key={v.id} video={v} />)}</div> : <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center"><p className="text-lg font-medium">No encontramos videos</p><p className="mt-1 text-sm text-muted-foreground">Prueba otra búsqueda o cambia los filtros.</p>{q && <Button className="mt-4" variant="secondary" onClick={() => void navigate({ to: "/" })}>Limpiar búsqueda</Button>}</div>}
  </AppShell>;
}
