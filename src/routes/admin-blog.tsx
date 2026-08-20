import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound, rootRouteId } from "@tanstack/react-router";
import { BarChart3, CalendarClock, FileText, Image as ImageIcon, Loader2, Megaphone, Plus, Save, ShieldCheck, Trash2, Upload } from "lucide-react";
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
type Post = {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  image_path: string | null;
  post_type: PostType;
  created_at: string;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export const Route = createFileRoute("/admin-blog")({ component: AdminBlogPage });

function AdminBlogPage() {
  const { user, roles, loading } = useAuth();
  const isStaff = roles.includes("admin") || roles.includes("moderator");
  const canEdit = roles.includes("admin");

  const [posts, setPosts] = useState<Post[]>([]);
  const [editorType, setEditorType] = useState<PostType>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("id,author_id,title,body,image_path,post_type,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPosts((data ?? []) as Post[]);
  };

  useEffect(() => {
    if (isStaff && user) void loadPosts();
  }, [isStaff, user]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!user || !isStaff) {
    throw notFound({ routeId: rootRouteId, throw: true });
  }

  const resetEditor = () => {
    setTitle("");
    setBody("");
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setPollOptions(["", ""]);
  };

  const handleImageChange = (file: File | null) => {
    if (!canEdit) return;
    if (!file) {
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      return;
    }
    if (!IMAGE_TYPES.has(file.type)) {
      toast.error("La imagen debe ser JPG, PNG, WebP o GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("La imagen no puede superar 10 MB.");
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const publish = async () => {
    if (!canEdit) {
      toast.error("Solo los administradores pueden publicar en el Blog.");
      return;
    }
    if (!title.trim()) {
      toast.error("El post necesita un título.");
      return;
    }

    const validPollOptions = pollOptions.map((item) => item.trim()).filter(Boolean);
    if (editorType === "poll" && validPollOptions.length < 2) {
      toast.error("Una encuesta necesita al menos 2 opciones.");
      return;
    }
    if (editorType === "image" && !imageFile) {
      toast.error("Selecciona una imagen desde tu computadora.");
      return;
    }

    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      if (editorType === "image" && imageFile) {
        const ext = imageFile.name.split(".").pop()?.toLowerCase() || "img";
        const key = `blog/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("media").upload(key, imageFile, {
          contentType: imageFile.type,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
        uploadedPath = `media/${key}`;
      }

      const { data, error } = await supabase
        .from("announcements")
        .insert({
          author_id: user.id,
          title: title.trim(),
          body: body.trim() || null,
          image_path: uploadedPath,
          post_type: editorType,
        })
        .select("id")
        .single();

      if (error || !data) {
        if (uploadedPath) {
          await supabase.storage.from("media").remove([uploadedPath.slice("media/".length)]);
        }
        throw new Error(error?.message || "No se pudo crear el post.");
      }

      if (editorType === "poll") {
        const { error: pollError } = await supabase
          .from("announcement_poll_options")
          .insert(validPollOptions.map((label, position) => ({ announcement_id: data.id, label, position })));
        if (pollError) {
          await supabase.from("announcements").delete().eq("id", data.id);
          throw pollError;
        }
      }

      resetEditor();
      await loadPosts();
      toast.success("Publicación creada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo publicar el anuncio.");
    } finally {
      setBusy(false);
    }
  };

  const removePost = async (id: string) => {
    if (!canEdit) {
      toast.error("Solo los administradores pueden eliminar publicaciones.");
      return;
    }
    if (!window.confirm("¿Eliminar esta publicación?")) return;

    const { data: post } = await supabase.from("announcements").select("image_path").eq("id", id).maybeSingle();
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }

    if (post?.image_path?.startsWith("media/")) {
      await supabase.storage.from("media").remove([post.image_path.slice("media/".length)]);
    }
    setPosts((current) => current.filter((item) => item.id !== id));
    toast.success("Publicación eliminada");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Administración</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Blog / Anuncios</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El Blog es editorial: Texto, Imagen y Poll. Los eventos y la publicidad viven en Campañas.
          </p>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          <Link to="/admin-blog" className="rounded-2xl border border-primary/30 bg-primary/5 p-5 hover:bg-primary/10">
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Nuevo anuncio</p>
                <p className="text-sm text-muted-foreground">Publica una novedad oficial de Cornet.</p>
              </div>
            </div>
          </Link>
          <Link to="/admin-campaigns" className="rounded-2xl border border-border bg-surface p-5 hover:bg-muted">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Nuevo evento</p>
                <p className="text-sm text-muted-foreground">Gestiona eventos por separado dentro de Campañas.</p>
              </div>
            </div>
          </Link>
        </div>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Nuevo anuncio</h2>
            <span className="ml-auto text-xs text-muted-foreground">{canEdit ? "Administrador" : "Solo lectura"}</span>
          </div>

          <Tabs value={editorType} onValueChange={(value) => setEditorType(value as PostType)}>
            <TabsList>
              <TabsTrigger value="text"><FileText className="mr-1.5 h-4 w-4" />Texto</TabsTrigger>
              <TabsTrigger value="image"><ImageIcon className="mr-1.5 h-4 w-4" />Imagen</TabsTrigger>
              <TabsTrigger value="poll"><BarChart3 className="mr-1.5 h-4 w-4" />Poll</TabsTrigger>
            </TabsList>

            <TabsContent value="text"><EditorFields type="text" /></TabsContent>
            <TabsContent value="image"><EditorFields type="image" /></TabsContent>
            <TabsContent value="poll"><EditorFields type="poll" /></TabsContent>
          </Tabs>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Publicaciones recientes</h2>
          </div>
          <div className="space-y-2">
            {posts.map((post) => (
              <article key={post.id} className="flex items-start gap-4 rounded-xl border border-border bg-background p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {post.post_type === "image" ? <ImageIcon className="h-5 w-5" /> : post.post_type === "poll" ? <BarChart3 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">{post.title}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {post.post_type === "poll" ? "Poll" : post.post_type === "image" ? "Imagen" : "Texto"} · {timeAgo(post.created_at)}
                  </p>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => void removePost(post.id)} aria-label="Eliminar publicación">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </article>
            ))}
            {!posts.length && <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay publicaciones.</p>}
          </div>
        </section>

        <Button variant="outline" asChild>
          <Link to="/admin">Volver al panel</Link>
        </Button>
      </div>
    </AppShell>
  );

  function EditorFields({ type }: { type: PostType }) {
    return (
      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} disabled={!canEdit} placeholder="Cornet se ha actualizado!" />
        </div>
        <div className="space-y-2">
          <Label>{type === "poll" ? "Pregunta" : "Texto"}</Label>
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={5000} disabled={!canEdit} placeholder="Escribe el anuncio oficial…" />
        </div>

        {type === "image" && (
          <div className="space-y-3">
            <Label>Imagen</Label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm hover:bg-muted">
              <Upload className="h-5 w-5" />
              <span>{imageFile ? imageFile.name : "Seleccionar una imagen desde tu computadora"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={!canEdit} onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)} />
            </label>
            {imagePreview && <img src={imagePreview} alt="Vista previa" className="max-h-72 w-full rounded-xl border border-border bg-background object-contain" />}
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP o GIF · máximo 10 MB.</p>
          </div>
        )}

        {type === "poll" && (
          <div className="space-y-2">
            <Label>Opciones</Label>
            {pollOptions.map((option, index) => (
              <div key={`${index}-${option}`} className="flex gap-2">
                <Input value={option} onChange={(event) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} disabled={!canEdit} placeholder={`Opción ${index + 1}`} />
                {canEdit && pollOptions.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => setPollOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            {canEdit && <Button type="button" variant="outline" onClick={() => setPollOptions((current) => [...current, ""])}><Plus className="mr-2 h-4 w-4" />Añadir opción</Button>}
          </div>
        )}

        {canEdit ? (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void publish()} disabled={busy}><Save className="mr-2 h-4 w-4" />{busy ? "Publicando…" : "Publicar"}</Button>
            <Button variant="outline" onClick={resetEditor}>Limpiar</Button>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Tu rol de moderador permite revisar el Blog, pero no publicar ni eliminar entradas.</p>
        )}
      </div>
    );
  }
}
