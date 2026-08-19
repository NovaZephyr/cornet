import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Eye, MousePointerClick, Pencil, Plus, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Ad = { id: string; title: string; body: string | null; image_path: string | null; target_url: string; slot: string; status: string; starts_at: string | null; ends_at: string | null; impressions: number; clicks: number; created_at: string };
type FormState = { title: string; body: string; image_path: string; target_url: string; slot: string; starts_at: string; ends_at: string };
const EMPTY: FormState = { title: "", body: "", image_path: "", target_url: "", slot: "article-top", starts_at: "", ends_at: "" };

function toIso(value: string) { return value ? new Date(value).toISOString() : null; }

export function AdminAdsPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const { data: ads, isLoading } = useQuery({
    queryKey: ["admin-blog-ads"],
    queryFn: async () => { const { data, error } = await supabase.from("blog_ads").select("*").order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as Ad[]; },
  });
  const save = useMutation({
    mutationFn: async () => {
      const payload = { title: form.title.trim(), body: form.body.trim() || null, image_path: form.image_path.trim() || null, target_url: form.target_url.trim(), slot: form.slot, starts_at: toIso(form.starts_at), ends_at: toIso(form.ends_at) };
      if (!payload.title || !payload.target_url) throw new Error("Título y URL de destino son obligatorios.");
      if (editing) { const { error } = await supabase.from("blog_ads").update(payload).eq("id", editing); if (error) throw error; }
      else { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Debes iniciar sesión."); const { error } = await supabase.from("blog_ads").insert({ ...payload, created_by: user.id, status: "draft" }); if (error) throw error; }
    },
    onSuccess: () => { toast.success(editing ? "Anuncio actualizado" : "Anuncio creado como borrador"); setForm(EMPTY); setEditing(null); void qc.invalidateQueries({ queryKey: ["admin-blog-ads"] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo guardar el anuncio"),
  });
  const statusChange = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("blog_ads").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-blog-ads"] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo actualizar el anuncio"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("blog_ads").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Anuncio eliminado"); void qc.invalidateQueries({ queryKey: ["admin-blog-ads"] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo eliminar el anuncio"),
  });

  const edit = (ad: Ad) => { setEditing(ad.id); setForm({ title: ad.title, body: ad.body ?? "", image_path: ad.image_path ?? "", target_url: ad.target_url, slot: ad.slot, starts_at: ad.starts_at ? ad.starts_at.slice(0,16) : "", ends_at: ad.ends_at ? ad.ends_at.slice(0,16) : "" }); };
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
    <section className="cn-admin-card space-y-3">
      <div className="cn-admin-card-title"><CalendarClock size={16}/> Campañas</div>
      {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p> : ads?.length ? ads.map((ad) => <div key={ad.id} className="rounded-xl border border-border p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate">{ad.title}</strong><Badge variant={ad.status === "active" ? "default" : ad.status === "paused" ? "secondary" : "outline"}>{ad.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{ad.slot} · {ad.target_url}</p></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" onClick={() => edit(ad)} title="Editar"><Pencil size={15}/></Button><Button size="icon" variant="ghost" onClick={() => statusChange.mutate({ id: ad.id, status: ad.status === "active" ? "paused" : "active" })} title={ad.status === "active" ? "Pausar" : "Activar"}>{ad.status === "active" ? <Pause size={15}/> : <Play size={15}/>}</Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(ad.id)} title="Eliminar"><Trash2 size={15}/></Button></div></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-background p-2"><div className="flex items-center gap-1 text-muted-foreground"><Eye size={13}/> Impresiones</div><strong>{Number(ad.impressions).toLocaleString("es")}</strong></div><div className="rounded-lg bg-background p-2"><div className="flex items-center gap-1 text-muted-foreground"><MousePointerClick size={13}/> Clics</div><strong>{Number(ad.clicks).toLocaleString("es")}</strong></div></div>
      </div>) : <p className="py-8 text-center text-sm text-muted-foreground">No hay campañas todavía.</p>}
    </section>
    <section className="cn-admin-card space-y-3">
      <div className="flex items-center justify-between"><div className="cn-admin-card-title"><Plus size={16}/> {editing ? "Editar anuncio" : "Nuevo anuncio"}</div>{editing ? <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancelar</Button> : null}</div>
      <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título del anuncio" />
      <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Descripción breve" rows={3} />
      <Input value={form.target_url} onChange={e => setForm(f => ({ ...f, target_url: e.target.value }))} placeholder="https://..." />
      <Input value={form.image_path} onChange={e => setForm(f => ({ ...f, image_path: e.target.value }))} placeholder="Ruta de imagen (opcional)" />
      <Select value={form.slot} onValueChange={slot => setForm(f => ({ ...f, slot }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="article-top">Arriba del blog</SelectItem><SelectItem value="article-inline">Dentro del artículo</SelectItem><SelectItem value="article-sidebar">Sidebar</SelectItem><SelectItem value="feed-between">Entre publicaciones</SelectItem></SelectContent></Select>
      <div className="grid grid-cols-2 gap-2"><div><label className="mb-1 block text-xs text-muted-foreground">Inicio</label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} /></div><div><label className="mb-1 block text-xs text-muted-foreground">Fin</label><Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} /></div></div>
      <Button className="w-full rounded-full" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Guardando…" : editing ? "Guardar cambios" : "Crear borrador"}</Button>
      <p className="text-xs text-muted-foreground">Los anuncios nuevos se crean como borrador. Actívalos cuando estén listos.</p>
    </section>
  </div>;
}
