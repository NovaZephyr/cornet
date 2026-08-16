import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { VideoCard } from "@/components/VideoCard";
import { supabase } from "@/integrations/supabase/client";
import { fetchVideos } from "@/lib/queries";

export const Route = createFileRoute("/hashtag/$tag")({ component: HashtagPage });

function HashtagPage() {
  const { tag } = Route.useParams();
  const normalized = tag.normalize("NFKC").trim().toLowerCase();
  const { data, isLoading } = useQuery({
    queryKey: ["hashtag", normalized],
    queryFn: async () => {
      const { data: hashtag, error: hashtagError } = await supabase.from("hashtags").select("id, name, normalized_name").eq("normalized_name", normalized).maybeSingle();
      if (hashtagError) throw hashtagError;
      if (!hashtag) return { hashtag: normalized, videos: [] };
      const { data: links, error: linkError } = await supabase.from("video_hashtags").select("video_id").eq("hashtag_id", hashtag.id);
      if (linkError) throw linkError;
      const ids = (links ?? []).map((row) => row.video_id);
      if (!ids.length) return { hashtag: hashtag.name, videos: [] };
      const all = await fetchVideos({ limit: 200 });
      const idSet = new Set(ids);
      return { hashtag: hashtag.name, videos: all.filter((video) => idSet.has(video.id)) };
    },
  });

  return <AppShell><div className="mx-auto max-w-6xl py-8"><Link to="/explore" className="text-sm text-muted-foreground hover:underline">Volver a Explorar</Link><h1 className="mt-4 text-2xl font-bold">#{data?.hashtag ?? normalized}</h1>{isLoading ? <p className="py-16 text-center text-muted-foreground">Cargando…</p> : data?.videos.length ? <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{data.videos.map((video) => <VideoCard key={video.id} video={video} />)}</div> : <div className="mt-6 rounded-xl border border-border bg-surface p-8 text-center text-muted-foreground">No hay videos con este hashtag.</div>}</div></AppShell>;
}
