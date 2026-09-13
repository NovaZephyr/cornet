import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { VideoCard } from "@/components/VideoCard";
import { fetchHomeFeed } from "@/lib/queries";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

function HomeRoute() {
  const { data: videos = [], isLoading, error } = useQuery({
    queryKey: ["home-feed"],
    queryFn: () => fetchHomeFeed(24),
  });

  if (isLoading) {
    return (
      <main className="cn-home">
        <div className="cn-home-loading">Cargando contenido...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="cn-home">
        <div className="cn-home-error">No se pudo cargar la página de inicio.</div>
      </main>
    );
  }

  return (
    <main className="cn-home">
      <section className="cn-home-section">
        <header className="cn-home-section-header">
          <h1>Inicio</h1>
        </header>

        {videos.length === 0 ? (
          <div className="cn-home-empty">No hay videos disponibles todavía.</div>
        ) : (
          <div className="cn-home-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
