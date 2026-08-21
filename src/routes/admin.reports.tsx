import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Flag, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar } from "@/components/Media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { deleteUserAccount, deleteVideoAsAdmin } from "@/lib/admin.functions";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({ component: AdminReports });

type Report = { id: string; reporter_id: string; target_type: "video" | "channel"; video_id: string | null; channel_id: string | null; reason: string; details: string; status: string; created_at: string };
type Profile = { id: string; username: string; display_name: string; avatar_path: string | null };
type Video = { id: string; title: string };
const labels: Record<string, string> = { inappropriate: "Contenido inapropiado", spam_abuse: "Spam o abusos", under_13: "Usuario menor de 13 años", violent_shocking: "Contenido violento o shockante", hate_speech: "Discurso de odio", other: "Otro" };

function AdminReports() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const { data: reports, isLoading, error: reportsError } = useQuery({ queryKey: ["admin-reports"], enabled: isAdmin, queryFn: async () => { const { data, error } = await supabase.from("content_reports").select("*").order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as Report[]; } });
  const { data: profiles } = useQuery({ queryKey: ["admin-report-profiles"], enabled: isAdmin, queryFn: async () => { const { data, error } = await supabase.from("profiles").select("id, username, display_name, avatar_path"); if (error) throw error; return (data ?? []) as Profile[]; } });
  const { data: videos } = useQuery({ queryKey: ["admin-report-videos"], enabled: isAdmin, queryFn: async () => { const { data, error } = await supabase.from("videos").select("id, title"); if (error) throw error; return (data ?? []) as Video[]; } });

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel("admin-content-reports").on("postgres_changes", { event: "INSERT", schema: "public", table: "content_reports" }, () => { void qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.info("Nueva denuncia recibida", { icon: <Bell className="h-4 w-4" /> }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [isAdmin, qc]);

  const resolve = async (report: Report, status: "reviewed" | "dismissed") => { const { data: auth } = await supabase.auth.getUser(); const { error } = await supabase.from("content_reports").update({ status, reviewed_by: auth.user?.id ?? null, reviewed_at: new Date().toISOString() }).eq("id", report.id); if (error) return void toast.error(error.message); toast.success(status === "dismissed" ? "Denuncia descartada" : "Denuncia marcada como revisada"); void qc.invalidateQueries({ queryKey: ["admin-reports"] }); };
  const deleteTarget = async (report: Report) => {
    if (report.target_type === "video" && report.video_id) {
      if (!window.confirm("¿Eliminar este video?")) return;
      try { await deleteVideoAsAdmin({ data: { videoId: report.video_id } }); } catch (error) { return void toast.error(error instanceof Error ? error.message : "No se pudo eliminar el video"); }
    } else if (report.target_type === "channel" && report.channel_id) {
      if (!window.confirm("¿Eliminar permanentemente este canal y su cuenta?")) return;
      try { await deleteUserAccount({ data: { userId: report.channel_id } }); } catch (error) { return void toast.error(error instanceof Error ? error.message : "No se pudo eliminar el canal"); }
    }
    const { data: auth } = await supabase.auth.getUser(); await supabase.from("content_reports").update({ status: "actioned", reviewed_by: auth.user?.id ?? null, reviewed_at: new Date().toISOString() }).eq("id", report.id); toast.success(report.target_type === "video" ? "Video eliminado" : "Canal eliminado"); void qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  if (loading) return <AppShell><p className="py-24 text-center text-muted-foreground">Cargando…</p></AppShell>;
  if (!isAdmin) return <AppShell><p className="py-24 text-center text-muted-foreground">Esta zona es solo para administradores.</p></AppShell>;
  if (reportsError) return <AppShell><p className="py-24 text-center text-destructive">No se pudieron cargar las denuncias: {reportsError.message}</p></AppShell>;
  const pending = reports?.filter((r) => r.status === "pending") ?? [];

  return <AppShell><div className="mx-auto max-w-5xl"><div className="mb-6 flex items-center justify-between"><h1 className="flex items-center gap-2 text-2xl font-bold"><Flag className="h-6 w-6 text-primary" /> Denuncias</h1><Badge variant={pending.length ? "default" : "secondary"}>{pending.length} pendientes</Badge></div><div className="space-y-3">{isLoading ? <p className="py-12 text-center text-muted-foreground">Cargando denuncias…</p> : reports?.map((r) => { const target = r.target_type === "video" ? videos?.find((v) => v.id === r.video_id) : profiles?.find((p) => p.id === r.channel_id); const reporter = profiles?.find((p) => p.id === r.reporter_id); return <div key={r.id} className="rounded-xl bg-surface p-4"><div className="flex items-start gap-3"><ChannelAvatar path={reporter?.avatar_path} name={reporter?.display_name || reporter?.username || "U"} size={40}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{r.target_type === "video" ? "Video" : "Canal"}: {target && ("title" in target ? target.title : target.display_name || target.username)}</p><Badge variant={r.status === "pending" ? "default" : "secondary"}>{r.status}</Badge></div><p className="text-xs text-muted-foreground">Denunciado por {reporter?.display_name || reporter?.username || "Usuario"} · {timeAgo(r.created_at)}</p><p className="mt-3 text-sm font-medium">{labels[r.reason] ?? r.reason}</p>{r.details && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.details}</p>}</div></div>{r.status === "pending" && <div className="mt-4 flex flex-wrap gap-2 border-t pt-3"><Button size="sm" variant="destructive" className="rounded-full" onClick={() => void deleteTarget(r)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Eliminar {r.target_type === "video" ? "video" : "canal"}</Button>{r.target_type === "channel" && <Button size="sm" variant="outline" className="rounded-full" onClick={async () => { if (!r.channel_id) return; const { error } = await supabase.from("profiles").update({ is_banned: true }).eq("id", r.channel_id); if (error) return void toast.error(error.message); await resolve(r, "reviewed"); toast.success("Canal baneado"); }}><UserX className="mr-1.5 h-3.5 w-3.5" />Banear canal</Button>}<Button size="sm" variant="outline" className="rounded-full" onClick={() => void resolve(r, "reviewed")}>Marcar revisada</Button><Button size="sm" variant="ghost" className="rounded-full" onClick={() => void resolve(r, "dismissed")}>Descartar</Button></div>}</div>; })}{!isLoading && !reports?.length && <p className="py-12 text-center text-muted-foreground">No hay denuncias.</p>}</div></div></AppShell>;
}
