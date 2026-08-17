import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { VideoCard } from "@/components/VideoCard";
import { fetchVideos, type VideoCategory } from "@/lib/queries";
import {
  Activity,
  Car,
  Clapperboard,
  Compass,
  Gamepad2,
  Globe2,
  Headphones,
  Laptop,
  Laugh,
  PawPrint,
  Plane,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";

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

const iconFor = (category: VideoCategory) => {
  const icons: Record<VideoCategory, typeof Compass> = {
    "Autos & Vehicles": Car,
    Comedy: Laugh,
    Entertainment: Clapperboard,
    "Film & Animation": Clapperboard,
    Gaming: Gamepad2,
    "Howto & Style": Wrench,
    "Nonprofits & Activism": Globe2,
    "People & Blogs": Users,
    "Pets & Animals": PawPrint,
    "Science & Technology": Laptop,
    Sports: Trophy,
    "Travel & Events": Plane,
  };
  return icons[category] ?? Compass;
};

function ExplorePage() {
  const popular = useQuery({
    queryKey: ["explore", "popular"],
    queryFn: () => fetchVideos({ orderBy: "views", limit: 4 }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
  const recent = useQuery({
    queryKey: ["explore", "recent"],
    queryFn: () => fetchVideos({ orderBy: "recent", limit: 4 }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
  const categoryQueries = useQueries({
    queries: CATEGORIES.map((category) => ({
      queryKey: ["explore", "category", category],
      queryFn: () => fetchVideos({ category, orderBy: "views", limit: 4 }),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    })),
  });

  const sections = [
    { title: "Más vistos", icon: Activity, data: popular.data ?? [] },
    { title: "Recientes de la comunidad", icon: Compass, data: recent.data ?? [] },
    ...CATEGORIES.map((category, index) => ({
      title: category,
      icon: iconFor(category),
      data: categoryQueries[index]?.data ?? [],
    })),
  ];

  const loading = popular.isLoading || recent.isLoading;

  return (
    <AppShell>
      <div className="cn-explore-page">
        <aside className="cn-explore-sidebar" aria-label="Explorar categorías">
          <div className="cn-explore-sidebar-brand">
            <Compass className="h-5 w-5" />
            <div>
              <span className="cn-explore-kicker">COSMIC PANDA</span>
              <h2>Explorar</h2>
            </div>
          </div>

          <nav className="cn-explore-nav">
            <Link to="/explore" className="is-active" aria-label="Inicio">
              <Compass className="h-4 w-4" />
              <span>Inicio</span>
            </Link>
            <Link to="/explore" aria-label="Más vistos">
              <Trophy className="h-4 w-4" />
              <span>Más vistos</span>
            </Link>
            <Link to="/explore" aria-label="Recientes">
              <Activity className="h-4 w-4" />
              <span>Recientes</span>
            </Link>
            <Link to="/explore" aria-label="Música">
              <Headphones className="h-4 w-4" />
              <span>Música</span>
            </Link>
          </nav>

          <div className="cn-explore-sidebar-rule" />
          <div className="cn-explore-sidebar-title">Categorías</div>
          <nav className="cn-explore-nav">
            {CATEGORIES.map((category) => {
              const Icon = iconFor(category);
              return (
                <Link key={category} to="/explore" className="cn-explore-category-link" aria-label={category}>
                  <Icon className="h-4 w-4" />
                  <span>{category}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="cn-explore-content">
          <header className="cn-explore-heading">
            <div>
              <div className="cn-explore-heading-eyebrow"><Compass className="h-4 w-4" /> Descubre algo nuevo</div>
              <h1>Explorar</h1>
              <p>Videos de toda la comunidad de CoreNetwork.</p>
            </div>
          </header>

          <div className="cn-explore-tabs" role="navigation" aria-label="Explorar">
            <button type="button" className="is-active"><Compass className="h-4 w-4" /> Inicio</button>
            <button type="button"><Trophy className="h-4 w-4" /> Más vistos</button>
            <button type="button"><Activity className="h-4 w-4" /> Recientes</button>
            {CATEGORIES.slice(0, 5).map((category) => {
              const Icon = iconFor(category);
              return <button key={category} type="button"><Icon className="h-4 w-4" /> {category}</button>;
            })}
          </div>

          {loading ? (
            <div className="cn-explore-empty">Cargando videos…</div>
          ) : (
            sections.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.title} className="cn-explore-section">
                  <div className="cn-explore-section-head">
                    <div className="cn-explore-section-title"><Icon className="h-4 w-4" /><h2>{section.title}</h2></div>
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
              );
            })
          )}
        </main>
      </div>
    </AppShell>
  );
}
