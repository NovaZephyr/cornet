import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/lib/storage";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Subir video — TocinoTube" },
      { name: "description", content: "Sube un video a tu canal con miniatura, título y descripción." },
      { property: "og:title", content: "Subir video — TocinoTube" },
      { property: "og:description", content: "Publica tu contenido en TocinoTube." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const readDuration = (file: File) =>
    new Promise<number>((resolve) => {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        resolve(Math.round(el.duration) || 0);
        URL.revokeObjectURL(el.src);
      };
      el.onerror = () => resolve(0);
      el.src = URL.createObjectURL(file);
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Inicia sesión para subir videos");
      return;
    }
    if (!video) {
      toast.error("Selecciona un archivo de video");
      return;
    }
    setBusy(true);
    try {
      const duration = await readDuration(video);
      const videoPath = await uploadFile("videos", user.id, video);
      const thumbPath = thumb ? await uploadFile("media", user.id, thumb, "thumb-") : null;
      const { data, error } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          title,
          description,
          visibility,
          video_path: videoPath,
          thumbnail_path: thumbPath,
          duration_seconds: duration,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Video publicado");
      void navigate({ to: "/watch/$videoId", params: { videoId: (data as { id: string }).id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el video");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <AppShell>
        <p className="py-24 text-center text-muted-foreground">
          Inicia sesión para subir videos.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Subir video</h1>
        <form onSubmit={submit} className="space-y-5 rounded-2xl bg-surface p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center hover:bg-surface-hover">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm">
              {video ? video.name : "Selecciona o arrastra tu archivo de video"}
            </span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Descripción</Label>
            <Textarea
              id="desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumb">Miniatura</Label>
            <Input
              id="thumb"
              type="file"
              accept="image/*"
              onChange={(e) => setThumb(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label>Visibilidad</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Público</SelectItem>
                <SelectItem value="private">Privado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Subiendo…" : "Publicar video"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
