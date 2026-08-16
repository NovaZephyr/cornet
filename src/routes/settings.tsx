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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, type ChannelStyle } from "@/hooks/useAuth";
import { uploadFile } from "@/lib/storage";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const CHANNEL_STYLES: { value: ChannelStyle; label: string; description: string }[] = [
  { value: "corenetwork", label: "CoreNetwork", description: "Diseño clásico propio de CoreNetwork." },
  { value: "channel-1", label: "Channel 1.0", description: "Canal clásico, compacto y centrado en pestañas." },
  { value: "channel-2", label: "Channel 2.0", description: "Diseño clásico más modular con contenido destacado." },
  { value: "cosmic-panda", label: "Cosmic Panda", description: "La variante retro inspirada en la era 2012." },
];

function SettingsPage() {
  const { user, profile, refresh, isPartner, isAdmin } = useAuth();
  const canCustomize = isPartner || isAdmin;
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("#ff0033");
  const [channelStyle, setChannelStyle] = useState<ChannelStyle>("corenetwork");
  const [busy, setBusy] = useState(false);
  const [styleBusy, setStyleBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setDescription(profile.description ?? "");
    setAccent(profile.accent_color ?? "#ff0033");
    setChannelStyle(profile.channel_style ?? "corenetwork");
  }, [profile]);

  const uploadTo = async (field: "avatar_path" | "banner_path" | "background_path" | "gif_path", file: File) => {
    if (!user) return;
    setBusy(true);
    try {
      const path = await uploadFile("media", user.id, file, `${field}-`);
      const { error } = await supabase.from("profiles").update({ [field]: path }).eq("id", user.id);
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
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, username: cleanUsername, description, accent_color: accent })
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

  const saveChannelStyle = async () => {
    if (!user) return;
    setStyleBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ channel_style: channelStyle })
        .eq("id", user.id);
      if (error) throw error;
      await refresh();
      toast.success(`Diseño guardado: ${CHANNEL_STYLES.find((item) => item.value === channelStyle)?.label ?? channelStyle}`);
    } catch (err) {
      toast.error(err instanceof Error ? `${err.message}. Ejecuta la migración SQL de channel_style en Supabase.` : "No se pudo guardar el diseño del canal");
    } finally {
      setStyleBusy(false);
    }
  };

  if (!user || !profile) {
    return <AppShell><p className="py-24 text-center text-muted-foreground">Inicia sesión para personalizar tu canal.</p></AppShell>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        <div>
          <h1 className="text-2xl font-bold">Personalizar canal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu identidad, tu canal. El estilo clásico solo afecta a los canales cuando está activo el tema 2012 / Cosmic Panda.</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="images">Imágenes</TabsTrigger>
            <TabsTrigger value="style">Diseño del canal</TabsTrigger>
            <TabsTrigger value="partner">Partner</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="pt-5">
            <form onSubmit={save} className="space-y-4 rounded-2xl bg-surface p-6">
              <div className="space-y-2"><Label htmlFor="dn">Nombre visible</Label><Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="un">Nombre de usuario</Label><Input id="un" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="de">Descripción</Label><Textarea id="de" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="ac">Color de acento</Label><input id="ac" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-20 cursor-pointer rounded-md border border-border bg-transparent" /></div>
              <Button type="submit" disabled={busy}>Guardar cambios</Button>
            </form>
          </TabsContent>

          <TabsContent value="images" className="pt-5">
            <section className="space-y-4 rounded-2xl bg-surface p-6">
              <div><Label>Banner</Label><div className="mt-2 aspect-[6/1] w-full overflow-hidden rounded-xl bg-background"><SignedImage path={profile.banner_path} alt="Banner del canal" className="h-full w-full object-cover" /></div><Input type="file" accept="image/*" className="mt-2" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadTo("banner_path", f); }} /></div>
              <div className="flex items-end gap-4"><ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={72} /><div className="flex-1"><Label>Foto de perfil</Label><Input type="file" accept="image/*" className="mt-2" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadTo("avatar_path", f); }} /></div></div>
            </section>
          </TabsContent>

          <TabsContent value="style" className="pt-5">
            <section className="space-y-5 rounded-2xl bg-surface p-6">
              <div>
                <h2 className="font-semibold">Diseños clásicos de canal</h2>
                <p className="mt-1 text-sm text-muted-foreground">Selecciona la identidad visual de tu canal. La variante elegida se aplica exclusivamente dentro del tema global <strong>YouTube 2012 / Cosmic Panda</strong>; el resto de temas mantiene el diseño moderno de CoreNetwork.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {CHANNEL_STYLES.map((style) => (
                  <button key={style.value} type="button" onClick={() => setChannelStyle(style.value)} className={`rounded-xl border p-4 text-left transition ${channelStyle === style.value ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border bg-background hover:bg-surface-hover"}`}>
                    <p className="font-medium">{style.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{style.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                <div>
                  <p className="text-sm font-medium">Diseño seleccionado</p>
                  <p className="text-xs text-muted-foreground">{CHANNEL_STYLES.find((item) => item.value === channelStyle)?.label}</p>
                </div>
                <Button type="button" disabled={styleBusy} onClick={() => void saveChannelStyle()}>{styleBusy ? "Guardando…" : "Guardar diseño"}</Button>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="partner" className="pt-5">
            <div className="rounded-2xl bg-surface p-6"><div className="flex items-center justify-between gap-2"><Label>Fondo del canal y GIF de perfil</Label><span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">Solo Partners</span></div>{canCustomize ? <div className="mt-3 space-y-4"><div><Label className="text-xs text-muted-foreground">Fondo del canal</Label><Input type="file" accept="image/*" className="mt-2" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadTo("background_path", f); }} /></div><div><Label className="text-xs text-muted-foreground">GIF animado del perfil</Label><Input type="file" accept="image/gif" className="mt-2" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadTo("gif_path", f); }} /></div></div> : <p className="mt-2 text-sm text-muted-foreground">Únete al Programa Partner para poner un fondo personalizado y un GIF animado en tu canal.</p>}</div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
