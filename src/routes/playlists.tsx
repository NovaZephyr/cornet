import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Globe, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/playlists")({ component: PlaylistsPage });

type Playlist = { id: string; title: string; description: string; visibility: "public" | "private"; created_at: string };

function PlaylistsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const playlists = useQuery({ queryKey: ["my-playlists", user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.from("playlists").select("id, title, description, visibility, created_at").eq("user_id", user!.id).order("updated_at", { ascending: false });
    if (error) throw error; return (data ?? []) as Playlist[];
  }});
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !title.trim()) return;
    const { error } = await supabase.from("playlists").insert({ user_id: user.id, title: title.trim(), description: description.trim(), visibility });
    if (error) return void toast.error(error.message);
    setTitle(""); setDescription(""); setVisibility("private"); void qc.invalidateQueries({ queryKey: ["my-playlists", user.id] }); toast.success("Lista creada");
  };
  if (!user) return <AppShell><p className="py-24 text-center text-muted-foreground">Inicia sesión para administrar tus listas.</p></AppShell>;
  return <AppShell><div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-2xl font-bold">Listas de reproducción</h1><p className="text-sm text-muted-foreground">Crea listas públicas o privadas y guarda tus videos favoritos.</p></div><form onSubmit={create} className="grid gap-3 rounded-2xl bg-surface p-5 md:grid-cols-[1fr_180px_auto]"><div className="space-y-2"><Input placeholder="Nombre de la lista" value={title} onChange={(e) => setTitle(e.target.value)} required /><Textarea placeholder="Descripción opcional" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div><select value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "private")} className="h-10 rounded-md border border-border bg-background px-3"><option value="private">Privada</option><option value="public">Pública</option></select><Button type="submit"><Plus className="mr-2 h-4 w-4" />Crear</Button></form><div className="grid gap-3 sm:grid-cols-2">{playlists.data?.map((playlist) => <div key={playlist.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{playlist.title}</h2><p className="mt-1 text-sm text-muted-foreground">{playlist.description || "Sin descripción"}</p><p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">{playlist.visibility === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{playlist.visibility === "public" ? "Pública" : "Privada"}</p></div><Button variant="ghost" size="icon" onClick={async () => { const { error } = await supabase.from("playlists").delete().eq("id", playlist.id); if (error) return void toast.error(error.message); void qc.invalidateQueries({ queryKey: ["my-playlists", user.id] }); }}><Trash2 className="h-4 w-4" /></Button></div></div>)}{playlists.data?.length === 0 && <p className="text-sm text-muted-foreground">Todavía no tienes listas.</p>}</div></div></AppShell>;
}
