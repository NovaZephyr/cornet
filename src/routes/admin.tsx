import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Building2, FileText, Flag, LayoutDashboard, Megaphone, Search, ShieldCheck, Sparkles, Trash2, Users, Video, Wrench, XCircle, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { untypedDb } from "@/lib/untyped-db";
import { AppShell } from "@/components/AppShell";
import { AdminAdsPanel } from "@/components/AdminAdsPanel";
import { AdminSpotlightPanel } from "@/components/AdminSpotlightPanel";
import { AdminReports } from "@/routes/admin.reports";
import { AdminBannersPage } from "@/routes/admin-banners";
import { AdminBlogPage } from "@/routes/admin-blog";
import { AdminCornetPage } from "@/routes/admin-cornet";
import { AdminMaintenancePage } from "@/routes/admin-maintenance";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, type AppRole, type Profile } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";
import { deleteVideoAsAdmin, setVideoAgeRestriction } from "@/lib/admin.functions";
import "@/admin-dashboard.css";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administración — Cornet" }, { name: "robots", content: "noindex, nofollow, noarchive" }, { name: "description", content: "Dashboard privado de moderación de Cornet." }] }),
  notFoundComponent: () => <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><div className="text-7xl font-bold text-foreground">404</div><p className="mt-3 text-muted-foreground">Esta página no existe.</p></div></div>,
  component: AdminDashboard,
});

type AdminUser = Pick<Profile, "id" | "username" | "display_name" | "avatar_path" | "is_verified" | "is_banned" | "moderation_status" | "moderation_reason" | "moderation_suspended_until" | "warnings_count" | "created_at"> & { roles: AppRole[] };
type AdminVideo = { id: string; title: string; user_id: string; views: number | null; created_at: string; age_restricted: boolean };
type AdminReport = { id: string; target_type: "video" | "channel"; reason: string; status: string; created_at: string };
function isStaff(roles: AppRole[]) { return roles.includes("admin") || roles.includes("moderator"); }
type ModerationAction = "warning" | "suspended" | "banned";

function useAdminData(enabled: boolean) {
  const users = useQuery({ queryKey: ["admin-dashboard-users"], enabled, queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100); if (error) throw error; const rows = (data ?? []) as Omit<AdminUser, "roles">[]; if (!rows.length) return []; const { data: roles, error: roleError } = await supabase.from("user_roles").select("user_id,role").in("user_id", rows.map((r) => r.id)); if (roleError) throw roleError; const byUser = new Map<string, AppRole[]>(); for (const row of roles ?? []) { const bucket = byUser.get(row.user_id) ?? []; bucket.push(row.role as AppRole); byUser.set(row.user_id, bucket); } return rows.map((row) => ({ ...row, moderation_status: row.is_banned ? "banned" : row.moderation_status ?? "active", roles: byUser.get(row.id) ?? ["user"] })); } });
  const videos = useQuery({ queryKey: ["admin-dashboard-videos"], enabled, queryFn: async () => { const { data, error } = await supabase.from("videos").select("id,title,user_id,views,created_at,age_restricted").order("created_at", { ascending: false }).limit(100); if (error) throw error; return (data ?? []) as AdminVideo[]; } });
  const reports = useQuery({ queryKey: ["admin-dashboard-reports"], enabled, queryFn: async () => { const { data, error } = await supabase.from("content_reports").select("id,target_type,reason,status,created_at").order("created_at", { ascending: false }).limit(50); if (error) throw error; return (data ?? []) as AdminReport[]; } });
  return { users, videos, reports };
}

function AdminDashboard() {
  const { user, roles, loading } = useAuth();
  const staff = isStaff(roles);
  const isAdmin = roles.includes("admin");
  const [query, setQuery] = useState("");
  const [moderationTarget, setModerationTarget] = useState<{ item: AdminUser; status: ModerationAction } | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [moderationEndAt, setModerationEndAt] = useState("");
  const [savingModeration, setSavingModeration] = useState(false);
  const qc = useQueryClient();
  const { users, videos, reports } = useAdminData(staff && !loading);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Comprobando acceso…</div>;
  if (!user || !staff) throw notFound({ routeId: rootRouteId, throw: true });

  const term = query.trim().toLowerCase();
  const filteredUsers = (users.data ?? []).filter((item) => !term || item.username.toLowerCase().includes(term) || item.display_name.toLowerCase().includes(term));
  const stats = { users: users.data?.length ?? 0, videos: videos.data?.length ?? 0, pendingReports: (reports.data ?? []).filter((item) => item.status === "pending").length, banned: (users.data ?? []).filter((item) => item.is_banned).length };

  const refreshVideos = () => { void qc.invalidateQueries({ queryKey: ["admin-dashboard-videos"] }); void qc.invalidateQueries({ queryKey: ["admin-dashboard-reports"] }); };
  const toggleAdult = async (video: AdminVideo) => {
    if (!isAdmin) return toast.error("Solo los administradores pueden cambiar la restricción +18");
    try { await setVideoAgeRestriction({ data: { videoId: video.id, ageRestricted: !video.age_restricted } }); toast.success(video.age_restricted ? "Restricción +18 retirada" : "Video restringido para mayores de 18"); refreshVideos(); } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo actualizar la restricción"); }
  };
  const removeVideo = async (video: AdminVideo) => {
    if (!isAdmin) return toast.error("Solo los administradores pueden eliminar videos");
    if (!window.confirm(`¿Eliminar permanentemente “${video.title}”?`)) return;
    try { await deleteVideoAsAdmin({ data: { videoId: video.id } }); toast.success("Video eliminado"); refreshVideos(); } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo eliminar el video"); }
  };
  const moderateUser = async (
    item: AdminUser,
    status: "active" | ModerationAction,
    reason: string | null = null,
    suspendedUntil: string | null = null,
    bannedUntil: string | null = null,
  ) => {
    if (item.id === user.id) return toast.error("No puedes moderar tu propia cuenta");
    if (status === "active" && !window.confirm(`¿Quitar la restricción de @${item.username}?`)) return;
    try {
      const { data, error } = await untypedDb.rpc("moderate_account", {
        _user_id: item.id,
        _status: status,
        _reason: reason,
        _suspended_until: suspendedUntil,
        _banned_until: bannedUntil,
      });
      if (error) throw error;
      if (data === false) throw new Error("El usuario ya no existe o no se pudo encontrar");
      toast.success(status === "active" ? "Restricción retirada" : status === "warning" ? "Advertencia registrada" : status === "suspended" ? "Cuenta suspendida" : "Cuenta baneada");
      void qc.invalidateQueries({ queryKey: ["admin-dashboard-users"] });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la moderación");
      return false;
    }
  };

  const openModeration = (item: AdminUser, status: ModerationAction) => {
    setModerationReason("");
    setModerationEndAt("");
    setModerationTarget({ item, status });
  };

  const submitModeration = async () => {
    if (!moderationTarget) return;
    const { item, status } = moderationTarget;
    let suspendedUntil: string | null = null;
    let bannedUntil: string | null = null;
    if (status === "suspended" && !moderationEndAt) {
      return toast.error("Debes elegir la fecha y hora en que termina la suspensión");
    }
    if ((status === "suspended" || (status === "banned" && moderationEndAt)) && moderationEndAt) {
      const selected = new Date(moderationEndAt);
      if (Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
        return toast.error("La fecha de finalización debe ser futura");
      }
      if (status === "suspended") suspendedUntil = selected.toISOString();
      if (status === "banned") bannedUntil = selected.toISOString();
    }
    setSavingModeration(true);
    const saved = await moderateUser(item, status, moderationReason.trim() || null, suspendedUntil, bannedUntil);
    setSavingModeration(false);
    if (saved) setModerationTarget(null);
  };

  const changeRole = async (item: AdminUser, role: "admin" | "moderator" | "partner", enabled: boolean) => {
    if (!isAdmin) return toast.error("Solo los administradores pueden cambiar roles");
    if (item.id === user.id) return toast.error("No puedes cambiar tus propios roles");
    try {
      const { data, error } = await untypedDb.rpc("set_user_role", {
        _user_id: item.id,
        _role: role,
        _enabled: enabled,
      });
      if (error) throw error;
      if (data === false) throw new Error("No se pudo actualizar el rol");
      toast.success(enabled ? `Rol ${role} asignado` : `Rol ${role} retirado`);
      void qc.invalidateQueries({ queryKey: ["admin-dashboard-users"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el rol");
    }
  };

  return <AppShell><div className="cn-admin-page"><header className="cn-admin-header"><div><div className="cn-admin-kicker"><ShieldCheck size={16}/> Staff interno</div><h1>Dashboard de administración</h1><p>Moderación, usuarios y contenido en un solo espacio privado.</p></div><Badge variant={isAdmin ? "default" : "secondary"} className="rounded-full">{isAdmin ? "Administrador" : "Moderador"}</Badge></header>
    <section className="cn-admin-stats"><Stat icon={<Users size={17}/>} label="Usuarios" value={stats.users}/><Stat icon={<Video size={17}/>} label="Videos recientes" value={stats.videos}/><Stat icon={<Flag size={17}/>} label="Denuncias pendientes" value={stats.pendingReports}/><Stat icon={<BanIcon/>} label="Usuarios baneados" value={stats.banned}/></section>
    <Tabs defaultValue="overview" className="cn-admin-tabs"><TabsList className="cn-admin-tab-list flex w-full items-center justify-start gap-1">
      <TabsTrigger className="shrink-0" value="overview"><LayoutDashboard size={15} className="mr-1.5"/>Resumen</TabsTrigger>
      <TabsTrigger className="shrink-0" value="users"><Users size={15} className="mr-1.5"/>Usuarios</TabsTrigger>
      <TabsTrigger className="shrink-0" value="videos"><Video size={15} className="mr-1.5"/>Videos</TabsTrigger>
      {isAdmin && <TabsTrigger className="shrink-0" value="reports"><Flag size={15} className="mr-1.5"/>Denuncias</TabsTrigger>}
      <TabsTrigger className="shrink-0" value="blog"><FileText size={15} className="mr-1.5"/>Blog</TabsTrigger>
      <TabsTrigger className="shrink-0" value="campaigns"><Megaphone size={15} className="mr-1.5"/>Campañas</TabsTrigger>
      {isAdmin && <>
        <TabsTrigger className="shrink-0" value="banner"><Megaphone size={15} className="mr-1.5"/>Banner</TabsTrigger>
        <TabsTrigger className="shrink-0" value="maintenance"><Wrench size={15} className="mr-1.5"/>Mantenimiento</TabsTrigger>
        <TabsTrigger className="shrink-0" value="spotlight"><Sparkles size={15} className="mr-1.5"/>Spotlight</TabsTrigger>
        <TabsTrigger className="shrink-0" value="official"><Building2 size={15} className="mr-1.5"/>Cuenta Cornet</TabsTrigger>
      </>}
    </TabsList>
      <TabsContent value="overview" className="pt-5"><div className="grid gap-4 lg:grid-cols-2"><section className="cn-admin-card"><div className="cn-admin-card-title"><BarChart3 size={16}/> Estado del sistema</div><div className="cn-admin-list"><Row label="Usuarios cargados" value={String(stats.users)}/><Row label="Videos cargados" value={String(stats.videos)}/><Row label="Denuncias pendientes" value={String(stats.pendingReports)}/><Row label="Acceso staff" value="Protegido"/></div></section><section className="cn-admin-card"><div className="cn-admin-card-title"><AlertTriangle size={16}/> Panel unificado</div><p className="text-sm text-muted-foreground">Toda la administración de Cornet está reunida en esta página. Usa las secciones superiores para gestionar usuarios, contenido, publicaciones y configuración del sitio sin saltar entre paneles.</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">Un solo panel</Badge><Badge variant="outline">Acceso protegido</Badge><Badge variant="outline">{isAdmin ? "Herramientas de administrador" : "Herramientas de moderador"}</Badge></div></section></div></TabsContent>
      <TabsContent value="users" className="pt-5">
        <div className="cn-admin-card">
          <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-background px-4">
            <Search size={16} className="text-muted-foreground"/>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por usuario o nombre" className="border-0 bg-transparent focus-visible:ring-0"/>
          </div>
          <div className="space-y-2">
            {filteredUsers.map((item) => {
              const canModerateTarget = item.id !== user.id && (isAdmin || !item.roles.some((role) => role === "admin" || role === "moderator"));
              const restrictionEnd = item.moderation_status === "suspended"
                ? item.moderation_suspended_until
                : item.moderation_status === "banned" ? item.moderation_banned_until : null;
              return (
                <div key={item.id} className="cn-admin-user-row">
                  <ChannelAvatar path={item.avatar_path} name={item.display_name || item.username} size={40}/>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <strong className="truncate">{item.display_name || item.username}</strong>
                      {item.is_verified && <VerifiedBadge className="h-4 w-4"/>}
                      {item.moderation_status === "banned" && <Badge variant="destructive" className="text-[10px]">Baneado</Badge>}
                      {item.moderation_status === "suspended" && <Badge variant="secondary" className="text-[10px]">Suspendido</Badge>}
                      {item.moderation_status === "warning" && <Badge variant="outline" className="text-[10px]">Advertencia</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">@{item.username} · {timeAgo(item.created_at)} · {item.warnings_count} advertencias</p>
                    {item.moderation_status !== "active" && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {item.moderation_reason || "Sin motivo especificado"}
                        {restrictionEnd && ` · Hasta ${new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(new Date(restrictionEnd))}`}
                        {item.moderation_status === "banned" && !restrictionEnd && " · Permanente"}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {item.roles.map((role) => (
                        <span key={role} className="inline-flex items-center gap-0.5">
                          <Badge variant={role === "admin" ? "default" : "secondary"} className="text-[10px]">{role}</Badge>
                          {isAdmin && item.id !== user.id && role !== "user" && (
                            <Button type="button" size="icon" variant="ghost" className="h-5 w-5 rounded-full p-0 text-muted-foreground" aria-label={`Retirar rol ${role} de @${item.username}`} onClick={() => void changeRole(item, role as "admin" | "moderator" | "partner", false)}>×</Button>
                          )}
                        </span>
                      ))}
                      {isAdmin && item.id !== user.id && (
                        <select
                          aria-label={`Añadir rol a @${item.username}`}
                          value=""
                          onChange={(event) => {
                            const role = event.currentTarget.value as "admin" | "moderator" | "partner" | "";
                            if (role) void changeRole(item, role, true);
                          }}
                          className="h-7 rounded-full border border-input bg-background px-2 text-[11px] text-foreground"
                        >
                          <option value="">+ Añadir rol</option>
                          {(["admin", "moderator", "partner"] as const).filter((role) => !item.roles.includes(role)).map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  {canModerateTarget && (
                    <div className="flex max-w-[34rem] flex-wrap items-center justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs" onClick={() => openModeration(item, "warning")}>Advertir</Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs" onClick={() => openModeration(item, "suspended")}>Suspender</Button>
                      <Button size="sm" variant="destructive" className="h-8 rounded-full px-3 text-xs" onClick={() => openModeration(item, "banned")}>Banear</Button>
                      {item.moderation_status !== "active" && <Button size="sm" variant="ghost" className="h-8 rounded-full px-3 text-xs" onClick={() => void moderateUser(item, "active")}>Quitar restricción</Button>}
                    </div>
                  )}
                </div>
              );
            })}
            {!filteredUsers.length && <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados.</p>}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="videos" className="pt-5"><div className="cn-admin-card space-y-2">{(videos.data ?? []).map((video) => <div key={video.id} className="cn-admin-user-row"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Video size={17}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="block truncate">{video.title}</strong>{video.age_restricted && <Badge variant="destructive" className="text-[10px]">+18</Badge>}</div><p className="text-xs text-muted-foreground">{video.views ?? 0} vistas · {timeAgo(video.created_at)}</p></div><div className="flex shrink-0 flex-wrap gap-1.5">{isAdmin && <Button size="sm" variant="outline" className="rounded-full" onClick={() => void toggleAdult(video)}>{video.age_restricted ? <><XCircle className="mr-1.5 h-3.5 w-3.5"/>Quitar +18</> : <><UserX className="mr-1.5 h-3.5 w-3.5"/>Marcar +18</>}</Button>}{isAdmin && <Button size="sm" variant="destructive" className="rounded-full" onClick={() => void removeVideo(video)}><Trash2 className="mr-1.5 h-3.5 w-3.5"/>Eliminar</Button>}</div></div>)}{!videos.data?.length && <p className="py-10 text-center text-sm text-muted-foreground">No hay videos recientes.</p>}</div></TabsContent>
      {isAdmin && <TabsContent value="reports" className="pt-5"><AdminReports /></TabsContent>}
      <TabsContent value="blog" className="pt-5"><AdminBlogPage /></TabsContent>
      <TabsContent value="campaigns" className="pt-5"><AdminAdsPanel /></TabsContent>
      {isAdmin && <>
        <TabsContent value="banner" className="pt-5"><AdminBannersPage /></TabsContent>
        <TabsContent value="maintenance" className="pt-5"><AdminMaintenancePage /></TabsContent>
        <TabsContent value="spotlight" className="pt-5"><AdminSpotlightPanel /></TabsContent>
        <TabsContent value="official" className="pt-5"><AdminCornetPage /></TabsContent>
      </>}
    </Tabs></div>
    <Dialog open={Boolean(moderationTarget)} onOpenChange={(open) => { if (!open && !savingModeration) setModerationTarget(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{moderationTarget?.status === "warning" ? "Emitir advertencia" : moderationTarget?.status === "suspended" ? "Suspender cuenta" : "Banear cuenta"}</DialogTitle>
          <DialogDescription>
            {moderationTarget ? `Acción para @${moderationTarget.item.username}. El motivo es opcional y quedará guardado en el historial de moderación.` : "Configura la acción de moderación."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moderation-reason">Motivo (opcional)</Label>
            <Textarea id="moderation-reason" rows={3} maxLength={1000} value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} placeholder="Explica brevemente el motivo de la acción…"/>
          </div>
          {moderationTarget?.status === "suspended" && (
            <div className="space-y-2">
              <Label htmlFor="moderation-end">Fecha y hora de finalización <span className="text-destructive">*</span></Label>
              <Input id="moderation-end" type="datetime-local" value={moderationEndAt} onChange={(event) => setModerationEndAt(event.target.value)} required/>
              <p className="text-xs text-muted-foreground">Obligatoria. La cuenta podrá reactivarse después de esta fecha y hora.</p>
            </div>
          )}
          {moderationTarget?.status === "banned" && (
            <div className="space-y-2">
              <Label htmlFor="moderation-end">Fecha y hora de finalización (opcional)</Label>
              <Input id="moderation-end" type="datetime-local" value={moderationEndAt} onChange={(event) => setModerationEndAt(event.target.value)}/>
              <p className="text-xs text-muted-foreground">Déjala vacía para aplicar un baneo permanente.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={savingModeration} onClick={() => setModerationTarget(null)}>Cancelar</Button>
          <Button type="button" disabled={savingModeration || (moderationTarget?.status === "suspended" && !moderationEndAt)} onClick={() => void submitModeration()}>
            {savingModeration ? "Guardando…" : "Confirmar acción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppShell>;
}
function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="cn-admin-stat"><div className="cn-admin-stat-icon">{icon}</div><div><strong>{value}</strong><span>{label}</span></div></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0"><span className="text-sm text-muted-foreground">{label}</span><strong className="text-sm">{value}</strong></div>; }
function BanIcon() { return <span className="text-sm font-bold">×</span>; }
