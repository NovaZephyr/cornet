import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  BadgeCheck,
  Search,
  ShieldCheck,
  Trash2,
  Video as VideoIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, type AppRole, type Profile } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel de administración — TocinoTube" },
      {
        name: "description",
        content: "Gestiona usuarios, roles, verificación, videos y solicitudes del programa Partner.",
      },
      { property: "og:title", content: "Panel de administración — TocinoTube" },
      { property: "og:description", content: "Herramientas de moderación de TocinoTube." },
    ],
  }),
  component: AdminPage,
});

const ROLES: AppRole[] = ["admin", "moderator", "partner", "user"];

// Estas columnas/tablas son adicionales a lo que ya tenías:
// - profiles.is_banned (boolean, default false)
// - profiles.warnings_count (integer, default 0)
// - tabla user_warnings (id, user_id, reason, issued_by, created_at)
// Ajusta los nombres si en tu base de datos se llaman distinto.
type AdminProfile = Profile & {
  roles: AppRole[];
  is_banned?: boolean;
  warnings_count?: number;
};

interface AdminVideo {
  id: string;
  title: string;
  user_id: string;
  view_count: number | null;
  created_at: string;
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
      return ((profiles ?? []) as AdminProfile[]).map((p) => ({
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
        .select("id, title, user_id, view_count, created_at")
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
      issued_by: user?.id,
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
    // Borrar un usuario de auth.users requiere la service role key, así que esto
    // se delega a una Edge Function (ver supabase/functions/admin-delete-user).
    const { error } = await supabase.functions.invoke("admin-delete-user", {
      body: { userId },
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Cuenta eliminada");
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
          <TabsList>
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
                        {timeAgo(v.created_at)} · {v.view_count ?? 0} vistas
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
        </Tabs>
      </div>
    </AppShell>
  );
}
