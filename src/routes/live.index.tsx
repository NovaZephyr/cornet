import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar } from "@/components/Media";
import { fetchProfilesByIds } from "@/lib/queries";

export const Route = createFileRoute("/live/")({
  head: () => ({
    meta: [
      { title: "En vivo — CoreNetwork" },
      { name: "description", content: "Canales transmitiendo en vivo ahora mismo en CoreNetwork." },
    ],
  }),
  component: LivePage,
});

type LiveStream = { id: string; user_id: string; title: string; started_at: string | null };

function LivePage() {
  const { data: streams, isLoading } = useQuery({
    queryKey: ["live-streams"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select("id, user_id, title, started_at")
        .eq("status", "live")
        .order("started_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as LiveStream[];
      const profiles = await fetchProfilesByIds(rows.map((r) => r.user_id));
      return rows.map((r) => ({ ...r, author: profiles.get(r.user_id) ?? null }));
    },
  });

  return (
    <AppShell>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <Radio className="h-5 w-5 text-destructive" /> En vivo ahora
      </h1>

      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">Cargando…</p>
      ) : streams && streams.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {streams.map((s) => (
            <Link
              key={s.id}
              to="/live/$username"
              params={{ username: s.author?.username ?? "" }}
              className="group rounded-xl bg-surface p-3 transition-colors hover:bg-surface-hover"
            >
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" /> EN VIVO
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <ChannelAvatar path={s.author?.avatar_path} name={s.author?.display_name || "U"} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.title || "Transmisión en vivo"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.author?.display_name || s.author?.username}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
          <Radio className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">Nadie está en vivo ahora mismo</p>
          <p className="mt-1 text-sm text-muted-foreground">Vuelve más tarde, o sé tú el primero.</p>
        </div>
      )}
    </AppShell>
  );
}
