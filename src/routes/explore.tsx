import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { VideoCard } from "@/components/VideoCard";
import { fetchVideos, type VideoCategory } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/useTheme";

export const Route = createFileRoute("/explore")({ head: () => ({ meta: [{ title: "Explorar — CoreNetwork" }] }), component: ExplorePage });
const CATEGORIES: VideoCategory[] = ["Autos & Vehicles", "Comedy", "Entertainment", "Film & Animation", "Gaming", "Howto & Style", "Nonprofits & Activism", "People & Blogs", "Pets & Animals", "Science & Technology", "Sports", "Travel & Events"];
const iconFor = (category: string) => ({ "Autos & Vehicles": "🚗", Comedy: "😂", Entertainment: "🎬", "Film & Animation": "🎞", Gaming: "🎮", "Howto & Style": "🛠", "Nonprofits & Activism": "🌍", "People & Blogs": "👤", "Pets & Animals": "🐾", "Science & Technology": "🔬", Sports: "⚽", "Travel & Events": "✈" } as Record<string, string>)[category] ?? "•";

function ExplorePage() {
  const { theme } = useTheme();
  const popular = useQuery({ queryKey: ["explore", "popular"], queryFn: () => fetchVideos({ orderBy: "views", limit: 4 }) });
  const recent = useQuery({ queryKey: ["explore", "recent"], queryFn: () => fetchVideos({ orderBy: "recent", limit: 4 }) });
  const categoryQueries = useQueries({ queries: CATEGORIES.map((category) => ({ queryKey: ["explore", "category", category], queryFn: () => fetchVideos({ category, orderBy: "views", limit: 4 }) })) });

  if (theme !== "retro2012") return <AppShell><h1 className="mb-4 text-xl font-bold">Explorar</h1>{popular.isLoading ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="space-y-3"><Skeleton className="aspect-video w-full rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>)}</div> : <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{popular.data?.map((v) => <VideoCard key={v.id} video={v} />)}</div>}</AppShell>;

  const sections = [{ title: "Más vistos", data: popular.data ?? [] }, { title: "Recientes de la comunidad", data: recent.data ?? [] }, ...CATEGORIES.map((category, index) => ({ title: category, data: categoryQueries[index]?.data ?? [] }))];
  return <AppShell><div className="cn-2012-explore"><aside className="cn-2012-explore-side"><h2>Explorar</h2>{["Inicio", "Más vistos", "Recientes", "Música", ...CATEGORIES].map((item) => <Link key={item} to="/explore" className="cn-2012-category-link">{iconFor(item)} <span>{item}</span></Link>)}</aside><main className="min-w-0 flex-1"><div className="cn-2012-explore-heading"><div><h1>Explorar</h1><p>Descubre videos de toda la comunidad de CoreNetwork.</p></div></div>{sections.map((section) => <section key={section.title} className="cn-2012-video-section"><div className="cn-2012-section-title"><span>{section.title}</span><Link to="/" search={{ q: section.title }}>Ver todo</Link></div>{section.data.length ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{section.data.map((video) => <VideoCard key={video.id} video={video} />)}</div> : <div className="cn-2012-empty">Todavía no hay videos en esta sección.</div>}</section>)}</main></div></AppShell>;
}
