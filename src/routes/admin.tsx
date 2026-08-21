import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, FileText, Flag, LayoutDashboard, Megaphone, Search, ShieldCheck, Trash2, UserX, Users, Video, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AdminAdsPanel } from "@/components/AdminAdsPanel";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type AdminUser = Pick<Profile, "id" | "username" | "display_name" | "avatar_path" | "is_verified" | "is_banned" | "warnings_count" | "created_at"> & { roles: AppRole[] };
type AdminVideo = { id: string; title: string; user_id: string; views: number | null; created_at: string; age_restricted: boolean };
type AdminReport = { id: string; target_type: "video" | "channel"; reason: string; status: string; created_at: string };
function isStaff(roles: AppRole[]) { return roles.includes("admin") || roles.includes("moderator"); }

function useAdminData(enabled: boolean) {
  const users = useQuery({ queryKey: ["admin-dashboard-users"], enabled, queryFn: async () => { const { data, error } = await supabase.from("profiles").select("id,username,display_name,avatar_path,is_verified,is_banned,warnings_count,created_at").order("created_at", { ascending: false }).limit(100); if (error) throw error; const rows = (data ?? []) as AdminUser[]; if (!rows.length) return rows; const { data: roles, error: roleError } = await supabase.from("user_roles").select("user_id,role").in("user_id", rows.map((r) => r.id)); if (roleError) throw roleError; const byUser = new Map<string, AppRole[]>(); for (const row of roles ?? []) { const bucket = byUser.get(row.user_id) ?? []; bucket.push(row.role as AppRole); byUser.set(row.user_id, bucket); } return rows.map((row) => ({ ...row, roles: byUser.get(row.id) ?? ["user"] })); } });
  const videos = useQuery({ queryKey: ["admin-dashboard-videos"], enabled, queryFn: async () => { const { data, error } = await supabase.from("videos").select("id,title,user_id,views,created_at,age_restricted").order("created_at", { ascending: false }).limit(100); if (error) throw error; return (data ?? []) as AdminVideo[]; } });
  const reports = useQuery({ queryKey: ["admin-dashboard-reports"], enabled, queryFn: async () => { const { data, error } = await supabase.from("content_reports").select("id,target_type,reason,status,created_at").order("created_at", { ascending: false }).limit(50); if (error) throw error; return (data ?? []) as AdminReport[]; } });
  return { users, videos, reports };
}

function AdminDashboard() {
  const { user, roles, loading } = useAuth();
  const staff = isStaff(roles);
  const isAdmin = roles.includes("admin");
  const [query, setQuery] = useState("");
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

  return <AppShell><div className="cn-admin-page"><header className="cn-admin-header"><div><div className="cn-admin-kicker"><ShieldCheck size={16}/> Staff interno</div><h1>Dashboard de administración</h1><p>Moderación, usuarios y contenido en un solo espacio privado.</p></div><Badge variant={isAdmin ? "default" : "secondary"} className="rounded-full">{isAdmin ? "Administrador" : "Moderador"}</Badge></header>
    <section className="cn-admin-stats"><Stat icon={<Users size={17}/>} label="Usuarios" value={stats.users}/><Stat icon={<Video size={17}/>} label="Videos recientes" value={stats.videos}/><Stat icon={<Flag size={17}/>} label="Denuncias pendientes" value={stats.pendingReports}/><Stat icon={<BanIcon/>} label="Usuarios baneados" value={stats.banned}/></section>
    <Tabs defaultValue="overview" className="cn-admin-tabs"><TabsList className="flex w-full flex-wrap justify-start gap-1"><TabsTrigger value="overview"><LayoutDashboard size={15} className="mr-1.5"/>Resumen</TabsTrigger><TabsTrigger value="users"><Users size={15} className="mr-1.5"/>Usuarios</TabsTrigger><TabsTrigger value="videos"><Video size={15} className="mr-1.5"/>Videos</TabsTrigger><TabsTrigger value="reports"><Flag size={15} className="mr-1.5"/>Denuncias</TabsTrigger><TabsTrigger value="blog"><FileText size={15} className="mr-1.5"/>Blog</TabsTrigger><TabsTrigger value="ads"><Megaphone size={15} className="mr-1.5"/>Campañas</TabsTrigger></TabsList>
      <TabsContent value="overview" className="pt-5"><div className="grid gap-4 lg:grid-cols-2"><section className="cn-admin-card"><div className="cn-admin-card-title"><BarChart3 size={16}/> Estado del sistema</div><div className="cn-admin-list"><Row label="Usuarios cargados" value={String(stats.users)}/><Row label="Videos cargados" value={String(stats.videos)}/><Row label="Denuncias pendientes" value={String(stats.pendingReports)}/><Row label="Acceso staff" value="Protegido"/></div></section><section className="cn-admin-card"><div className="cn-admin-card-title"><AlertTriangle size={16}/> Acciones</div><div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="rounded-full"><a href="/admin-cornet">Cuenta oficial de Cornet</a></Button><Button asChild variant="outline" className="rounded-full"><a href="/admin-banners">Banner oficial</a></Button><Button asChild variant="outline" className="rounded-full"><a href="/admin-blog">Blog / Anuncios</a></Button></div></section></div></TabsContent>
      <TabsContent value="users" className="pt-5"><div className="cn-admin-card"><div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-background px-4"><Search size={16} className="text-muted-foreground"/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por usuario o nombre" className="border-0 bg-transparent focus-visible:ring-0"/></div><div className="space-y-2">{filteredUsers.map((item) => <div key={item.id} className="cn-admin-user-row"><ChannelAvatar path={item.avatar_path} name={item.display_name || item.username} size={40}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><strong className="truncate">{item.display_name || item.username}</strong>{item.is_verified && <VerifiedBadge className="h-4 w-4"/>}{item.is_banned && <Badge variant="destructive" className="text-[10px]">Baneado</Badge>}</div><p className="text-xs text-muted-foreground">@{item.username} · {timeAgo(item.created_at)}</p></div><div className="flex flex-wrap gap-1">{item.roles.map((role) => <Badge key={role} variant={role === "admin" ? "default" : "secondary"} className="text-[10px]">{role}</Badge>)}</div></div>)}{!filteredUsers.length && <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados.</p>}</div></div></TabsContent>
      <TabsContent value="videos" className="pt-5"><div className="cn-admin-card space-y-2">{(videos.data ?? []).map((video) => <div key={video.id} className="cn-admin-user-row"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Video size={17}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="block truncate">{video.title}</strong>{video.age_restricted && <Badge variant="destructive" className="text-[10px]">+18</Badge>}</div><p className="text-xs text-muted-foreground">{video.views ?? 0} vistas · {timeAgo(video.created_at)}</p></div><div className="flex shrink-0 flex-wrap gap-1.5">{isAdmin && <Button size="sm" variant="outline" className="rounded-full" onClick={() => void toggleAdult(video)}>{video.age_restricted ? <><XCircle className="mr-1.5 h-3.5 w-3.5"/>Quitar +18</> : <><UserX className="mr-1.5 h-3.5 w-3.5"/>Marcar +18</>}</Button>}{isAdmin && <Button size="sm" variant="destructive" className="rounded-full" onClick={() => void removeVideo(video)}><Trash2 className="mr-1.5 h-3.5 w-3.5"/>Eliminar</Button>}</div></div>)}{!videos.data?.length && <p className="py-10 text-center text-sm text-muted-foreground">No hay videos recientes.</p>}</div></TabsContent>
      <TabsContent value="reports" className="pt-5"><div className="cn-admin-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="cn-admin-card-title"><Flag size={16}/> Gestión de denuncias</div><p className="mt-2 text-sm text-muted-foreground">Revisa, descarta o ejecuta acciones sobre denuncias de videos y canales.</p></div><Button asChild className="rounded-full"><a href="/admin/reports">Abrir gestor de denuncias</a></Button></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><Row label="Pendientes" value={String(stats.pendingReports)}/><Row label="Total cargadas" value={String(reports.data?.length ?? 0)}/><Row label="Acceso" value={isAdmin ? "Admin" : "Solo lectura"}/></div></div></TabsContent>
      <TabsContent value="blog" className="pt-5"><div className="cn-admin-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="cn-admin-card-title"><FileText size={16}/> Blog / Anuncios</div><p className="mt-2 text-sm text-muted-foreground">Publicaciones editoriales de Cornet: texto, imagen y encuestas.</p></div><Button asChild><a href="/admin-blog">Abrir editor</a></Button></div></div></TabsContent>
      <TabsContent value="ads" className="pt-5"><AdminAdsPanel /></TabsContent></Tabs></div></AppShell>;
}
function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="cn-admin-stat"><div className="cn-admin-stat-icon">{icon}</div><div><strong>{value}</strong><span>{label}</span></div></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0"><span className="text-sm text-muted-foreground">{label}</span><strong className="text-sm">{value}</strong></div>; }
function BanIcon() { return <span className="text-sm font-bold">×</span>; }
