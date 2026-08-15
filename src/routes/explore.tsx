import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { VideoCard } from "@/components/VideoCard";
import { fetchVideos } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explorar — CoreNetwork" },
      {
        name: "description",
        content: "Descubre los videos más vistos y recientes en CoreNetwork.",
      },
      { property: "og:title", content: "Explorar — CoreNetwork" },
      { property: "og:description", content: "Los videos más populares de la comunidad." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["videos", "explore"],
    queryFn: () => fetchVideos({ orderBy: "views" }),
  });

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Explorar</h1>

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
          <p className="text-lg font-medium">Todavía no hay videos populares</p>
          <p className="mt-1 text-sm text-muted-foreground">Vuelve pronto.</p>
        </div>
      )}
    </AppShell>
  );
}
