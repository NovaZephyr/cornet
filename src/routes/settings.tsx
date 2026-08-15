import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/lib/storage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Personalizar canal — CoreNetwork" },
      {
        name: "description",
        content: "Cambia tu avatar, banner, fondo, color de acento y descripción de canal.",
      },
      { property: "og:title", content: "Personalizar canal — CoreNetwork" },
      { property: "og:description", content: "Haz que tu canal se vea como tú quieras." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, refresh } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("#ff0033");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setDescription(profile.description ?? "");
    setAccent(profile.accent_color ?? "#ff0033");
  }, [profile]);

  const uploadTo = async (field: "avatar_path" | "banner_path" | "background_path", file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const path = await uploadFile("media", user.id, file, `${field}-`);
      const patch =
        field === "avatar_path"
          ? { avatar_path: path }
          : field === "banner_path"
            ? { banner_path: path }
            : { background_path: path };
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
      await refresh();
      toast.success("Imagen actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          username: username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
          description,
          accent_color: accent,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refresh();
      toast.success("Perfil guardado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  if (!user || !profile) {
    return (
      <AppShell>
        <p className="py-24 text-center text-muted-foreground">
          Inicia sesión para personalizar tu canal.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Personalizar canal</h1>

        <section className="space-y-4 rounded-2xl bg-surface p-6">
          <div>
            <Label>Banner</Label>
            <div className="mt-2 aspect-[6/1] w-full overflow-hidden rounded-xl bg-background">
              <SignedImage
                path={profile.banner_path}
                alt="Banner del canal"
                className="h-full w-full object-cover"
              />
            </div>
            <Input
              type="file"
              accept="image/*"
              className="mt-2"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadTo("banner_path", f);
              }}
            />
          </div>

          <div className="flex items-end gap-4">
            <ChannelAvatar
              path={profile.avatar_path}
              name={profile.display_name || profile.username}
              size={72}
            />
            <div className="flex-1">
              <Label>Foto de perfil</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-2"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadTo("avatar_path", f);
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <Label>Fondo del canal y GIF de perfil</Label>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                Solo Partners
              </span>
            </div>
            {canCustomize ? (
              <div className="mt-3 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Fondo del canal</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-2"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadTo("background_path", f);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">GIF animado del perfil</Label>
                  <Input
                    type="file"
                    accept="image/gif"
                    className="mt-2"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadTo("gif_path", f);
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Únete al Programa Partner para poner un fondo personalizado y un GIF animado en tu
                canal.
              </p>
            )}
          </div>
        </section>

        <form onSubmit={save} className="space-y-4 rounded-2xl bg-surface p-6">
          <div className="space-y-2">
            <Label htmlFor="dn">Nombre visible</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="un">Nombre de usuario</Label>
            <Input id="un" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="de">Descripción</Label>
            <Textarea
              id="de"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ac">Color de acento</Label>
            <input
              id="ac"
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-md border border-border bg-transparent"
            />
          </div>
          <Button type="submit" disabled={busy}>
            Guardar cambios
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
