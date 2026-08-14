import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { VideoCard } from "@/components/VideoCard";
import { fetchVideos } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

type HomeSearch = { q?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch =>
    typeof search["q"] === "string" && search["q"] ? { q: search["q"] } : {},
  head: () => ({
    meta: [
      { title: "CoreNetwork — Free Yourself" },
      {
        name: "description",
        content:
          "Watch videos, subscribe channels and join to the community in CoreNetwork.",
      },
      { property: "og:title", content: "CoreNetwork — Free Yourself" },
      {
        property: "og:description",
        content: "Watch videos, subscribe channels and join to the community in CoreNetwork",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["videos", q ?? null],
    queryFn: () => fetchVideos(q ? { search: q } : {}),
  });

  return (
    <AppShell>
      <h1 className="sr-only">Videos recomendados en CoreNetwork</h1>
      {q && (
        <p className="mb-4 text-sm text-muted-foreground">
          Resultados para <span className="text-foreground">“{q}”</span>
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
          <p className="text-lg font-medium">Todavía no hay videos aquí</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube el primer video y empieza tu canal.
          </p>
        </div>
      )}
    </AppShell>
  );
}
