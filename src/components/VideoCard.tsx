import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SignedImage, ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import { useSignedUrl } from "@/lib/storage";

export type VideoWithChannel = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  category?: string;
  thumbnail_path: string | null;
  video_path?: string | null;
  duration_seconds: number;
  views: number;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_path: string | null;
    is_verified: boolean;
    subscriber_count?: number;
  } | null;
};

const NO_THUMBNAIL = "/no-thumbnail.svg";

export function VideoCard({ video, compact = false }: { video: VideoWithChannel; compact?: boolean }) {
  const channel = video.profiles;
  const name = channel?.display_name || channel?.username || "Canal";
  const rootRef = useRef<HTMLDivElement>(null);
  const [retro2012, setRetro2012] = useState(false);
  const [isFeaturedContext, setIsFeaturedContext] = useState(false);
  const videoUrl = useSignedUrl(video.video_path);
  const posterUrl = useSignedUrl(video.thumbnail_path);

  useEffect(() => {
    const update = () => {
      setRetro2012(document.documentElement.dataset.theme === "retro2012");
      setIsFeaturedContext(!!rootRef.current?.closest(".cn-2012-feature-main, .cn-2012-feature--channel-2, .cn-2012-feature--cosmic"));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const showFeaturedPlayer = compact && retro2012 && isFeaturedContext && !!videoUrl;

  return (
    <div ref={rootRef} className={compact ? "flex gap-2" : "flex flex-col gap-3"}>
      {showFeaturedPlayer ? (
        <div className="relative aspect-video w-full min-w-0 shrink-0 overflow-hidden rounded-lg bg-black">
          <video className="block h-full w-full object-contain" controls playsInline preload="metadata" poster={posterUrl ?? undefined} src={videoUrl} />
          <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(video.duration_seconds)}
          </span>
        </div>
      ) : (
        <Link
          to="/watch"
          search={{ v: video.code }}
          className={compact ? "relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-surface" : "relative aspect-video w-full overflow-hidden rounded-xl bg-surface"}
        >
          {video.thumbnail_path ? (
            <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover" fallback={<img src={NO_THUMBNAIL} alt="" aria-hidden="true" className="h-full w-full object-cover" />} />
          ) : (
            <img src={NO_THUMBNAIL} alt="Sin miniatura" className="h-full w-full object-cover" />
          )}
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium text-white">{formatDuration(video.duration_seconds)}</span>
        </Link>
      )}
      <div className="flex gap-3">
        {!compact && (
          <Link to="/c/$username" params={{ username: channel?.username ?? "" }}>
            <ChannelAvatar path={channel?.avatar_path} name={name} size={36} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <Link to="/watch" search={{ v: video.code }} className="line-clamp-2 text-sm font-medium leading-5">{video.title}</Link>
          <Link to="/c/$username" params={{ username: channel?.username ?? "" }} className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <span className="truncate">{name}</span>
            {channel?.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
          </Link>
          <p className="text-xs text-muted-foreground">{formatViews(video.views)} vistas · {timeAgo(video.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
