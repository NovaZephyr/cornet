import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Clapperboard, Globe, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { VideoCard } from "@/components/VideoCard";
import { fetchVideos } from "@/lib/queries";

export const Route = createFileRoute("/playlist/$playlistId")({ component: PlaylistPage });

type Playlist = { id: string; user_id: string; title: string; description: string; visibility: "public" | "private"; kind: "playlist" | "series" };
type Item = { id: string; video_id: string; position: number; video: { id: string; code: string; user_id: string; title: string; thumbnail_path: string | null; duration_seconds: number; views: number; created_at: string } | null };

function PlaylistPage() {
  const { playlistId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedVideo, setSelectedVideo] = useState("");
  const playlistQuery = useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: async () => {
      const { data, error } = await supabase.from("playlists").select("id, user_id, title, description, visibility, kind").eq("id", playlistId).maybeSingle();
      if (error) throw error;
      return (data as Playlist | null);
    },
  });
  const itemsQuery = useQuery({
    queryKey: ["playlist-items", playlistId],
    enabled: !!playlistQuery.data,
    queryFn: async () => {
      const { data, error } = await supabase.from("playlist_items").select("id, video_id, position, videos(id, code, user_id, title, thumbnail_path, duration_seconds, views, created_at)").eq("playlist_id", playlistId).order("position").order("created_at");
      if (error) throw error;
      return ((data ?? []) as unknown as (Item & { videos?: Item["video"] })[]).map((item) => ({ ...item, video: item.video ?? item.videos ?? null }));
    },
  });
  const mine = user?.id === playlistQuery.data?.user_id;
  const ownerVideos = useQuery({
    queryKey: ["owner-videos-for-playlist", user?.id, playlistId],
    enabled: mine,
    queryFn: () => fetchVideos({ userId: user!.id }),
  });
  const availableVideos = useMemo(() => ownerVideos.data?.filter((video) => !itemsQuery.data?.some((item) => item.video_id === video.id)) ?? [], [ownerVideos.data, itemsQuery.data]);

  if (playlistQuery.isLoading) return <AppShell><p className="py-24 text-center text-muted-foreground">Cargando…</p></AppShell>;
  if (!playlistQuery.data) return <AppShell><p className="py-24 text-center text-muted-foreground">La lista no existe o es privada.</p></AppShell>;

  const playlist = playlistQuery.data;
  const isSeries = playlist.kind === "series";
  const items = itemsQuery.data ?? [];
  const noun = isSeries ? "episodio" : "video";
  const nounPlural = isSeries ? "episodios" : "videos";

  const addVideo = async () => {
    if (!mine || !selectedVideo) return;
    const position = items.length;
    const { error } = await supabase.from("playlist_items").insert({ playlist_id: playlistId, video_id: selectedVideo, position });
    if (error) return void toast.error(error.message);
    setSelectedVideo("");
    void qc.invalidateQueries({ queryKey: ["playlist-items", playlistId] });
  };

  const removeItem = async (itemId: string) => {
    if (!mine) return;
    const { error } = await supabase.from("playlist_items").delete().eq("id", itemId);
    if (error) return void toast.error(error.message);
    const remaining = items.filter((item) => item.id !== itemId);
    await Promise.all(remaining.map((item, index) => supabase.from("playlist_items").update({ position: index }).eq("id", item.id)));
    void qc.invalidateQueries({ queryKey: ["playlist-items", playlistId] });
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    if (!mine) return;
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= items.length) return;
    const a = items[index];
    const b = items[otherIndex];
    await Promise.all([
      supabase.from("playlist_items").update({ position: otherIndex }).eq("id", a.id),
      supabase.from("playlist_items").update({ position: index }).eq("id", b.id),
    ]);
    void qc.invalidateQueries({ queryKey: ["playlist-items", playlistId] });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 pb-14">
        <header className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                {isSeries && <Clapperboard className="h-5 w-5 text-primary" />}
                <h1 className="text-2xl font-bold">{playlist.title}</h1>
                {playlist.visibility === "public" ? <Globe className="h-5 w-5 text-muted-foreground" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{playlist.description || "Sin descripción."}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {items.length} {nounPlural} · {playlist.visibility === "public" ? "Pública" : "Privada"} · {isSeries ? "Serie" : "Lista de reproducción"}
              </p>
            </div>
            {mine && <Button asChild variant="secondary"><Link to="/playlists">Administrar listas</Link></Button>}
          </div>
          {mine && (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Select value={selectedVideo} onValueChange={setSelectedVideo}>
                <SelectTrigger className="sm:w-96"><SelectValue placeholder={`Añadir un ${noun}…`} /></SelectTrigger>
                <SelectContent>{availableVideos.map((video) => <SelectItem key={video.id} value={video.id}>{video.title}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={() => void addVideo()} disabled={!selectedVideo}>Añadir</Button>
            </div>
          )}
        </header>

        {items.length ? (
          <div className="space-y-3">
            {items.map((item, index) =>
              item.video ? (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
                  <div className="w-full min-w-0 sm:max-w-64"><VideoCard video={{ ...item.video, profiles: null } as never} compact /></div>
                  <div className="flex-1">
                    <Link to="/watch" search={{ v: item.video.code }} className="font-medium hover:underline">{item.video.title}</Link>
                    <p className="text-xs text-muted-foreground">
                      {isSeries ? `Episodio ${index + 1}` : `#${index + 1}`} · {item.video.views} vistas
                    </p>
                  </div>
                  {mine && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" disabled={index === 0} onClick={() => void moveItem(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" disabled={index === items.length - 1} onClick={() => void moveItem(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => void removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
            Esta {isSeries ? "serie" : "lista"} todavía no tiene {nounPlural}.
          </div>
        )}
      </div>
    </AppShell>
  );
}
