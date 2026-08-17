import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock3, History as HistoryIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { useAuth } from "@/hooks/useAuth";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/history")({ component: HistoryPage });

type HistoryRow = { id: string; watched_at: string; progress_seconds: number; completed: boolean; video: { id: string; code: string; title: string; thumbnail_path: string | null; duration_seconds: number; views: number; user_id: string } | null; channel: { username: string; display_name: string; avatar_path: string | null } | null };

function HistoryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const history = useQuery({
    queryKey: ["watch-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_watch_history").select("id,watched_at,progress_seconds,completed,video:videos(id,code,title,thumbnail_path,duration_seconds,views,user_id)").eq("user_id", user!.id).order("watched_at", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<HistoryRow & { video: HistoryRow["video"] }>;
      const ids = [...new Set(rows.map((row) => row.video?.user_id).filter(Boolean))] as string[];
      if (!ids.length) return rows.map((row) => ({ ...row, channel: null }));
      const { data: profiles, error: profileError } = await supabase.from("profiles").select("id,username,display_name,avatar_path").in("id", ids);
      if (profileError) throw profileError;
      const map = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      return rows.map((row) => ({ ...row, channel: row.video ? map.get(row.video.user_id) ?? null : null })) as HistoryRow[];
    },
  });
  const remove = async (id: string) => { const { error } = await supabase.from("user_watch_history").delete().eq("id", id).eq("user_id", user!.id); if (error) return void toast.error(error.message); void qc.invalidateQueries({ queryKey: ["watch-history", user!.id] }); };
  const clear = async () => { if (!window.confirm("¿Limpiar todo tu historial de reproducción?")) return; const { error } = await supabase.from("user_watch_history").delete().eq("user_id", user!.id); if (error) return void toast.error(error.message); void qc.invalidateQueries({ queryKey: ["watch-history", user!.id] }); toast.success("Historial limpiado"); };
  if (!user) return <AppShell><div className="py-24 text-center"><HistoryIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Inicia sesión para ver tu historial.</p></div></AppShell>;
  return <AppShell><div className="mx-auto w-full max-w-6xl space-y-5 pb-16"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><HistoryIcon className="h-6 w-6 text-primary" />Historial de reproducción</h1><p className="mt-1 text-sm text-muted-foreground">Aquí aparecen los videos que has visto recientemente.</p></div><Button variant="outline" className="rounded-full" disabled={!history.data?.length} onClick={() => void clear()}><Trash2 className="mr-2 h-4 w-4" />Limpiar historial</Button></div>{history.isLoading ? <div className="py-20 text-center text-muted-foreground">Cargando historial…</div> : !history.data?.length ? <div className="rounded-3xl border border-dashed border-border p-16 text-center"><Clock3 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" /><h2 className="text-lg font-semibold">Todavía no has visto nada aquí</h2><p className="mt-2 text-sm text-muted-foreground">Cuando reproduzcas un video aparecerá en este apartado.</p></div> : <div className="space-y-2">{history.data.map((row) => row.video && <article key={row.id} className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-3 transition hover:bg-surface-hover sm:flex-row"><Link to="/watch" search={{ v: row.video.code }} className="relative block w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-56"><SignedImage path={row.video.thumbnail_path} alt={row.video.title} className="aspect-video w-full object-cover" /><span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] text-white">{formatDuration(row.video.duration_seconds)}</span>{row.progress_seconds > 0 && <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40"><span className="block h-full bg-primary" style={{ width: `${Math.min(100, row.progress_seconds / Math.max(row.video.duration_seconds, 1) * 100)}%` }} /></span>}</Link><div className="min-w-0 flex-1"><Link to="/watch" search={{ v: row.video.code }} className="line-clamp-2 text-base font-semibold hover:underline">{row.video.title}</Link><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><ChannelAvatar path={row.channel?.avatar_path} name={row.channel?.display_name || row.channel?.username || "Canal"} size={24} /><Link to="/c/$username" params={{ username: row.channel?.username || "" }} className="hover:text-foreground">{row.channel?.display_name || row.channel?.username || "Canal"}</Link><span>·</span><span>{formatViews(row.video.views)} vistas</span></div><p className="mt-2 text-xs text-muted-foreground">Visto {timeAgo(row.watched_at)}{row.completed ? " · Completado" : ""}</p></div><Button variant="ghost" size="icon" className="self-start opacity-70 transition group-hover:opacity-100" aria-label="Quitar del historial" onClick={() => void remove(row.id)}><Trash2 className="h-4 w-4" /></Button></article>)}</div>}</div></AppShell>;
}
