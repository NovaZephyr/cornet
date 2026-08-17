import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Edit3, Eye, MoreVertical, Plus, Trash2, UploadCloud, Video } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile, useSignedUrl } from "@/lib/storage";
import { generateVideoCode } from "@/lib/videoCode";
import { formatTimestamp, normalizeCaptionText, type ChapterDraft, validateChapterDrafts } from "@/lib/captions";
import { extractHashtags, syncVideoHashtags } from "@/lib/hashtags";
import { FormattedText } from "@/components/FormattedText";
import { formatViews, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Tus videos — CoreNetwork" }] }),
  validateSearch: (search: Record<string, unknown>): { edit?: string; create?: boolean } => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
    create: search.create === "1" || search.create === true,
  }),
  component: UploadPage,
});

type CaptionDraft = { id: string; file: File; language: string; label: string; isDefault: boolean };
type ExistingCaption = { id: string; language_code: string; label: string; caption_path: string; is_default: boolean };
type VideoRow = { id: string; code: string; title: string; description: string; video_path: string; thumbnail_path: string | null; duration_seconds: number; views: number; visibility: string; category: string; created_at: string };

const CATEGORIES = ["Autos & Vehicles", "Comedy", "Entertainment", "Film & Animation", "Gaming", "Howto & Style", "Nonprofits & Activism", "People & Blogs", "Pets & Animals", "Science & Technology", "Sports", "Travel & Events", "Education", "Music"] as const;

function Thumbnail({ path, alt }: { path: string | null; alt: string }) {
  const url = useSignedUrl(path);
  return url ? <img src={url} alt={alt} className="aspect-video w-52 rounded-lg object-cover" /> : <div className="flex aspect-video w-52 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Video className="h-8 w-8" /></div>;
}

function Dashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: videos, isLoading } = useQuery({
    queryKey: ["my-videos", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("videos").select("id, code, title, description, video_path, thumbnail_path, duration_seconds, views, visibility, category, created_at").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VideoRow[];
    },
  });

  const removeVideo = async (video: VideoRow) => {
    if (!window.confirm(`¿Eliminar “${video.title}”? Esta acción no se puede deshacer.`)) return;
    const paths = [video.video_path, video.thumbnail_path].filter(Boolean).map((full) => {
      const slash = full!.indexOf("/");
      return { bucket: full!.slice(0, slash), key: full!.slice(slash + 1) };
    });
    const { error } = await supabase.from("videos").delete().eq("id", video.id).eq("user_id", userId);
    if (error) return void toast.error(error.message);
    for (const path of paths) await supabase.storage.from(path.bucket).remove([path.key]);
    void qc.invalidateQueries({ queryKey: ["my-videos", userId] });
    void qc.invalidateQueries({ queryKey: ["videos"] });
    toast.success("Video eliminado");
  };

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Tus videos</h1><p className="text-sm text-muted-foreground">Administra, edita y revisa todo lo que has publicado.</p></div><Button onClick={() => void navigate({ to: "/upload", search: { create: true } })}><Plus className="mr-2 h-4 w-4" />Subir video</Button></div><div className="flex gap-2 overflow-x-auto border-b border-border pb-2"><Button variant="ghost" className="rounded-none border-b-2 border-primary">Videos</Button><Link to="/playlists" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-hover">Playlists</Link><Link to="/notifications" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-hover">Notificaciones</Link></div>{isLoading ? <div className="py-20 text-center text-muted-foreground">Cargando tus videos…</div> : !videos?.length ? <div className="rounded-2xl border border-dashed border-border p-14 text-center"><UploadCloud className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><h2 className="text-lg font-semibold">Todavía no has subido videos</h2><p className="mt-2 text-sm text-muted-foreground">Publica tu primer video y aparecerá aquí para administrarlo.</p><Button className="mt-5" onClick={() => void navigate({ to: "/upload", search: { create: true } })}>Subir mi primer video</Button></div> : <div className="overflow-hidden rounded-xl border border-border bg-surface">{videos.map((video) => <div key={video.id} className="flex flex-col gap-4 border-b border-border p-4 last:border-b-0 md:flex-row md:items-center"><Thumbnail path={video.thumbnail_path} alt={video.title} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{video.title}</h2><span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{video.visibility === "public" ? "Público" : "Privado"}</span></div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground"><FormattedText text={video.description || "Sin descripción."} /></p><div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{formatViews(video.views)} vistas</span><span>{formatTimestamp(video.duration_seconds)}</span><span>{timeAgo(video.created_at)}</span><span>{extractHashtags(`${video.title} ${video.description}`).length} hashtags</span></div></div><div className="flex items-center gap-2"><Link to="/watch" search={{ v: video.code }}><Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" />Ver</Button></Link><Button size="sm" onClick={() => void navigate({ to: "/upload", search: { edit: video.code } })}><Edit3 className="mr-2 h-4 w-4" />Editar</Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-destructive" onClick={() => void removeVideo(video)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>)}</div>}</div>;
}

function Editor({ userId, code }: { userId: string; code?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!code;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [category, setCategory] = useState<string>("Entertainment");
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [existingVideoPath, setExistingVideoPath] = useState<string | null>(null);
  const [existingThumbPath, setExistingThumbPath] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState<CaptionDraft[]>([]);
  const [chapters, setChapters] = useState<ChapterDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadedExisting, setLoadedExisting] = useState(false);

  const existingQuery = useQuery({
    queryKey: ["edit-video", code, userId],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase.from("videos").select("id, code, title, description, video_path, thumbnail_path, duration_seconds, views, visibility, category").eq("code", code).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data as (VideoRow & { id: string }) | null;
    },
  });

  useEffect(() => {
    if (!existingQuery.data || loadedExisting) return;
    const v = existingQuery.data;
    setTitle(v.title); setDescription(v.description); setVisibility(v.visibility); setCategory(v.category || "Entertainment"); setDuration(v.duration_seconds); setExistingVideoPath(v.video_path); setExistingThumbPath(v.thumbnail_path); setLoadedExisting(true);
    void Promise.all([
      supabase.from("video_captions").select("id, language_code, label, caption_path, is_default").eq("video_id", v.id).order("created_at"),
      supabase.from("video_chapters").select("id, title, start_seconds, end_seconds, sort_order").eq("video_id", v.id).order("sort_order").order("start_seconds"),
    ]).then(([captionsResult, chaptersResult]) => {
      const existingCaptions = (captionsResult.data ?? []) as ExistingCaption[];
      setCaptions(existingCaptions.map((caption) => ({ id: caption.id, file: new File([""], `${caption.label}.vtt`, { type: "text/vtt" }), language: caption.language_code, label: caption.label, isDefault: caption.is_default })));
      setChapters((chaptersResult.data ?? []).map((chapter) => ({ id: chapter.id, title: chapter.title, startSeconds: chapter.start_seconds, endSeconds: chapter.end_seconds })) as ChapterDraft[]);
    });
  }, [existingQuery.data, loadedExisting]);

  const readDuration = (file: File) => new Promise<number>((resolve) => { const el = document.createElement("video"); el.preload = "metadata"; el.onloadedmetadata = () => { resolve(Math.round(el.duration) || 0); URL.revokeObjectURL(el.src); }; el.onerror = () => resolve(0); el.src = URL.createObjectURL(file); });
  const selectVideo = async (file: File | null) => { setVideo(file); if (file) setDuration(await readDuration(file)); else if (existingQuery.data) setDuration(existingQuery.data.duration_seconds); if (file && !chapters.length) setChapters([{ title: "Introducción", startSeconds: 0, endSeconds: null }]); };
  const onCaptionFiles = (files: FileList | null) => { if (!files) return; const accepted = [...files].filter((file) => /\.(vtt|srt)$/i.test(file.name)); setCaptions((prev) => [...prev, ...accepted.map((file) => ({ id: crypto.randomUUID(), file, language: "es", label: file.name.replace(/\.(srt|vtt)$/i, ""), isDefault: false }))]); };
  const addChapter = () => setChapters((prev) => [...prev, { title: "Nuevo capítulo", startSeconds: prev.length ? Math.min(duration || 60, prev[prev.length - 1].startSeconds + 60) : 0, endSeconds: null }]);
  const updateChapter = (index: number, patch: Partial<ChapterDraft>) => setChapters((prev) => prev.map((chapter, i) => i === index ? { ...chapter, ...patch } : chapter));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!isEdit && !video) return void toast.error("Selecciona un archivo de video");
    if (captions.filter((caption) => caption.isDefault).length > 1) return void toast.error("Selecciona como máximo un subtítulo principal.");
    const chapterError = validateChapterDrafts(chapters); if (chapterError) return void toast.error(chapterError);
    if (chapters.some((chapter) => chapter.startSeconds > duration)) return void toast.error("Hay un capítulo fuera de la duración del video.");
    setBusy(true);
    try {
      let videoPath = existingVideoPath;
      let thumbPath = existingThumbPath;
      if (video) videoPath = await uploadFile("videos", userId, video);
      if (thumb) thumbPath = await uploadFile("media", userId, thumb, "thumb-");
      let videoId: string;
      let finalCode = code ?? generateVideoCode();
      if (isEdit && existingQuery.data) {
        videoId = existingQuery.data.id;
        const { error } = await supabase.from("videos").update({ title: title.trim(), description: description.trim(), visibility, category, video_path: videoPath ?? undefined, thumbnail_path: thumbPath ?? undefined, duration_seconds: duration }).eq("id", videoId).eq("user_id", userId);
        if (error) throw error;
      } else {
        let inserted: { id: string; code: string } | null = null;
        for (let attempt = 0; attempt < 3 && !inserted; attempt += 1) {
          const { data, error } = await supabase.from("videos").insert({ user_id: userId, code: finalCode, title: title.trim(), description: description.trim(), visibility, category, video_path: videoPath ?? "", thumbnail_path: thumbPath ?? null, duration_seconds: duration }).select("id, code").single();
          if (!error) inserted = data;
          else if ((error as { code?: string }).code === "23505") finalCode = generateVideoCode();
          else throw error;
        }
        if (!inserted) throw new Error("No se pudo crear el video");
        videoId = inserted.id;
      }

      await syncVideoHashtags(videoId, `${title}\n${description}`);
      await supabase.from("video_captions").delete().eq("video_id", videoId);
      for (const caption of captions.filter((item) => item.file.size > 0)) {
        const normalized = normalizeCaptionText(await caption.file.text(), caption.file.name);
        const normalizedFile = new File([normalized], `${caption.file.name.replace(/\.(srt|vtt)$/i, "")}.vtt`, { type: "text/vtt" });
        const path = await uploadFile("media", userId, normalizedFile, "captions-");
        const { error } = await supabase.from("video_captions").insert({ video_id: videoId, user_id: userId, language_code: caption.language.toLowerCase().slice(0, 8), label: caption.label || caption.language, caption_path: path, is_default: caption.isDefault });
        if (error) throw error;
      }
      await supabase.from("video_chapters").delete().eq("video_id", videoId);
      if (chapters.length) {
        const sorted = [...chapters].sort((a, b) => a.startSeconds - b.startSeconds);
        const { error } = await supabase.from("video_chapters").insert(sorted.map((chapter, index) => ({ video_id: videoId, user_id: userId, title: chapter.title.trim(), start_seconds: Math.round(chapter.startSeconds), end_seconds: chapter.endSeconds == null ? null : Math.round(chapter.endSeconds), sort_order: index })));
        if (error) throw error;
      }
      if (isEdit && existingVideoPath && videoPath && existingVideoPath !== videoPath) {
        const slash = existingVideoPath.indexOf("/"); if (slash > -1) void supabase.storage.from(existingVideoPath.slice(0, slash)).remove([existingVideoPath.slice(slash + 1)]);
      }
      if (isEdit && existingThumbPath && thumbPath && existingThumbPath !== thumbPath) {
        const slash = existingThumbPath.indexOf("/"); if (slash > -1) void supabase.storage.from(existingThumbPath.slice(0, slash)).remove([existingThumbPath.slice(slash + 1)]);
      }
      void qc.invalidateQueries({ queryKey: ["my-videos", userId] });
      void qc.invalidateQueries({ queryKey: ["videos"] });
      toast.success(isEdit ? "Video actualizado" : "Video publicado");
      await navigate({ to: "/upload" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el video");
    } finally { setBusy(false); }
  };

  const hashtags = useMemo(() => extractHashtags(`${title}\n${description}`), [title, description]);
  if (isEdit && existingQuery.isLoading) return <div className="py-24 text-center text-muted-foreground">Cargando editor…</div>;
  if (isEdit && !existingQuery.data) return <div className="py-24 text-center text-muted-foreground">No se encontró ese video.</div>;

  return <div className="mx-auto max-w-4xl pb-16"><div className="mb-6 flex items-center justify-between gap-3"><div><Link to="/upload" className="text-sm text-muted-foreground hover:underline">← Volver a tus videos</Link><h1 className="mt-2 text-2xl font-bold">{isEdit ? "Editar video" : "Subir video"}</h1></div><span className="text-xs text-muted-foreground">{isEdit ? "Los cambios se guardan en tu canal" : "Publicación nueva"}</span></div><form onSubmit={save} className="space-y-6 rounded-2xl bg-surface p-6">
    {!isEdit && <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center hover:bg-surface-hover"><UploadCloud className="h-8 w-8 text-muted-foreground" /><span className="text-sm">{video ? `${video.name} · ${formatTimestamp(duration)}` : "Selecciona o arrastra tu archivo de video"}</span><input type="file" accept="video/*" className="hidden" onChange={(e) => void selectVideo(e.target.files?.[0] ?? null)} /></label>}
    {isEdit && <div className="rounded-xl border border-border bg-background p-4 text-sm"><p className="font-medium">Archivo actual</p><p className="mt-1 text-muted-foreground">{existingVideoPath?.split("/").pop()}</p><label className="mt-3 inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-hover">Reemplazar video<input type="file" accept="video/*" className="hidden" onChange={(e) => void selectVideo(e.target.files?.[0] ?? null)} /></label>{video && <p className="mt-2 text-xs text-primary">Nuevo archivo: {video.name}</p>}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2 sm:col-span-2"><Label htmlFor="title">Título</Label><Input id="title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></div><div className="space-y-2"><Label>Categoría</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="space-y-2"><Label>Visibilidad</Label><Select value={visibility} onValueChange={setVisibility}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">Público</SelectItem><SelectItem value="private">Privado</SelectItem></SelectContent></Select></div>
    <div className="space-y-2"><Label htmlFor="desc">Descripción</Label><Textarea id="desc" rows={8} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} /><p className="text-xs text-muted-foreground">Hashtags detectados: {hashtags.length}/50</p>{hashtags.length > 0 && <div className="flex flex-wrap gap-2">{hashtags.map((tag) => <Link key={tag} to="/hashtag/$tag" params={{ tag }} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/15">#{tag}</Link>)}</div>}</div>
    <div className="space-y-2"><Label htmlFor="thumb">Miniatura</Label><Input id="thumb" type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />{existingThumbPath && !thumb && <p className="text-xs text-muted-foreground">Se conservará la miniatura actual.</p>}</div>
    <section className="space-y-4 rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Subtítulos</h2><p className="text-xs text-muted-foreground">SRT y WebVTT.</p></div><label className="cursor-pointer rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-hover">Añadir archivos<input type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" multiple className="hidden" onChange={(e) => onCaptionFiles(e.target.files)} /></label></div>{captions.length === 0 && <p className="text-sm text-muted-foreground">No has añadido subtítulos.</p>}<div className="space-y-3">{captions.map((caption, index) => <div key={caption.id} className="grid gap-2 rounded-lg bg-background p-3 sm:grid-cols-[1fr_110px_1fr_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-medium">{caption.file.name}</p><p className="text-xs text-muted-foreground">{caption.file.size === 0 ? "Existente" : caption.isDefault ? "Nuevo · Principal" : "Nuevo"}</p></div><Input value={caption.language} maxLength={8} aria-label="Idioma" onChange={(e) => setCaptions((prev) => prev.map((c, i) => i === index ? { ...c, language: e.target.value } : c))} /><Input value={caption.label} aria-label="Etiqueta" onChange={(e) => setCaptions((prev) => prev.map((c, i) => i === index ? { ...c, label: e.target.value } : c))} /><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="radio" name="default-caption" checked={caption.isDefault} onChange={() => setCaptions((prev) => prev.map((c, i) => ({ ...c, isDefault: i === index })))} /> principal</label><Button type="button" variant="ghost" size="icon" onClick={() => setCaptions((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div></section>
    <section className="space-y-4 rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Capítulos / secciones</h2><p className="text-xs text-muted-foreground">Los capítulos se reemplazan al guardar.</p></div><Button type="button" variant="secondary" size="sm" onClick={addChapter}><Plus className="mr-1 h-4 w-4" />Capítulo</Button></div>{chapters.length === 0 && <p className="text-sm text-muted-foreground">Sin capítulos.</p>}<div className="space-y-3">{chapters.map((chapter, index) => <div key={`${index}-${chapter.title}`} className="grid gap-2 rounded-lg bg-background p-3 sm:grid-cols-[1.5fr_120px_120px_auto] sm:items-center"><Input value={chapter.title} aria-label="Título del capítulo" onChange={(e) => updateChapter(index, { title: e.target.value })} /><Input type="number" min={0} max={Math.max(duration, 0)} step={1} value={chapter.startSeconds} aria-label="Inicio en segundos" onChange={(e) => updateChapter(index, { startSeconds: Number(e.target.value) || 0 })} /><Input type="number" min={0} max={Math.max(duration, 0)} step={1} value={chapter.endSeconds ?? ""} placeholder="Fin opcional" aria-label="Fin en segundos" onChange={(e) => updateChapter(index, { endSeconds: e.target.value === "" ? null : Number(e.target.value) })} /><Button type="button" variant="ghost" size="icon" onClick={() => setChapters((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</div></section>
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button type="button" variant="ghost" onClick={() => void navigate({ to: "/upload" })}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Publicar video"}</Button></div>
  </form></div>;
}

function UploadPage() {
  const { user } = useAuth();
  const { edit, create } = Route.useSearch();
  if (!user) return <AppShell><p className="py-24 text-center text-muted-foreground">Inicia sesión para administrar tus videos.</p></AppShell>;
  return <AppShell>{edit || create ? <Editor userId={user.id} code={edit} /> : <Dashboard userId={user.id} />}</AppShell>;
}
