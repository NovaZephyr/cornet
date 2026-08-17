import { useMemo } from "react";
import { BarChart3, Eye, Layers3, Star, UsersRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function CreatorDashboardSummary() {
  const { user } = useAuth();
  const videos = useQuery({
    queryKey: ["creator-dashboard-videos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("videos").select("id,title,views,created_at,visibility").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const profile = useQuery({
    queryKey: ["creator-dashboard-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("subscriber_count").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const stats = useMemo(() => {
    const rows = videos.data ?? [];
    const totalViews = rows.reduce((sum, row) => sum + Number(row.views ?? 0), 0);
    const average = rows.length ? totalViews / rows.length : 0;
    const best = rows.reduce((bestRow, row) => !bestRow || Number(row.views ?? 0) > Number(bestRow.views ?? 0) ? row : bestRow, null as typeof rows[number] | null);
    return { totalViews, average, best };
  }, [videos.data]);
  if (!user) return null;
  const performance = stats.totalViews === 0 ? 0 : Math.round(Math.min(100, stats.average / Math.max(Number(profile.data?.subscriber_count ?? 1), 1) * 100));
  return <section className="mb-5 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl bg-background/70 p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Layers3 className="h-4 w-4" />Videos</div><p className="mt-2 text-2xl font-bold">{videos.data?.length ?? 0}</p></div><div className="rounded-2xl bg-background/70 p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Eye className="h-4 w-4" />Vistas totales</div><p className="mt-2 text-2xl font-bold">{stats.totalViews.toLocaleString("es-ES")}</p></div><div className="rounded-2xl bg-background/70 p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><UsersRound className="h-4 w-4" />Suscriptores</div><p className="mt-2 text-2xl font-bold">{Number(profile.data?.subscriber_count ?? 0).toLocaleString("es-ES")}</p></div><div className="rounded-2xl bg-background/70 p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Star className="h-4 w-4" />Rendimiento medio</div><div className="mt-2 flex items-center gap-3"><p className="text-2xl font-bold">{performance}/100</p><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${performance}%` }} /></div></div></div></div><div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="h-4 w-4" />{stats.best ? <>Mejor video: <strong className="text-foreground">{stats.best.title}</strong></> : <>Publica tu primer video para empezar a medir rendimiento.</>}<Link to="/upload" className="ml-auto font-medium text-primary hover:underline">Abrir dashboard</Link></div></section>;
}
