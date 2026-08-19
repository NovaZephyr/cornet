import { createFileRoute, Link, notFound, rootRouteId } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, FileText, Image as ImageIcon, Loader2, Plus, Save, ShieldCheck, Trash2, CalendarClock, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";

type PostType = "text" | "image" | "poll";
type Post = { id: string; author_id: string; title: string; body: string | null; image_path: string | null; post_type: PostType; created_at: string };

export const Route = createFileRoute("/admin-blog")({ component: AdminBlogPage });

function AdminBlogPage() {
  const { user, roles, loading } = useAuth();
  const isStaff = roles.includes("admin") || roles.includes("moderator");
  const canEdit = roles.includes("admin");
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);
  const [editorType, setEditorType] = useState<PostType>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const loadPosts = async () => {
    const { data, error } = await supabase.from("announcements").select("id,author_id,title,body,image_path,post_type,created_at").order("created_at", { ascending: false }).limit(50);
    if (error) return void toast.error(error.message);
    setPosts((data ?? []) as Post[]);
  };

  useEffect(() => { if (isStaff && user) void loadPosts(); }, [isStaff, user]);
  if (loading) return <AppShell><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  if (!user || !isStaff) throw notFound({ routeId: rootRouteId, throw: true });

  const resetEditor = () => { setTitle(""); setBody(""); setImagePath(""); setPollOptions(["", ""]); };
  const submit = async () => {
    if (!canEdit) return void toast.error("Solo los administradores pueden publicar en el Blog.");
    if (!title.trim()) return void toast.error("El post necesita un título.");
    if (editorType === "image" && !imagePath.trim()) return void toast.error("Añade la ruta pública de la imagen.");
    const validPollOptions = pollOptions.map((item) => item.trim()).filter(Boolean);
    if (editorType === "poll" && validPollOptions.length < 2) return void toast.error("Una encuesta necesita al menos 2 opciones.");
    setBusy(true);
    const { data, error } = await supabase.from("announcements").insert({ author_id: user.id, title: title.trim(), body: body.trim() || null, image_path: editorType === "image" ? imagePath.trim() : null, post_type: editorType }).select("id").single();
    if (error || !data) { setBusy(false); return void toast.error(error?.message || "No se pudo crear el post."); }
    if (editorType === "poll") {
      const { error: pollError } = await supabase.from("announcement_poll_options").insert(validPollOptions.map((label, position) => ({ announcement_id: data.id, label, position })));
      if (pollError) { await supabase.from("announcements").delete().eq("id", data.id); setBusy(false); return void toast.error(pollError.message); }
    }
    setBusy(false); resetEditor(); await loadPosts(); toast.success("Publicación creada");
  };
  const remove = async (id: string) => {
    if (!canEdit) return void toast.error("Solo los administradores pueden eliminar publicaciones.");
    if (!window.confirm("¿Eliminar esta publicación?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    setPosts((current) => current.filter((post) => post.id !== id));
    toast.success("Publicación eliminada");
  };
  const editor = <div className="mt-5 space-y-4">
    <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Cornet se ha actualizado!" disabled={!canEdit}/></div>
    <div className="space-y-2"><Label>{editorType === "poll" ? "Pregunta" : "Texto"}</Label><Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={5000} placeholder={editorType === "poll" ? "¿Qué función te gustaría ver después?" : "Escribe el anuncio oficial…"} disabled={!canEdit}/></div>
    {editorType === "image" && <div className="space-y-2"><Label>Ruta de imagen</Label><Input value={imagePath} onChange={(event) => setImagePath(event.target.value)} placeholder="media/anuncios/imagen.png o URL pública" disabled={!canEdit}/><p className="text-xs text-muted-foreground">Ruta del bucket media o URL pública.</p></div>}
    {editorType === "poll" && <div className="space-y-2"><Label>Opciones</Label>{pollOptions.map((option, index) => <div key={index} className="flex gap-2"><Input value={option} onChange={(event) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Opción ${index + 1}`} disabled={!canEdit}/>{canEdit && pollOptions.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => setPollOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4"/></Button>}</div>)}{canEdit && <Button type="button" variant="outline" onClick={() => setPollOptions((current) => [...current, ""])}><Plus className="mr-2 h-4 w-4"/>Añadir opción</Button>}</div>}
    {canEdit ? <div className="flex flex-wrap gap-3"><Button onClick={() => void submit()} disabled={busy}><Save className="mr-2 h-4 w-4"/>{busy ? "Publicando…" : "Publicar"}</Button><Button variant="outline" onClick={resetEditor}>Limpiar</Button></div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Tu rol de moderador permite revisar el Blog, pero no publicar ni eliminar entradas.</p>}
  </div>;

  return <AppShell><div className="mx-auto max-w-5xl space-y-6 pb-16">
    <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Administración</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Blog / Anuncios</h1><p className="mt-2 text-sm text-muted-foreground">El Blog es editorial: Texto, Imagen y Poll. Los eventos y la publicidad viven en Campañas.</p></div>
    <div className="grid gap-3 md:grid-cols-2"><Link to="/admin-blog" className="rounded-2xl border border-primary/30 bg-primary/5 p-5 hover:bg-primary/10"><div className="flex items-center gap-3"><Megaphone className="h-5 w-5 text-primary"/><div><p className="font-semibold">Nuevo anuncio</p><p className="text-sm text-muted-foreground">Publica una novedad oficial de Cornet.</p></div></div></Link><Link to="/admin-campaigns" className="rounded-2xl border border-border bg-surface p-5 hover:bg-muted"><div className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-primary"/><div><p className="font-semibold">Nuevo evento</p><p className="text-sm text-muted-foreground">Gestiona eventos por separado dentro de Campañas.</p></div></div></Link></div>
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm"><div className="mb-5 flex items-center gap-2"><Plus className="h-5 w-5 text-primary"/><h2 className="font-semibold">Nuevo anuncio</h2><span className="ml-auto text-xs text-muted-foreground">{canEdit ? "Administrador" : "Solo lectura"}</span></div><Tabs value={editorType} onValueChange={(value) => setEditorType(value as PostType)}><TabsList><TabsTrigger value="text"><FileText className="mr-1.5 h-4 w-4"/>Texto</TabsTrigger><TabsTrigger value="image"><ImageIcon className="mr-1.5 h-4 w-4"/>Imagen</TabsTrigger><TabsTrigger value="poll"><BarChart3 className="mr-1.5 h-4 w-4"/>Poll</TabsTrigger></TabsList><TabsContent value="text">{editor}</TabsContent><TabsContent value="image">{editor}</TabsContent><TabsContent value="poll">{editor}</TabsContent></Tabs></section>
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm"><div className="mb-5 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary"/><h2 className="font-semibold">Publicaciones recientes</h2></div><div className="space-y-2">{posts.map((post) => <article key={post.id} className="flex items-start gap-4 rounded-xl border border-border bg-background p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{post.post_type === "image" ? <ImageIcon className="h-5 w-5"/> : post.post_type === "poll" ? <BarChart3 className="h-5 w-5"/> : <FileText className="h-5 w-5"/>}</div><div className="min-w-0 flex-1"><strong className="block truncate">{post.title}</strong><p className="mt-1 text-xs text-muted-foreground">{post.post_type === "poll" ? "Poll" : post.post_type === "image" ? "Imagen" : "Texto"} · {timeAgo(post.created_at)}</p></div>{canEdit && <Button variant="ghost" size="icon" onClick={() => void remove(post.id)} aria-label="Eliminar publicación"><Trash2 className="h-4 w-4"/></Button>}</article>)}{posts.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay publicaciones.</p>}</div></section>
    <div><Button variant="outline" asChild><Link to="/admin">Volver al panel</Link></Button></div>
  </div></AppShell>;
}
