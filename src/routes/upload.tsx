import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/lib/storage";
import { generateVideoCode } from "@/lib/videoCode";
import { formatTimestamp, normalizeCaptionText, type ChapterDraft, validateChapterDrafts } from "@/lib/captions";

export const Route = createFileRoute("/upload")({ head: () => ({ meta: [{ title: "Subir video — CoreNetwork" }] }), component: UploadPage });

type CaptionDraft = { id: string; file: File; language: string; label: string; isDefault: boolean };
const CATEGORIES = ["Autos & Vehicles", "Comedy", "Entertainment", "Film & Animation", "Gaming", "Howto & Style", "Nonprofits & Activism", "People & Blogs", "Pets & Animals", "Science & Technology", "Sports", "Travel & Events", "Education", "Music"] as const;

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [category, setCategory] = useState<string>("Entertainment");
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState<CaptionDraft[]>([]);
  const [chapters, setChapters] = useState<ChapterDraft[]>([]);
  const [busy, setBusy] = useState(false);

  const readDuration = (file: File) => new Promise<number>((resolve) => {
    const el = document.createElement("video"); el.preload = "metadata";
    el.onloadedmetadata = () => { resolve(Math.round(el.duration) || 0); URL.revokeObjectURL(el.src); };
    el.onerror = () => resolve(0); el.src = URL.createObjectURL(file);
  });
  const selectVideo = async (file: File | null) => { setVideo(file); setDuration(file ? await readDuration(file) : 0); if (file && chapters.length === 0) setChapters([{ title: "Introducción", startSeconds: 0, endSeconds: null }]); };
  const onCaptionFiles = (files: FileList | null) => { if (!files) return; const accepted = [...files].filter((file) => /\.(vtt|srt)$/i.test(file.name)); setCaptions((prev) => [...prev, ...accepted.map((file) => ({ id: crypto.randomUUID(), file, language: "es", label: file.name.replace(/\.(srt|vtt)$/i, ""), isDefault: false }))]); };
  const addChapter = () => setChapters((prev) => [...prev, { title: "Nuevo capítulo", startSeconds: prev.length ? Math.min(duration || 60, prev[prev.length - 1].startSeconds + 60) : 0, endSeconds: null }]);
  const removeChapter = (index: number) => setChapters((prev) => prev.filter((_, i) => i !== index));
  const updateChapter = (index: number, patch: Partial<ChapterDraft>) => setChapters((prev) => prev.map((chapter, i) => (i === index ? { ...chapter, ...patch } : chapter)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return void toast.error("Inicia sesión para subir videos");
    if (!video) return void toast.error("Selecciona un archivo de video");
    const chapterError = validateChapterDrafts(chapters); if (chapterError) return void toast.error(chapterError);
    if (chapters.some((chapter) => chapter.startSeconds > duration)) return void toast.error("Hay un capítulo fuera de la duración del video.");
    if (captions.filter((caption) => caption.isDefault).length > 1) return void toast.error("Selecciona como máximo un subtítulo principal.");

    setBusy(true);
    let videoCode: string | null = null;
    const postProcessErrors: string[] = [];

    try {
      // These two uploads are prerequisites: without them the video itself cannot be published.
      const videoPath = await uploadFile("videos", user.id, video);
      const thumbPath = thumb ? await uploadFile("media", user.id, thumb, "thumb-") : null;

      let data: { id: string; code: string } | null = null;
      let candidate = generateVideoCode();
      for (let attempt = 0; attempt < 3 && !data; attempt += 1) {
        const { data: inserted, error } = await supabase
          .from("videos")
          .insert({
            user_id: user.id,
            code: candidate,
            title: title.trim(),
            description: description.trim(),
            visibility,
            category,
            video_path: videoPath,
            thumbnail_path: thumbPath,
            duration_seconds: duration,
          })
          .select("id, code")
          .single();

        if (!error) data = inserted as { id: string; code: string };
        else if ((error as { code?: string }).code === "23505") candidate = generateVideoCode();
        else throw error;
      }
      if (!data) throw new Error("No se pudo generar un código único para el video");

      // From this point onward the video is already published. Optional metadata must
      // never turn a successful upload into a false "No se pudo subir el video" error.
      videoCode = data.code;

      for (const caption of captions) {
        try {
          const normalized = normalizeCaptionText(await caption.file.text(), caption.file.name);
          const normalizedFile = new File(
            [normalized],
            `${caption.file.name.replace(/\.(srt|vtt)$/i, "")}.vtt`,
            { type: "text/vtt" },
          );
          const path = await uploadFile("media", user.id, normalizedFile, "captions-");
          const { error } = await supabase.from("video_captions").insert({
            video_id: data.id,
            user_id: user.id,
            language_code: caption.language.toLowerCase().slice(0, 8),
            label: caption.label || caption.language,
            caption_path: path,
            is_default: caption.isDefault,
          });
          if (error) throw error;
        } catch (error) {
          postProcessErrors.push(`subtítulo "${caption.label || caption.file.name}"`);
          console.error("[Upload] Caption processing failed after video publish", error);
        }
      }

      if (chapters.length) {
        try {
          const sorted = [...chapters].sort((a, b) => a.startSeconds - b.startSeconds);
          const { error } = await supabase.from("video_chapters").insert(
            sorted.map((chapter, index) => ({
              video_id: data!.id,
              user_id: user.id,
              title: chapter.title.trim(),
              start_seconds: Math.round(chapter.startSeconds),
              end_seconds: chapter.endSeconds == null ? null : Math.round(chapter.endSeconds),
              sort_order: index,
            })),
          );
          if (error) throw error;
        } catch (error) {
          postProcessErrors.push("capítulos");
          console.error("[Upload] Chapter processing failed after video publish", error);
        }
      }

      toast.success(postProcessErrors.length ? "Video publicado" : "Video publicado");
      if (postProcessErrors.length) {
        toast.warning(`El video se publicó, pero no se pudieron guardar: ${postProcessErrors.join(", ")}.`);
      }

      await navigate({ to: "/watch", search: { v: videoCode } });
    } catch (err) {
      // Only show a hard upload error before the video record is created.
      // If a future backend change leaves us with a code, treat it as published.
      if (videoCode) {
        toast.warning("El video se publicó, aunque hubo un problema procesando algunos datos adicionales.");
        await navigate({ to: "/watch", search: { v: videoCode } });
      } else {
        toast.error(err instanceof Error ? err.message : "No se pudo subir el video");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!user) return <AppShell><p className="py-24 text-center text-muted-foreground">Inicia sesión para subir videos.</p></AppShell>;
  return <AppShell><div className="mx-auto max-w-3xl pb-16"><h1 className="mb-6 text-2xl font-bold">Subir video</h1><form onSubmit={submit} className="space-y-6 rounded-2xl bg-surface p-6">
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center hover:bg-surface-hover"><UploadCloud className="h-8 w-8 text-muted-foreground" /><span className="text-sm">{video ? `${video.name} · ${formatTimestamp(duration)}` : "Selecciona o arrastra tu archivo de video"}</span><input type="file" accept="video/*" className="hidden" onChange={(e) => void selectVideo(e.target.files?.[0] ?? null)} /></label>
    <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2 sm:col-span-2"><Label htmlFor="title">Título</Label><Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} /></div><div className="space-y-2"><Label>Categoría</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="space-y-2"><Label>Visibilidad</Label><Select value={visibility} onValueChange={setVisibility}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">Público</SelectItem><SelectItem value="private">Privado</SelectItem></SelectContent></Select></div>
    <div className="space-y-2"><Label htmlFor="desc">Descripción</Label><Textarea id="desc" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="thumb">Miniatura</Label><Input id="thumb" type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} /></div>
    <section className="space-y-4 rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Subtítulos</h2><p className="text-xs text-muted-foreground">SRT y WebVTT. Los SRT se convierten automáticamente.</p></div><label className="cursor-pointer rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-hover">Añadir archivos<input type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" multiple className="hidden" onChange={(e) => onCaptionFiles(e.target.files)} /></label></div>{captions.length === 0 && <p className="text-sm text-muted-foreground">No has añadido subtítulos.</p>}<div className="space-y-3">{captions.map((caption, index) => <div key={caption.id} className="grid gap-2 rounded-lg bg-background p-3 sm:grid-cols-[1fr_110px_1fr_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-medium">{caption.file.name}</p><p className="text-xs text-muted-foreground">{caption.isDefault ? "Principal" : "Subtítulo"}</p></div><Input value={caption.language} maxLength={8} aria-label="Idioma" onChange={(e) => setCaptions((prev) => prev.map((c, i) => i === index ? { ...c, language: e.target.value } : c))} /><Input value={caption.label} aria-label="Etiqueta" onChange={(e) => setCaptions((prev) => prev.map((c, i) => i === index ? { ...c, label: e.target.value } : c))} /><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="radio" name="default-caption" checked={caption.isDefault} onChange={() => setCaptions((prev) => prev.map((c, i) => ({ ...c, isDefault: i === index })))} /> principal</label><Button type="button" variant="ghost" size="icon" onClick={() => setCaptions((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div></div>)}</div></section>
    <section className="space-y-4 rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Capítulos / secciones</h2><p className="text-xs text-muted-foreground">Se muestran como accesos rápidos en el reproductor.</p></div><Button type="button" variant="secondary" size="sm" onClick={addChapter}><Plus className="mr-1 h-4 w-4" />Capítulo</Button></div>{chapters.length === 0 && <p className="text-sm text-muted-foreground">Sin capítulos.</p>}<div className="space-y-3">{chapters.map((chapter, index) => <div key={`${index}-${chapter.title}`} className="grid gap-2 rounded-lg bg-background p-3 sm:grid-cols-[1.5fr_120px_120px_auto] sm:items-center"><Input value={chapter.title} aria-label="Título del capítulo" onChange={(e) => updateChapter(index, { title: e.target.value })} /><Input type="number" min={0} max={Math.max(duration, 0)} step={1} value={chapter.startSeconds} aria-label="Inicio en segundos" onChange={(e) => updateChapter(index, { startSeconds: Number(e.target.value) || 0 })} /><Input type="number" min={0} max={Math.max(duration, 0)} step={1} value={chapter.endSeconds ?? ""} placeholder="Fin opcional" aria-label="Fin en segundos" onChange={(e) => updateChapter(index, { endSeconds: e.target.value === "" ? null : Number(e.target.value) })} /><Button type="button" variant="ghost" size="icon" onClick={() => removeChapter(index)}><Trash2 className="h-4 w-4" /></Button></div>)}</div></section>
    <Button type="submit" disabled={busy} className="w-full">{busy ? "Subiendo y procesando…" : "Publicar video"}</Button>
  </form></div></AppShell>;
}
