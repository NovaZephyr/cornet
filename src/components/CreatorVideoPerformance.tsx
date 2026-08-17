import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function level(score: number) {
  if (score >= 85) return { label: "Excelente", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
  if (score >= 65) return { label: "Fuerte", className: "bg-primary/10 text-primary" };
  if (score >= 40) return { label: "En crecimiento", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  return { label: "Inicial", className: "bg-muted text-muted-foreground" };
}

export function CreatorVideoPerformance() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["creator-video-performance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: videos, error }, { data: profile, error: profileError }] = await Promise.all([
        supabase.from("videos").select("id,title,views,created_at,visibility,duration_seconds").eq("user_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("subscriber_count").eq("id", user!.id).maybeSingle(),
      ]);
      if (error) throw error;
      if (profileError) throw profileError;
      const rows = videos ?? [];
      const maxViews = Math.max(...rows.map((row) => Number(row.views ?? 0)), 1);
      const subscribers = Math.max(Number(profile?.subscriber_count ?? 0), 1);
      return rows.map((row) => {
        const viewScore = Math.min(60, (Number(row.views ?? 0) / maxViews) * 60);
        const audienceScore = Math.min(25, (Number(row.views ?? 0) / subscribers) * 5);
        const freshnessDays = Math.max(0, (Date.now() - new Date(row.created_at).getTime()) / 86_400_000);
        const freshness = Math.max(0, 15 - Math.min(15, freshnessDays * 0.3));
        const score = Math.max(0, Math.min(100, Math.round(viewScore + audienceScore + freshness)));
        return { ...row, score };
      });
    },
  });
  const filtered = useMemo(() => (query.data ?? []).filter((row) => !search.trim() || row.title.toLowerCase().includes(search.trim().toLowerCase())), [query.data, search]);
  return <section className="mt-5 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-4 w-4 text-primary" />Rendimiento por vídeo</h2><p className="mt-1 text-xs text-muted-foreground">Nivel orientativo basado en vistas, alcance frente a tus suscriptores y antigüedad.</p></div><div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar vídeo…" className="pl-9" /></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-2 py-2 font-medium">Vídeo</th><th className="px-2 py-2 font-medium">Vistas</th><th className="px-2 py-2 font-medium">Visibilidad</th><th className="px-2 py-2 font-medium">Nivel</th></tr></thead><tbody>{filtered.map((row) => { const info = level(row.score); return <tr key={row.id} className="border-b border-border/60 last:border-0"><td className="max-w-[360px] px-2 py-3"><p className="truncate font-medium">{row.title}</p><p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleDateString("es-ES")}</p></td><td className="px-2 py-3">{Number(row.views ?? 0).toLocaleString("es-ES")}</td><td className="px-2 py-3 capitalize text-muted-foreground">{row.visibility}</td><td className="px-2 py-3"><div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${row.score}%` }} /></div><Badge className={info.className}>{info.label} · {row.score}</Badge></div></td></tr>; })}</tbody></table>{!query.isLoading && !filtered.length && <p className="py-8 text-center text-sm text-muted-foreground">No hay vídeos que coincidan.</p>}</div></section>;
}
