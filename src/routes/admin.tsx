import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  BadgeCheck,
  Megaphone,
  Search,
  ShieldCheck,
  Trash2,
  Video as VideoIcon,
  Plus,
  X,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, VerifiedBadge, SignedImage } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconPicker } from "@/components/IconPicker";
import { useAuth, type AppRole, type Profile } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";
import { deleteUserAccount as deleteAccount } from "@/lib/admin.functions";
import { uploadFile } from "@/lib/storage";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel de administración — CoreNetwork" },
      {
        name: "description",
        content: "Gestiona usuarios, roles, verificación, videos, anuncios y el banner del sitio.",
      },
      { property: "og:title", content: "Panel de administración — CoreNetwork" },
      { property: "og:description", content: "Herramientas de moderación de CoreNetwork." },
    ],
  }),
  component: AdminPage,
});

const ROLES: AppRole[] = ["admin", "moderator", "partner", "user"];

type AdminProfile = Profile & {
  roles: AppRole[];
  is_banned?: boolean;
  warnings_count?: number;
};

interface AdminVideo {
  id: string;
  title: string;
  user_id: string;
  views: number | null;
  created_at: string;
}

type Announcement = {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  image_path: string | null;
  post_type: "text" | "image" | "poll";
  created_at: string;
};

type SiteBannerRow = {
  message: string;
  color: string;
  icon: string | null;
  dismissible: boolean;
  is_active: boolean;
  updated_at: string;
};

// ============================================================
// Sección: Anuncios (blog)
// ============================================================
function AnnouncementsSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<"text" | "image" | "poll">("text");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  const { data: announcements } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });

  const resetForm = () => {
    setTitle("");
    setBody("");
    setPostType("text");
    setImageFile(null);
    setPollOptions(["", ""]);
  };

  const publish = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Ponle un título al anuncio");
      return;
    }
    if (postType === "image" && !imageFile) {
      toast.error("Selecciona una imagen");
      return;
    }
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (postType === "poll" && cleanOptions.length < 2) {
      toast.error("Agrega al menos 2 opciones para la encuesta");
      return;
    }

    setBusy(true);
    try {
      let image_path: string | null = null;
      if (postType === "image" && imageFile) {
        image_path = await uploadFile("media", user.id, imageFile, "announcement-");
      }

      const { data: created, error } = await supabase
        .from("announcements")
        .insert({
          author_id: user.id,
          title: title.trim(),
          body: body.trim() || null,
          image_path,
          post_type: postType,
        })
        .select()
        .single();
      if (error) throw error;

      if (postType === "poll") {
        const rows = cleanOptions.map((label, i) => ({
          announcement_id: created.id,
          label,
          position: i,
        }));
        const { error: optError } = await supabase.from("announcement_poll_options").insert(rows);
        if (optError) throw optError;
      }

      toast.success("Anuncio publicado");
      resetForm();
      void qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      void qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo publicar");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar este anuncio?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Anuncio eliminado");
    void qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    void qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-surface p-4">
        <h3 className="mb-3 font-medium">Nuevo anuncio</h3>
        <div className="space-y-3">
          <Input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Contenido (opcional)"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <div className="flex gap-2">
            {(["text", "image", "poll"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={postType === t ? "default" : "outline"}
                className="rounded-full capitalize"
                onClick={() => setPostType(t)}
              >
                {t === "text" ? "Texto" : t === "image" ? "Imagen" : "Encuesta"}
              </Button>
            ))}
          </div>

          {postType === "image" && (
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          )}

          {postType === "poll" && (
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Opción ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[i] = e.target.value;
                      setPollOptions(next);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setPollOptions([...pollOptions, ""])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar opción
              </Button>
            </div>
          )}

          <Button onClick={() => void publish()} disabled={busy} className="rounded-full">
            Publicar anuncio
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {announcements?.map((a) => (
          <div key={a.id} className="rounded-xl bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {a.title}
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {a.post_type === "text" ? "texto" : a.post_type === "image" ? "imagen" : "encuesta"}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                {a.body && <p className="mt-1 line-clamp-2 text-sm">{a.body}</p>}
                {a.post_type === "image" && a.image_path && (
                  <div className="mt-2 h-24 w-40 overflow-hidden rounded-lg bg-background">
                    <SignedImage path={a.image_path} alt={a.title} className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <Button size="sm" variant="destructive" className="rounded-full" onClick={() => void remove(a.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {announcements?.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">Aún no has publicado anuncios.</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Sección: Banner del sitio
// ============================================================
function BannerSection() {
  const [banner, setBanner] = useState<SiteBannerRow | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["admin-site-banner"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_banner").select("*").eq("id", true).maybeSingle();
      if (error) throw error;
      return data as SiteBannerRow;
    },
  });

  useEffect(() => {
    if (data) setBanner(data);
  }, [data]);

  const save = async () => {
    if (!banner) return;
    setBusy(true);
    const { error } = await supabase
      .from("site_banner")
      .update({
        message: banner.message,
        color: banner.color,
        icon: banner.icon,
        dismissible: banner.dismissible,
        is_active: banner.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Banner actualizado");
    void refetch();
  };

  if (!banner) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="max-w-lg space-y-4 rounded-xl bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <Label>Banner activo</Label>
        </div>
        <Switch
          checked={banner.is_active}
          onCheckedChange={(v) => setBanner({ ...banner, is_active: v })}
        />
      </div>

      <div className="space-y-2">
        <Label>Texto del aviso</Label>
        <Textarea
          rows={2}
          placeholder="Ej: Estamos experimentando problemas con la subida de videos."
          value={banner.message}
          onChange={(e) => setBanner({ ...banner, message: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Color de fondo</Label>
        <input
          type="color"
          value={banner.color}
          onChange={(e) => setBanner({ ...banner, color: e.target.value })}
          className="h-10 w-20 cursor-pointer rounded-md border border-border bg-transparent"
        />
      </div>

      <div className="space-y-2">
        <Label>Icono</Label>
        <IconPicker value={banner.icon} onChange={(icon) => setBanner({ ...banner, icon })} />
      </div>

      <div className="flex items-center justify-between">
        <Label>¿Se puede cerrar?</Label>
        <Switch
          checked={banner.dismissible}
          onCheckedChange={(v) => setBanner({ ...banner, dismissible: v })}
        />
      </div>

      <Button onClick={() => void save()} disabled={busy} className="w-full rounded-full">
        Guardar banner
      </Button>

      {/* Vista previa */}
      {banner.is_active && banner.message && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-black"
          style={{ backgroundColor: banner.color }}
        >
          {banner.message}
        </div>
      )}
    </div>
  );
}

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [videoQ, setVideoQ] = useState("");

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleRows = (roles ?? []) as { user_id: string; role: AppRole }[];
      return ((profiles ?? []) as unknown as AdminProfile[]).map((p) => ({
        ...p,
        roles: roleRows.filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  const { data: applications } = useQuery({
    queryKey: ["admin-partner-apps"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_applications")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as {
        id: string;
        user_id: string;
        message: string;
        status: string;
        created_at: string;
      }[];
    },
  });

  const { data: videos } = useQuery({
    queryKey: ["admin-videos"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, title, user_id, views, created_at")
        .order("created_at", { ascending: false });
      return (data ?? []) as AdminVideo[];
    },
  });

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    if (has) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Roles actualizados");
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const toggleVerified = async (userId: string, value: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: value }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(value ? "Canal verificado" : "Verificación retirada");
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const toggleBanned = async (userId: string, value: boolean) => {
    if (value && !window.confirm("¿Banear a este usuario? No podrá acceder a su cuenta mientras esté baneado.")) {
      return;
    }
    const { error } = await supabase.from("profiles").update({ is_banned: value }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(value ? "Usuario baneado" : "Usuario desbaneado");
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const warnUser = async (target: AdminProfile) => {
    const reason = window.prompt("Motivo de la advertencia (el usuario podrá verlo):");
    if (!reason) return;

    const { error: warnError } = await supabase.from("user_warnings").insert({
      user_id: target.id,
      reason,
      issued_by: user?.id ?? null,
    });
    if (warnError) { toast.error(warnError.message); return; }

    const { error: countError } = await supabase
      .from("profiles")
      .update({ warnings_count: (target.warnings_count ?? 0) + 1 })
      .eq("id", target.id);
    if (countError) { toast.error(countError.message); return; }

    toast.success("Advertencia enviada");
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const deleteUser = async (userId: string) => {
    if (
      !window.confirm(
        "¿Eliminar esta cuenta de forma permanente? Se borrarán su perfil y su acceso. Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    try {
      await deleteAccount({ data: { userId } });
      toast.success("Cuenta eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar la cuenta");
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const deleteVideo = async (videoId: string) => {
    if (!window.confirm("¿Eliminar este video de la plataforma? Esta acción no se puede deshacer.")) {
      return;
    }
    const { error } = await supabase.from("videos").delete().eq("id", videoId);
    if (error) { toast.error(error.message); return; }
    toast.success("Video eliminado");
    void qc.invalidateQueries({ queryKey: ["admin-videos"] });
  };

  const resolveApplication = async (id: string, userId: string, status: string) => {
    const { error } = await supabase.from("partner_applications").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (status === "approved") {
      await supabase.from("user_roles").insert({ user_id: userId, role: "partner" });
    }
    void qc.invalidateQueries({ queryKey: ["admin-partner-apps"] });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success("Solicitud actualizada");
  };

  if (loading) {
    return (
      <AppShell>
        <p className="py-24 text-center text-muted-foreground">Cargando…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="py-24 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            Esta zona es solo para administradores.
          </p>
        </div>
      </AppShell>
    );
  }

  const filtered = (users ?? []).filter(
    (u) =>
      u.username?.toLowerCase().includes(q.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(q.toLowerCase()),
  );

  const filteredVideos = (videos ?? []).filter((v) =>
    v.title?.toLowerCase().includes(videoQ.toLowerCase()),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" /> Panel de administración
        </h1>

        <Tabs defaultValue="users">
          <TabsList className="flex-wrap">
            <TabsTrigger value="users">Usuarios y roles</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="partners">
              Solicitudes Partner
              {applications?.some((a) => a.status === "pending") && (
                <span className="ml-2 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {applications.filter((a) => a.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <Megaphone className="mr-1.5 h-3.5 w-3.5" /> Anuncios
            </TabsTrigger>
            <TabsTrigger value="banner">
              <Radio className="mr-1.5 h-3.5 w-3.5" /> Banner del sitio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="pt-5">
            <div className="mb-4 flex items-center gap-2 rounded-full bg-surface px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar usuario"
                className="border-0 bg-transparent focus-visible:ring-0"
              />
            </div>

            <div className="space-y-3">
              {filtered.map((u) => (
                <div key={u.id} className="rounded-xl bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <ChannelAvatar
                      path={u.avatar_path}
                      name={u.display_name || u.username}
                      size={44}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-medium">
                        {u.display_name || u.username}
                        {u.is_verified && <VerifiedBadge className="h-4 w-4" />}
                        {u.is_banned && (
                          <Badge variant="destructive" className="rounded-full text-[10px]">
                            Baneado
                          </Badge>
                        )}
                        {!!u.warnings_count && (
                          <Badge variant="secondary" className="rounded-full text-[10px]">
                            {u.warnings_count} advertencia{u.warnings_count === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{u.username} · se unió {timeAgo(u.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        checked={u.is_verified}
                        onCheckedChange={(v) => void toggleVerified(u.id, v)}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {ROLES.map((role) => {
                      const has = u.roles.includes(role);
                      return (
                        <Button
                          key={role}
                          size="sm"
                          variant={has ? "default" : "outline"}
                          className="rounded-full capitalize"
                          onClick={() => void toggleRole(u.id, role, has)}
                        >
                          {role}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => void warnUser(u)}
                    >
                      <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Advertencia
                    </Button>
                    <Button
                      size="sm"
                      variant={u.is_banned ? "outline" : "destructive"}
                      className="rounded-full"
                      onClick={() => void toggleBanned(u.id, !u.is_banned)}
                    >
                      <Ban className="mr-1.5 h-3.5 w-3.5" />
                      {u.is_banned ? "Quitar baneo" : "Banear"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full"
                      onClick={() => void deleteUser(u.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar cuenta
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="py-12 text-center text-muted-foreground">Sin resultados.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="videos" className="pt-5">
            <div className="mb-4 flex items-center gap-2 rounded-full bg-surface px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={videoQ}
                onChange={(e) => setVideoQ(e.target.value)}
                placeholder="Buscar video por título"
                className="border-0 bg-transparent focus-visible:ring-0"
              />
            </div>

            <div className="space-y-3">
              {filteredVideos.map((v) => {
                const author = users?.find((u) => u.id === v.user_id);
                return (
                  <div key={v.id} className="flex items-center gap-3 rounded-xl bg-surface p-4">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10">
                      <VideoIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{v.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {author?.display_name || author?.username || "Usuario"} · subido{" "}
                        {timeAgo(v.created_at)} · {v.views ?? 0} vistas
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full"
                      onClick={() => void deleteVideo(v.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
                    </Button>
                  </div>
                );
              })}
              {filteredVideos.length === 0 && (
                <p className="py-12 text-center text-muted-foreground">Sin resultados.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="partners" className="pt-5 space-y-3">
            {applications && applications.length > 0 ? (
              applications.map((a) => {
                const author = users?.find((u) => u.id === a.user_id);
                return (
                  <div key={a.id} className="rounded-xl bg-surface p-4">
                    <div className="flex items-center gap-3">
                      <ChannelAvatar
                        path={author?.avatar_path}
                        name={author?.display_name ?? "U"}
                        size={40}
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {author?.display_name || author?.username || "Usuario"}
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                      </div>
                      <Badge variant={a.status === "pending" ? "secondary" : "outline"}>
                        {a.status}
                      </Badge>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm">{a.message}</p>
                    {a.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void resolveApplication(a.id, a.user_id, "approved")}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void resolveApplication(a.id, a.user_id, "rejected")}
                        >
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                No hay solicitudes por revisar.
              </p>
            )}
          </TabsContent>

          <TabsContent value="announcements" className="pt-5">
            <AnnouncementsSection />
          </TabsContent>

          <TabsContent value="banner" className="pt-5">
            <BannerSection />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
