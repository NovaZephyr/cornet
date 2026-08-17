import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Globe, Plus, Trash2, Clapperboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/playlists")({ component: PlaylistsPage });

type Playlist = {
  id: string;
  title: string;
  description: string;
  visibility: "public" | "private";
  kind: "playlist" | "series";
  created_at: string;
};

function PlaylistsPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [kind, setKind] = useState<"playlist" | "series">("playlist");

  const playlists = useQuery({
    queryKey: ["my-playlists", user?.id], enabled: !!user,
    queryFn: async () => { const { data, error } = await supabase.from("playlists").select("id, title, description, visibility, kind, created_at").eq("user_id", user!.id).order("updated_at", { ascending: false }); if (error) throw error; return (data ?? []) as Playlist[]; },
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !title.trim()) return;
    const { error } = await supabase.from("playlists").insert({ user_id: user.id, title: title.trim(), description: description.trim(), visibility, kind });
    if (error) return void toast.error(error.message);
    setTitle(""); setDescription(""); setVisibility("private"); setKind("playlist"); void qc.invalidateQueries({ queryKey: ["my-playlists", user.id] }); toast.success(kind === "series" ? "Serie creada" : "Lista creada");
  };

  const updatePlaylist = async (playlist: Playlist, patch: Partial<Pick<Playlist, "title" | "description" | "visibility" | "kind">>) => {
    if (!user) return;
    const { error } = await supabase.from("playlists").update(patch).eq("id", playlist.id).eq("user_id", user.id);
    if (error) return void toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["my-playlists", user.id] });
    void qc.invalidateQueries({ queryKey: ["playlist", playlist.id] });
    toast.success("Actualizado");
  };

  const remove = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("playlists").delete().eq("id", id).eq("user_id", user.id);
    if (error) return void toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["my-playlists", user.id] });
  };

  if (!user) return <AppShell><p className="py-24 text-center text-muted-foreground">Inicia sesión para administrar tus listas.</p></AppShell>;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <div><h1 className="text-2xl font-bold">Listas de reproducción</h1><p className="text-sm text-muted-foreground">Crea listas públicas o privadas, añade vídeos y cambia su orden.</p></div>
        <form onSubmit={create} className="grid gap-3 rounded-2xl bg-surface p-5 md:grid-cols-[1fr_150px_150px_auto]">
          <div className="space-y-2">
            <Input placeholder="Nombre" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Textarea placeholder="Descripción opcional" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as "private" | "public")} className="h-10 rounded-md border border-border bg-background px-3"><option value="private">Privada</option><option value="public">Pública</option></select>
          {isAdmin ? (
            <select value={kind} onChange={(e) => setKind(e.target.value as "playlist" | "series")} className="h-10 rounded-md border border-border bg-background px-3">
              <option value="playlist">Lista</option>
              <option value="series">Serie</option>
            </select>
          ) : (
            <div />
          )}
          <Button type="submit"><Plus className="mr-2 h-4 w-4" />Crear</Button>
        </form>

        <div className="space-y-3">
          {playlists.data?.map((playlist) => (
            <div key={playlist.id} className="rounded-xl border border-border bg-card p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <Link to="/playlist/$playlistId" params={{ playlistId: playlist.id }} className="flex items-center gap-1.5 text-lg font-semibold hover:underline">
                    {playlist.kind === "series" && <Clapperboard className="h-4 w-4 text-primary" />}
                    {playlist.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{playlist.description || "Sin descripción"}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    {playlist.visibility === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {playlist.visibility === "public" ? "Pública" : "Privada"}
                    {playlist.kind === "series" && <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">Serie</span>}
                  </p>
                </div>
                <div className="flex items-start gap-2"><Link to="/playlist/$playlistId" params={{ playlistId: playlist.id }}><Button variant="secondary">Abrir</Button></Link><Button variant="ghost" size="icon" onClick={() => void remove(playlist.id)} aria-label="Eliminar"><Trash2 className="h-4 w-4" /></Button></div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_140px_140px]">
                <Input defaultValue={playlist.title} aria-label="Nombre" onBlur={(e) => { const value = e.target.value.trim(); if (value && value !== playlist.title) void updatePlaylist(playlist, { title: value }); }} />
                <Input defaultValue={playlist.description} aria-label="Descripción" onBlur={(e) => { const value = e.target.value; if (value !== playlist.description) void updatePlaylist(playlist, { description: value }); }} />
                <select defaultValue={playlist.visibility} onChange={(e) => void updatePlaylist(playlist, { visibility: e.target.value as "public" | "private" })} className="h-10 rounded-md border border-border bg-background px-3"><option value="private">Privada</option><option value="public">Pública</option></select>
                {isAdmin && (
                  <select defaultValue={playlist.kind} onChange={(e) => void updatePlaylist(playlist, { kind: e.target.value as "playlist" | "series" })} className="h-10 rounded-md border border-border bg-background px-3">
                    <option value="playlist">Lista</option>
                    <option value="series">Serie</option>
                  </select>
                )}
              </div>
            </div>
          ))}
          {playlists.data?.length === 0 && <p className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">Todavía no tienes listas.</p>}
        </div>
      </div>
    </AppShell>
  );
}
