import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useSignedUrl } from "@/lib/storage";
import { fetchProfilesByIds, fetchVideos, type ProfileLite } from "@/lib/queries";
import { formatViews, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/watch/$videoId")({
  head: () => ({
    meta: [
      { title: "Reproduciendo un video — TocinoTube" },
      { name: "description", content: "Mira videos, comenta y suscríbete a tus canales favoritos." },
      { property: "og:title", content: "Reproduciendo un video — TocinoTube" },
      { property: "og:description", content: "Mira videos y únete a la conversación en TocinoTube." },
    ],
  }),
  component: Watch,
});

type VideoRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  video_path: string;
  views: number;
  created_at: string;
};

function Watch() {
  const { videoId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data } = useQuery({
    queryKey: ["video", videoId],
    queryFn: async () => {
      const { data: video, error } = await supabase
        .from("videos")
        .select("id, user_id, title, description, video_path, views, created_at")
        .eq("id", videoId)
        .maybeSingle();
      if (error) throw error;
      if (!video) return null;
      const profiles = await fetchProfilesByIds([(video as VideoRow).user_id]);
      return {
        video: video as VideoRow,
        channel: profiles.get((video as VideoRow).user_id) ?? null,
      };
    },
  });

  const videoUrl = useSignedUrl(data?.video.video_path);

  const { data: likes } = useQuery({
    queryKey: ["likes", videoId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("video_likes")
        .select("user_id, is_like")
        .eq("video_id", videoId);
      return (rows ?? []) as { user_id: string; is_like: boolean }[];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", videoId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("comments")
        .select("id, user_id, content, created_at")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false });
      const list = (rows ?? []) as { id: string; user_id: string; content: string; created_at: string }[];
      const profiles = await fetchProfilesByIds(list.map((c) => c.user_id));
      return list.map((c) => ({ ...c, author: profiles.get(c.user_id) ?? null }));
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["subs", data?.video.user_id],
    enabled: !!data?.video.user_id,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("subscriptions")
        .select("subscriber_id")
        .eq("channel_id", data!.video.user_id);
      return (rows ?? []) as { subscriber_id: string }[];
    },
  });

  const { data: suggestions } = useQuery({
    queryKey: ["suggestions"],
    queryFn: () => fetchVideos(),
  });

  useEffect(() => {
    void supabase.rpc("increment_views", { _video_id: videoId });
  }, [videoId]);

  if (data === null) {
    return (
      <AppShell>
        <p className="py-24 text-center text-muted-foreground">Este video no existe.</p>
      </AppShell>
    );
  }

  const channel: ProfileLite | null = data?.channel ?? null;
  const likeCount = likes?.filter((l) => l.is_like).length ?? 0;
  const dislikeCount = likes?.filter((l) => !l.is_like).length ?? 0;
  const myLike = likes?.find((l) => l.user_id === user?.id);
  const isSubscribed = !!subs?.some((s) => s.subscriber_id === user?.id);

  const react = async (isLike: boolean) => {
    if (!user) {
      toast.error("Inicia sesión para reaccionar");
      return;
    }
    if (myLike && myLike.is_like === isLike) {
      await supabase.from("video_likes").delete().eq("video_id", videoId).eq("user_id", user.id);
    } else {
      await supabase
        .from("video_likes")
        .upsert({ video_id: videoId, user_id: user.id, is_like: isLike });
    }
    void qc.invalidateQueries({ queryKey: ["likes", videoId] });
  };

  const toggleSub = async () => {
    if (!user || !data) {
      toast.error("Inicia sesión para suscribirte");
      return;
    }
    if (isSubscribed) {
      await supabase
        .from("subscriptions")
        .delete()
        .eq("subscriber_id", user.id)
        .eq("channel_id", data.video.user_id);
    } else {
      await supabase
        .from("subscriptions")
        .insert({ subscriber_id: user.id, channel_id: data.video.user_id });
    }
    void qc.invalidateQueries({ queryKey: ["subs", data.video.user_id] });
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Inicia sesión para comentar");
      return;
    }
    if (!comment.trim()) return;
    const { error } = await supabase
      .from("comments")
      .insert({ video_id: videoId, user_id: user.id, content: comment.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    setComment("");
    void qc.invalidateQueries({ queryKey: ["comments", videoId] });
  };

  return (
    <AppShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            {videoUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={videoUrl} controls autoPlay className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Cargando video…
              </div>
            )}
          </div>

          <h1 className="mt-4 text-xl font-semibold">{data?.video.title ?? ""}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              to="/c/$username"
              params={{ username: channel?.username ?? "" }}
              className="flex items-center gap-3"
            >
              <ChannelAvatar path={channel?.avatar_path} name={channel?.display_name ?? "C"} />
              <span>
                <span className="flex items-center gap-1 text-sm font-medium">
                  {channel?.display_name || channel?.username}
                  {channel?.is_verified && <VerifiedBadge />}
                </span>
                <span className="text-xs text-muted-foreground">
                  {subs?.length ?? 0} suscriptores
                </span>
              </span>
            </Link>

            <Button
              onClick={() => void toggleSub()}
              variant={isSubscribed ? "secondary" : "default"}
              className="rounded-full"
            >
              {isSubscribed ? "Suscrito" : "Suscribirse"}
            </Button>

            <div className="ml-auto flex items-center overflow-hidden rounded-full bg-surface">
              <button
                onClick={() => void react(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-hover"
              >
                <ThumbsUp
                  className={`h-4 w-4 ${myLike?.is_like ? "fill-foreground" : ""}`}
                />
                {likeCount}
              </button>
              <span className="h-6 w-px bg-border" />
              <button
                onClick={() => void react(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-hover"
              >
                <ThumbsDown
                  className={`h-4 w-4 ${myLike && !myLike.is_like ? "fill-foreground" : ""}`}
                />
                {dislikeCount}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
            <p className="font-medium">
              {formatViews(data?.video.views ?? 0)} vistas ·{" "}
              {data ? timeAgo(data.video.created_at) : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {data?.video.description || "Sin descripción."}
            </p>
          </div>

          <section className="mt-6">
            <h2 className="mb-4 text-lg font-semibold">{comments?.length ?? 0} comentarios</h2>
            <form onSubmit={postComment} className="mb-6 flex gap-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Añade un comentario…"
                rows={2}
                className="flex-1"
              />
              <Button type="submit">Comentar</Button>
            </form>

            <div className="space-y-4">
              {comments?.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <ChannelAvatar
                    path={c.author?.avatar_path}
                    name={c.author?.display_name ?? "U"}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {c.author?.display_name || c.author?.username || "Usuario"}
                      </span>
                      {c.author?.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                      <span>{timeAgo(c.created_at)}</span>
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{c.content}</p>
                  </div>
                  {user?.id === c.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await supabase.from("comments").delete().eq("id", c.id);
                        void qc.invalidateQueries({ queryKey: ["comments", videoId] });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="w-full shrink-0 space-y-3 lg:w-96">
          <h2 className="text-sm font-semibold text-muted-foreground">Siguiente</h2>
          {suggestions
            ?.filter((v) => v.id !== videoId)
            .slice(0, 12)
            .map((v) => (
              <VideoCard key={v.id} video={v} compact />
            ))}
        </aside>
      </div>
    </AppShell>
  );
}
