import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, ListVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar } from "@/components/Media";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/series")({ component: SeriesPage });

type SeriesRow = { id: string; title: string; description: string; visibility: string; user_id: string; created_at: string };
type ProfileRow = { id: string; username: string; display_name: string; avatar_path: string | null };
type CountRow = { playlist_id: string };

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
        seriesIds.length ? supabase.from("playlist_items").select("playlist_id").in("playlist_id", seriesIds) : Promise.resolve({ data: [], error: null }),
      ]);
      const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
      const counts = new Map<string, number>();
      for (const item of (items ?? []) as CountRow[]) counts.set(item.playlist_id, (counts.get(item.playlist_id) ?? 0) + 1);
      return rows.map((row) => ({ ...row, profile: profileMap.get(row.user_id) ?? null, count: counts.get(row.id) ?? 0 }));
    },
  });
  return <AppShell><div className="mx-auto w-full max-w-6xl space-y-6 pb-16"><header className="rounded-3xl border border-border bg-surface p-6 shadow-sm"><div className="flex items-start gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Clapperboard className="h-6 w-6" /></span><div><h1 className="text-2xl font-bold">Series</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Colecciones de videos pensadas como episodios: una historia, una temporada o una colección continua.</p></div></div></header>{series.isLoading ? <div className="py-20 text-center text-muted-foreground">Cargando series…</div> : !series.data?.length ? <div className="rounded-3xl border border-dashed border-border p-16 text-center"><Clapperboard className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" /><h2 className="text-lg font-semibold">Todavía no hay series públicas</h2><p className="mt-2 text-sm text-muted-foreground">Crea una serie desde la gestión de playlists y aparecerá aquí.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{series.data.map((item) => <Link key={item.id} to="/playlist/$playlistId" params={{ playlistId: item.id }} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"><div className="flex items-center justify-between gap-3"><Badge className="gap-1 rounded-full"><Clapperboard className="h-3.5 w-3.5" />Serie</Badge><span className="text-xs text-muted-foreground">{item.count} episodios</span></div><h2 className="mt-4 line-clamp-2 text-lg font-semibold group-hover:text-primary">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.description || "Sin descripción."}</p><div className="mt-5 flex items-center gap-2 border-t border-border pt-4"><ChannelAvatar path={item.profile?.avatar_path} name={item.profile?.display_name || item.profile?.username || "Canal"} size={30} /><div className="min-w-0"><p className="truncate text-xs font-medium">{item.profile?.display_name || item.profile?.username || "Canal"}</p><p className="truncate text-[11px] text-muted-foreground">@{item.profile?.username || "canal"}</p></div><ListVideo className="ml-auto h-4 w-4 text-muted-foreground" /></div></Link>)}</div>}</div></AppShell>;
}
