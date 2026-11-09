import "@/cornet-reference-pages.css";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, ListVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/series")({ component: SeriesPage });

type SeriesRow = { id: string; title: string; description: string; visibility: string; user_id: string; created_at: string };
type ProfileRow = { id: string; username: string; display_name: string; avatar_path: string | null };
type CountRow = { playlist_id: string; videos: { thumbnail_path: string | null } | { thumbnail_path: string | null }[] | null };

function SeriesPage() {
  const series = useQuery({
    queryKey: ["public-series"],
    queryFn: async () => {
      const { data, error } = await supabase.from("playlists").select("id,title,description,visibility,user_id,created_at").or("kind.eq.series,is_series.eq.true").eq("visibility", "public").order("updated_at", { ascending: false }).limit(60);
      if (error) throw error;
      const rows = (data ?? []) as SeriesRow[];
      const userIds = [...new Set(rows.map((row) => row.user_id))];
      const seriesIds = rows.map((row) => row.id);
      const [{ data: profiles }, { data: items }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id,username,display_name,avatar_path").in("id", userIds) : Promise.resolve({ data: [], error: null }),
        seriesIds.length ? supabase.from("playlist_items").select("playlist_id,videos(thumbnail_path)").in("playlist_id", seriesIds).order("position") : Promise.resolve({ data: [], error: null }),
      ]);
      const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
      const counts = new Map<string, number>();
      const thumbnails = new Map<string, string | null>();
      for (const item of (items ?? []) as unknown as CountRow[]) {
        counts.set(item.playlist_id, (counts.get(item.playlist_id) ?? 0) + 1);
        if (!thumbnails.has(item.playlist_id)) {
          const video = Array.isArray(item.videos) ? item.videos[0] : item.videos;
          thumbnails.set(item.playlist_id, video?.thumbnail_path ?? null);
        }
      }
      return rows.map((row) => ({ ...row, profile: profileMap.get(row.user_id) ?? null, count: counts.get(row.id) ?? 0, thumbnailPath: thumbnails.get(row.id) ?? null }));
    },
  });
  return <AppShell><div className="cn-cosmephant-series mx-auto w-full max-w-6xl space-y-6 pb-16"><header className="cn-cosmephant-hero rounded-3xl border border-border bg-surface p-6 shadow-sm"><div className="flex items-start gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Clapperboard className="h-6 w-6" /></span><div><h1 className="text-2xl font-bold">Series</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Colecciones de videos pensadas como episodios: una historia, una temporada o una colección continua.</p></div></div></header>{series.isLoading ? <div className="py-20 text-center text-muted-foreground">Cargando series…</div> : !series.data?.length ? <div className="cn-cosmephant-empty-state rounded-3xl border border-dashed border-border p-16 text-center"><Clapperboard className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" /><h2 className="text-lg font-semibold">Todavía no hay series públicas</h2><p className="mt-2 text-sm text-muted-foreground">Crea una serie desde la gestión de playlists y aparecerá aquí.</p></div> : <div className="cn-cosmephant-cards grid gap-4 md:grid-cols-2 xl:grid-cols-3">{series.data.map((item) => <Link key={item.id} to="/playlist/$playlistId" params={{ playlistId: item.id }} className="cn-cosmephant-card cn-cosmephant-series-card group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"><div className="cn-cosmephant-series-thumb">{item.thumbnailPath ? <SignedImage path={item.thumbnailPath} alt={item.title} className="h-full w-full object-cover" /> : <div className="cn-cosmephant-series-thumb-fallback"><Clapperboard className="h-8 w-8" /></div>}<div className="cn-cosmephant-series-thumb-overlay"><Badge className="gap-1 rounded-full"><Clapperboard className="h-3.5 w-3.5" />Serie</Badge><span>{item.count} episodios</span><h2>{item.title}</h2></div></div><div className="p-4"><p className="line-clamp-2 text-sm text-muted-foreground">{item.description || "Sin descripción."}</p><div className="mt-4 flex items-center gap-2 border-t border-border pt-3"><ChannelAvatar path={item.profile?.avatar_path} name={item.profile?.display_name || item.profile?.username || "Canal"} size={30} /><div className="min-w-0"><p className="truncate text-xs font-medium">{item.profile?.display_name || item.profile?.username || "Canal"}</p><p className="truncate text-[11px] text-muted-foreground">@{item.profile?.username || "canal"}</p></div><ListVideo className="ml-auto h-4 w-4 text-muted-foreground" /></div></Link>)}</div>}</div></AppShell>;
}
