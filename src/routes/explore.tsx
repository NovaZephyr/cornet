import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { VideoCard } from "@/components/VideoCard";
import { fetchVideos, type VideoCategory } from "@/lib/queries";
import { useTheme } from "@/hooks/useTheme";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Explorar — CoreNetwork" }] }),
  component: ExplorePage,
});

const CATEGORIES: VideoCategory[] = [
  "Autos & Vehicles",
  "Comedy",
  "Entertainment",
  "Film & Animation",
  "Gaming",
  "Howto & Style",
  "Nonprofits & Activism",
  "People & Blogs",
  "Pets & Animals",
  "Science & Technology",
  "Sports",
  "Travel & Events",
];

const iconFor = (category: string) =>
  ({
    "Autos & Vehicles": "🚗",
    Comedy: "😂",
    Entertainment: "🎬",
    "Film & Animation": "🎞️",
    Gaming: "🎮",
    "Howto & Style": "🛠️",
    "Nonprofits & Activism": "🌍",
    "People & Blogs": "👤",
    "Pets & Animals": "🐾",
    "Science & Technology": "🔬",
    Sports: "⚽",
    "Travel & Events": "✈️",
  } as Record<string, string>)[category] ?? "•";

function ExplorePage() {
  const { theme } = useTheme();
  const popular = useQuery({
    queryKey: ["explore", "popular"],
    queryFn: () => fetchVideos({ orderBy: "views", limit: 4 }),
  });
  const recent = useQuery({
    queryKey: ["explore", "recent"],
    queryFn: () => fetchVideos({ orderBy: "recent", limit: 4 }),
  });
  const categoryQueries = useQueries({
    queries: CATEGORIES.map((category) => ({
      queryKey: ["explore", "category", category],
      queryFn: () => fetchVideos({ category, orderBy: "views", limit: 4 }),
    })),
  });

  const sections = [
    { title: "Más vistos", data: popular.data ?? [] },
    { title: "Recientes de la comunidad", data: recent.data ?? [] },
    ...CATEGORIES.map((category, index) => ({
      title: category,
      data: categoryQueries[index]?.data ?? [],
    })),
  ];

  const loading = popular.isLoading || recent.isLoading;

  return (
    <AppShell>
      <div className={`cn-explore-page cn-explore-page--${theme}`}>
        <aside className="cn-explore-sidebar" aria-label="Explorar categorías">
          <h2>Explorar</h2>
          <nav className="cn-explore-nav">
            <Link to="/explore" className="is-active">
              <span>•</span><span>Inicio</span>
            </Link>
            <Link to="/explore">
              <span>🔥</span><span>Más vistos</span>
            </Link>
            <Link to="/explore">
              <span>🕘</span><span>Recientes</span>
            </Link>
            <Link to="/explore">
              <span>🎵</span><span>Música</span>
            </Link>
            {CATEGORIES.map((category) => (
              <Link key={category} to="/explore" className="cn-explore-category-link">
                <span>{iconFor(category)}</span>
                <span>{category}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="cn-explore-content">
          <header className="cn-explore-heading">
            <div>
              <h1>Explorar</h1>
              <p>Descubre videos de toda la comunidad de CoreNetwork.</p>
            </div>
          </header>

          <div className="cn-explore-tabs" role="navigation" aria-label="Explorar">
            <button type="button" className="is-active">Inicio</button>
            <button type="button">Más vistos</button>
            <button type="button">Recientes</button>
            {CATEGORIES.slice(0, 5).map((category) => (
              <button key={category} type="button">{iconFor(category)} {category}</button>
            ))}
          </div>

          {loading ? (
            <div className="cn-explore-empty">Cargando videos…</div>
          ) : (
            sections.map((section) => (
              <section key={section.title} className="cn-explore-section">
                <div className="cn-explore-section-head">
                  <h2>{section.title}</h2>
                  <Link to="/" search={{ q: section.title }}>Ver todo</Link>
                </div>
                {section.data.length > 0 ? (
                  <div className="cn-explore-grid">
                    {section.data.map((video) => <VideoCard key={video.id} video={video} />)}
                  </div>
                ) : (
                  <div className="cn-explore-empty">Todavía no hay videos en esta sección.</div>
                )}
              </section>
            ))
          )}
        </main>
      </div>
    </AppShell>
  );
}
