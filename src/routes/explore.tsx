import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { fetchVideos, type VideoCategory } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Car, Clapperboard, Compass, Gamepad2, Globe2, Headphones, Laptop, Laugh, PawPrint, Plane, Trophy, Users, UserPlus, Wrench, PlaySquare, Film, BookOpen, Tv } from "lucide-react";

const CATEGORIES: VideoCategory[] = ["Autos & Vehicles", "Comedy", "Entertainment", "Film & Animation", "Gaming", "Howto & Style", "Nonprofits & Activism", "People & Blogs", "Pets & Animals", "Science & Technology", "Sports", "Travel & Events"];
type ExploreView = "channels" | "series" | "videos";
type ExploreSort = "views" | "recent";
type ExploreSearch = { view: ExploreView; sort?: ExploreSort; category?: string };

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): ExploreSearch => ({
    view: search.view === "channels" ? "channels" : search.view === "series" ? "series" : "videos",
    sort: search.sort === "recent" ? "recent" : "views",
    ...(typeof search.category === "string" && CATEGORIES.includes(search.category as VideoCategory) ? { category: search.category } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Explorar canales, series y videos — Cornet" },
      { name: "description", content: "Descubre videos por categoría, canales recomendados y series dentro de la comunidad de Cornet." },
      { property: "og:title", content: "Explorar — Cornet" },
      { property: "og:description", content: "Videos por categoría, canales recomendados y series de la comunidad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

const iconFor = (category: VideoCategory) => ({ "Autos & Vehicles": Car, Comedy: Laugh, Entertainment: Clapperboard, "Film & Animation": Clapperboard, Gaming: Gamepad2, "Howto & Style": Wrench, "Nonprofits & Activism": Globe2, "People & Blogs": Users, "Pets & Animals": PawPrint, "Science & Technology": Laptop, Sports: Trophy, "Travel & Events": Plane } as Record<VideoCategory, typeof Compass>)[category] ?? Compass;
type RecommendedChannel = { id: string; username: string; display_name: string | null; avatar_path: string | null; subscriber_count: number | null; is_verified: boolean | null };

function ExplorePage() {
  const { view, sort, category } = Route.useSearch();
  const activeSort: ExploreSort = sort ?? "views";
  const activeCategory = category as VideoCategory | undefined;
  const showAllSections = view === "videos" && !activeCategory;

  const recommendedChannels = useQuery({ queryKey: ["explore", "recommended-channels"], enabled: view === "channels", staleTime: 60_000, gcTime: 5 * 60_000, queryFn: async () => { const { data, error } = await supabase.from("profiles").select("id,username,display_name,avatar_path,subscriber_count,is_verified").order("subscriber_count", { ascending: false }).limit(24); if (error) throw error; return (data ?? []) as RecommendedChannel[]; } });
  const filtered = useQuery({ queryKey: ["explore", "filtered", activeCategory ?? null, activeSort], enabled: view === "videos" && !!activeCategory, queryFn: () => fetchVideos({ category: activeCategory as VideoCategory, orderBy: activeSort, limit: 48 }), staleTime: 30_000, gcTime: 5 * 60_000 });
  const popular = useQuery({ queryKey: ["explore", "popular"], enabled: showAllSections, queryFn: () => fetchVideos({ orderBy: "views", limit: 4 }), staleTime: 30_000, gcTime: 5 * 60_000 });
  const recent = useQuery({ queryKey: ["explore", "recent"], enabled: showAllSections, queryFn: () => fetchVideos({ orderBy: "recent", limit: 4 }), staleTime: 30_000, gcTime: 5 * 60_000 });
  const categoryQueries = useQueries({ queries: CATEGORIES.map((item) => ({ queryKey: ["explore", "category", item, activeSort], enabled: showAllSections, queryFn: () => fetchVideos({ category: item, orderBy: activeSort, limit: 4 }), staleTime: 30_000, gcTime: 5 * 60_000 })) });
  const sections = activeSort === "recent"
    ? [{ title: "Recientes de la comunidad", icon: Compass, data: recent.data ?? [] }, { title: "Más vistos", icon: Activity, data: popular.data ?? [] }, ...CATEGORIES.map((item, index) => ({ title: item, icon: iconFor(item), data: categoryQueries[index]?.data ?? [] }))]
    : [{ title: "Más vistos", icon: Activity, data: popular.data ?? [] }, { title: "Recientes de la comunidad", icon: Compass, data: recent.data ?? [] }, ...CATEGORIES.map((item, index) => ({ title: item, icon: iconFor(item), data: categoryQueries[index]?.data ?? [] }))];
  const loading = view === "channels" ? recommendedChannels.isLoading : view === "videos" ? (activeCategory ? filtered.isLoading : popular.isLoading || recent.isLoading) : false;

  return <AppShell><div className="cn-explore-page">
    <aside className="cn-explore-sidebar" aria-label="Explorar categorías">
      <div className="cn-explore-sidebar-brand"><Compass className="h-5 w-5" /><div><span className="cn-explore-kicker">COSMIC PANDA</span><h2>Explorar</h2></div></div>
      <nav className="cn-explore-nav">
        <Link to="/explore" search={{ view: "videos", sort: "views" }} className={view === "videos" && !activeCategory ? "is-active" : ""}><Compass className="h-4 w-4" /><span>Inicio</span></Link>
        <Link to="/explore" search={{ view: "channels", sort: activeSort }} className={view === "channels" ? "is-active" : ""}><UserPlus className="h-4 w-4" /><span>Canales</span></Link>
        <Link to="/explore" search={{ view: "series", sort: activeSort }} className={view === "series" ? "is-active" : ""}><PlaySquare className="h-4 w-4" /><span>Series</span></Link>
        <Link to="/explore" search={{ view: "videos", sort: "views" }} className={view === "videos" && activeSort === "views" && !activeCategory ? "is-active" : ""}><Trophy className="h-4 w-4" /><span>Más vistos</span></Link>
        <Link to="/explore" search={{ view: "videos", sort: "recent" }} className={view === "videos" && activeSort === "recent" && !activeCategory ? "is-active" : ""}><Activity className="h-4 w-4" /><span>Recientes</span></Link>
        <Link to="/" search={{ q: "música" }}><Headphones className="h-4 w-4" /><span>Música</span></Link>
      </nav>
      <div className="cn-explore-sidebar-rule" />
      <div className="cn-explore-sidebar-title">Categorías</div>
      <nav className="cn-explore-nav">{CATEGORIES.map((item) => { const Icon = iconFor(item); return <Link key={item} to="/explore" search={{ view: "videos", sort: activeSort, category: item }} className={`cn-explore-category-link${activeCategory === item ? " is-active" : ""}`}><Icon className="h-4 w-4" /><span>{item}</span></Link>; })}</nav>
    </aside>
    <main className="cn-explore-content">
      {view === "channels" ? <><header className="cn-explore-heading"><div><div className="cn-explore-heading-eyebrow"><UserPlus className="h-4 w-4" /> Descubre nuevos canales</div><h1>Canales recomendados</h1><p>Encuentra creadores y suscríbete a nuevos canales de Cornet.</p></div></header>{loading ? <div className="cn-explore-empty">Cargando canales…</div> : recommendedChannels.data && recommendedChannels.data.length > 0 ? <div className="cn-recommended-grid">{recommendedChannels.data.map((channel) => <Link key={channel.id} to="/c/$username" params={{ username: channel.username }} className="cn-recommended-channel"><ChannelAvatar path={channel.avatar_path} name={channel.display_name || channel.username} size={60} /><div className="min-w-0 flex-1"><div className="flex items-center gap-1"><h2 className="truncate">{channel.display_name || channel.username}</h2>{channel.is_verified && <span className="cn-recommended-verified" aria-label="Verificado">✓</span>}</div><p>@{channel.username}</p><span>{channel.subscriber_count ?? 0} suscriptores</span></div><span className="cn-recommended-follow"><UserPlus className="h-4 w-4" /> Ver canal</span></Link>)}</div> : <div className="cn-explore-empty">Todavía no hay canales recomendados.</div>}</>
      : view === "series" ? <><header className="cn-explore-heading"><div><div className="cn-explore-heading-eyebrow"><Tv className="h-4 w-4" /> Programas de Cornet</div><h1>Series</h1><p>Colecciones de episodios para ver de principio a fin.</p></div></header><div className="cn-series-grid">{[{ title: "Cornet Originals", description: "Historias y especiales producidos para la comunidad.", icon: Film, query: "originals" }, { title: "Gaming Weekly", description: "Partidas, noticias y momentos destacados de gaming.", icon: Gamepad2, query: "gaming" }, { title: "Tech & How-To", description: "Guías y explicaciones organizadas por episodios.", icon: BookOpen, query: "tutorial" }, { title: "Community Spotlight", description: "Creadores y proyectos destacados de Cornet.", icon: Users, query: "community" }].map((series) => { const Icon = series.icon; return <Link key={series.title} to="/" search={{ q: series.query }} className="cn-series-card"><div className="cn-series-card-icon"><Icon className="h-7 w-7" /></div><div><h2>{series.title}</h2><p>{series.description}</p><span>Ver episodios →</span></div></Link>; })}</div><section className="cn-series-note"><PlaySquare className="h-5 w-5" /><div><strong>Las Series están preparadas para crecer contigo.</strong><p>La navegación ya está separada para que podamos añadir temporadas y episodios reales después sin cambiar el diseño.</p></div></section></>
      : <>
        <header className="cn-explore-heading"><div><div className="cn-explore-heading-eyebrow"><Compass className="h-4 w-4" /> Descubre algo nuevo</div><h1>{activeCategory ?? "Explorar"}</h1><p>{activeCategory ? `Videos de la categoría ${activeCategory}.` : "Videos de toda la comunidad de Cornet."}</p></div></header>
        <div className="cn-explore-tabs" role="navigation" aria-label="Explorar">
          <Link to="/explore" search={{ view: "videos", sort: "views", ...(activeCategory ? { category: activeCategory } : {}) }} className={activeSort === "views" ? "is-active" : ""}><Compass className="h-4 w-4" /> Inicio</Link>
          <Link to="/explore" search={{ view: "series", sort: activeSort }}><PlaySquare className="h-4 w-4" /> Series</Link>
          <Link to="/explore" search={{ view: "videos", sort: "views", ...(activeCategory ? { category: activeCategory } : {}) }} className={activeSort === "views" ? "is-active" : ""}><Trophy className="h-4 w-4" /> Más vistos</Link>
          <Link to="/explore" search={{ view: "videos", sort: "recent", ...(activeCategory ? { category: activeCategory } : {}) }} className={activeSort === "recent" ? "is-active" : ""}><Activity className="h-4 w-4" /> Recientes</Link>
          {CATEGORIES.slice(0, 5).map((item) => { const Icon = iconFor(item); return <Link key={item} to="/explore" search={{ view: "videos", sort: activeSort, category: item }} className={activeCategory === item ? "is-active" : ""}><Icon className="h-4 w-4" /> {item}</Link>; })}
        </div>
        {loading ? <div className="cn-explore-empty">Cargando videos…</div>
          : activeCategory ? <section className="cn-explore-section">{filtered.data && filtered.data.length > 0 ? <div className="cn-explore-grid">{filtered.data.map((video) => <VideoCard key={video.id} video={video} />)}</div> : <div className="cn-explore-empty">Todavía no hay videos en {activeCategory}.</div>}</section>
          : sections.map((section) => { const Icon = section.icon; const isCategory = CATEGORIES.includes(section.title as VideoCategory); const targetSort: ExploreSort = section.title === "Más vistos" ? "views" : "recent"; return <section key={section.title} className="cn-explore-section"><div className="cn-explore-section-head"><div className="cn-explore-section-title"><Icon className="h-4 w-4" /><h2>{section.title}</h2></div>{isCategory ? <Link to="/explore" search={{ view: "videos", sort: activeSort, category: section.title }}>Ver todo</Link> : <Link to="/explore" search={{ view: "videos", sort: targetSort }}>Ver todo</Link>}</div>{section.data.length > 0 ? <div className="cn-explore-grid">{section.data.map((video) => <VideoCard key={video.id} video={video} />)}</div> : <div className="cn-explore-empty">Todavía no hay videos en esta sección.</div>}</section>; })}
      </>}
    </main>
  </div></AppShell>;
}
