import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { VideoCard, type VideoWithChannel } from "@/components/VideoCard";
import { supabase } from "@/integrations/supabase/client";

export type HomeSpotlight = {
  channel_id: string;
  custom_text: string;
  channel: {
    username: string;
    display_name: string;
    description: string | null;
    avatar_path: string | null;
    is_verified: boolean;
    subscriber_count: number | null;
  } | null;
  videos: VideoWithChannel[];
};

export function useYouTube2009Spotlight() {
  return useQuery({
    queryKey: ["youtube-2009-spotlight"],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async (): Promise<HomeSpotlight | null> => {
      const db = supabase as any;
      const { data: config, error: configError } = await db
        .from("home_spotlight")
        .select("channel_id,custom_text,profiles(username,display_name,description,avatar_path,is_verified,subscriber_count)")
        .eq("id", true)
        .eq("enabled", true)
        .maybeSingle();
      if (configError) throw configError;
      if (!config) return null;

      const { data: videos, error: videosError } = await db
        .from("videos")
        .select("id,code,title,description,category,thumbnail_path,video_path,duration_seconds,views,created_at,user_id,profiles(username,display_name,avatar_path,is_verified,subscriber_count)")
        .eq("user_id", config.channel_id)
        .eq("visibility", "public")
        .order("views", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(4);
      if (videosError) throw videosError;

      return {
        channel_id: config.channel_id,
        custom_text: config.custom_text ?? "",
        channel: config.profiles ?? null,
        videos: (videos ?? []) as VideoWithChannel[],
      };
    },
  });
}

export function YouTube2009Spotlight({ spotlight }: { spotlight: HomeSpotlight }) {
  const channel = spotlight.channel;
  if (!channel) return null;

  return (
    <section className="cn-yt2009-spotlight" aria-labelledby="yt2009-spotlight-title">
      <div className="cn-yt2009-spotlight-heading">
        <h2 id="yt2009-spotlight-title">Spotlight</h2>
        <span>Featured Channel</span>
      </div>
      <div className="cn-yt2009-spotlight-body">
        <aside className="cn-yt2009-spotlight-channel">
          <Link to="/c/$username" params={{ username: channel.username }} className="cn-yt2009-spotlight-channel-name">
            <ChannelAvatar path={channel.avatar_path} name={channel.display_name || channel.username} size={64} />
            <span>
              <strong>{channel.display_name || channel.username}</strong>
              {channel.is_verified && <VerifiedBadge className="ml-1 inline h-3.5 w-3.5" />}
              <small>@{channel.username}</small>
            </span>
          </Link>
          <p className="cn-yt2009-spotlight-description">{channel.description || "Este canal todavía no tiene una descripción."}</p>
          {spotlight.custom_text && <div className="cn-yt2009-spotlight-custom">{spotlight.custom_text}</div>}
          <p className="cn-yt2009-spotlight-subs">{channel.subscriber_count ?? 0} suscriptores</p>
        </aside>
        <div className="cn-yt2009-spotlight-videos">
          <div className="cn-yt2009-spotlight-videos-heading">Most viewed videos</div>
          {spotlight.videos.length > 0 ? (
            <div className="cn-yt2009-spotlight-video-grid">
              {spotlight.videos.map((video) => <VideoCard key={video.id} video={video} />)}
            </div>
          ) : (
            <p className="cn-yt2009-spotlight-empty">Este canal todavía no tiene videos públicos.</p>
          )}
        </div>
      </div>
    </section>
  );
}
