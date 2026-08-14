import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { SignedImage, ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";

export type VideoWithChannel = {
  id: string;
  title: string;
  thumbnail_path: string | null;
  duration_seconds: number;
  views: number;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_path: string | null;
    is_verified: boolean;
  } | null;
};

export function VideoCard({ video, compact = false }: { video: VideoWithChannel; compact?: boolean }) {
  const channel = video.profiles;
  const name = channel?.display_name || channel?.username || "Canal";

  return (
    <div className={compact ? "flex gap-2" : "flex flex-col gap-3"}>
      <Link
        to="/watch/$videoId"
        params={{ videoId: video.id }}
        className={
          compact
            ? "relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-surface"
            : "relative aspect-video w-full overflow-hidden rounded-xl bg-surface"
        }
      >
        <SignedImage
          path={video.thumbnail_path}
          alt={video.title}
          className="h-full w-full object-cover"
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          }
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium text-white">
          {formatDuration(video.duration_seconds)}
        </span>
      </Link>

      <div className="flex gap-3">
        {!compact && (
          <Link to="/c/$username" params={{ username: channel?.username ?? "" }}>
            <ChannelAvatar path={channel?.avatar_path} name={name} size={36} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <Link
            to="/watch/$videoId"
            params={{ videoId: video.id }}
            className="line-clamp-2 text-sm font-medium leading-5"
          >
            {video.title}
          </Link>
          <Link
            to="/c/$username"
            params={{ username: channel?.username ?? "" }}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{name}</span>
            {channel?.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
          </Link>
          <p className="text-xs text-muted-foreground">
            {formatViews(video.views)} vistas · {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
