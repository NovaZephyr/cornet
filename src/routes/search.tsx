import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound, Video } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfilesByIds, fetchVideos } from "@/lib/queries";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q.trim() : "" }),
  head: () => ({ meta: [{ title: "Buscar — Cornet" }, { name: "description", content: "Busca videos y canales de Cornet." }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const result = useQuery({
    queryKey: ["search", q],
    enabled: q.length >= 2,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
      const [videoResult, channelResult] = await Promise.all([
        supabase.from("videos").select("id,code,user_id,title,description,video_path,thumbnail_path,views,created_at,category,duration_seconds,visibility").eq("visibility", "public").or(`title.ilike.${pattern},description.ilike.${pattern}`).order("created_at", { ascending: false }).limit(48),
        supabase.from("profiles").select("id,username,display_name,avatar_path,subscriber_count,is_verified,description").or(`username.ilike.${pattern},display_name.ilike.${pattern},description.ilike.${pattern}`).limit(24),
      ]);
      if (videoResult.error) throw videoResult.error;
      if (channelResult.error) throw channelResult.error;
      const profiles = await fetchProfilesByIds((videoResult.data ?? []).map((video) => video.user_id));
      return {
        videos: (videoResult.data ?? []).map((video) => ({ ...video, profiles: profiles.get(video.user_id) ?? null })) as Awaited<ReturnType<typeof fetchVideos>>,
        channels: channelResult.data ?? [],
      };
    },
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    if (typeof value === "string" && value.trim()) window.location.href = `/search?q=${encodeURIComponent(value.trim())}`;
  };

  return <AppShell>
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={q} placeholder="Buscar videos, canales o palabras…" className="pl-9" autoFocus /></div>
        <Button type="submit">Buscar</Button>
      </form>

      {q.length < 2 ? <div className="rounded-2xl border border-dashed border-border py-20 text-center text-muted-foreground">Escribe al menos 2 caracteres para buscar.</div> : result.isLoading ? <div className="py-20 text-center text-muted-foreground">Buscando “{q}”…</div> : <>
        <section><div className="mb-3 flex items-center gap-2"><UserRound className="h-4 w-4" /><h2 className="text-lg font-semibold">Canales</h2></div>{result.data?.channels.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{result.data.channels.map((channel) => <Link key={channel.id} to="/c/$username" params={{ username: channel.username }} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:bg-surface-hover"><ChannelAvatar path={channel.avatar_path} name={channel.display_name || channel.username} size={48} /><div className="min-w-0"><div className="flex items-center gap-1"><p className="truncate font-medium">{channel.display_name || channel.username}</p>{channel.is_verified && <span className="text-xs text-primary">✓</span>}</div><p className="text-xs text-muted-foreground">@{channel.username} · {channel.subscriber_count ?? 0} suscriptores</p></div></Link>)}</div> : <p className="text-sm text-muted-foreground">No encontramos canales.</p>}</section>
        <section><div className="mb-3 flex items-center gap-2"><Video className="h-4 w-4" /><h2 className="text-lg font-semibold">Videos</h2></div>{result.data?.videos.length ? <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{result.data.videos.map((video) => <VideoCard key={video.id} video={video} />)}</div> : <p className="text-sm text-muted-foreground">No encontramos videos.</p>}</section>
      </>}
    </div>
  </AppShell>;
}
